import { exportDashboardToExcel } from './export_dashboard.js';

let chartJsLoading = null;
let objectsData = [];
let parametersData = [];
let indicatorsData = [];

// Фиксированная цветовая палитра для графиков
const COLOR_PALETTE = [
    '#4a6da7', // синий
    '#6da74a', // зеленый
    '#a76d4a', // коричневый
    '#a74a6d', // розовый
    '#4aa7a7', // бирюзовый
    '#6d4aa7', // фиолетовый
    '#a7a74a', // оливковый
    '#4a6da7', // синий (повтор для большего количества элементов)
    '#6da74a', // зеленый (повтор)
];

function loadChartJS() {
    if (chartJsLoading) {
        return chartJsLoading;
    }
    
    chartJsLoading = new Promise((resolve, reject) => {
        if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
            Chart.register(ChartDataLabels);
        } else {
            console.error('Chart.js or ChartDataLabels plugin not loaded');
        }

        const scriptChart = document.createElement('script');
        scriptChart.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        
        const scriptLabels = document.createElement('script');
        scriptLabels.src = 'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0';
        
        let loaded = 0;
        const checkLoaded = () => {
            if (++loaded === 2) resolve();
        };
        
        scriptChart.onload = checkLoaded;
        scriptLabels.onload = checkLoaded;
        
        scriptChart.onerror = () => {
            console.error('Ошибка загрузки Chart.js');
            reject(new Error('Не удалось загрузить Chart.js'));
        };
        
        scriptLabels.onerror = () => {
            console.error('Ошибка загрузки chartjs-plugin-datalabels');
            reject(new Error('Не удалось загрузить chartjs-plugin-datalabels'));
        };
        
        document.head.appendChild(scriptChart);
        document.head.appendChild(scriptLabels);
    });
    
    return chartJsLoading;
}

document.addEventListener('DOMContentLoaded', function() {
    const savedFilters = localStorage.getItem('dashboardFilters');
    console.log('Saved filters:', savedFilters);
    
    if (savedFilters) {
        try {
            const filters = JSON.parse(savedFilters);
            console.log('Parsed filters:', filters);
            loadFilteredData(filters);
        } catch (e) {
            console.error('Error parsing filters:', e);
            showEmptyState();
        }
    } else {
        showEmptyState();
    }
});

function loadFilteredData(filters) {
    Promise.all([
        fetch('/data/data.json').then(res => res.json()),
        fetch('/data/objects.json').then(res => res.json()),
        fetch('/data/parameters.json').then(res => res.json()),
        fetch('/data/indicators.json').then(res => res.json()) 
    ])
    .then(([data, objects, parameters, indicators]) => {
        objectsData = objects;
        parametersData = parameters;
        indicatorsData = indicators; 
        const filteredData = applyFiltersToData(data, filters);
        if (shouldShowDashboard(filteredData, filters)) {
            createDashboardLayout(filteredData);
        } else {
            showEmptyState();
        }
    })
    .catch(error => console.error('Error loading data:', error));
}

function applyFiltersToData(data, filters) {
    const filteredData = {
        ...data,
        edges: [],
        oiv: []
    };

    if (filters.sourceOivIds && filters.sourceOivIds.length > 0) {
        filteredData.edges = data.edges.filter(edge => 
            filters.sourceOivIds.includes(edge.source));
        
        const allOIVs = new Set();
        filteredData.edges.forEach(edge => {
            allOIVs.add(edge.source);
            allOIVs.add(edge.target);
        });
        
        filteredData.oiv = data.oiv.filter(oiv => allOIVs.has(oiv.id));
    } 
    else if (filters.targetOivIds && filters.targetOivIds.length > 0) {
        filteredData.edges = data.edges.filter(edge => 
            filters.targetOivIds.includes(edge.target));
        
        const allOIVs = new Set();
        filteredData.edges.forEach(edge => {
            allOIVs.add(edge.source);
            allOIVs.add(edge.target);
        });
        
        filteredData.oiv = data.oiv.filter(oiv => allOIVs.has(oiv.id));
    }
    else if (filters.themes && filters.themes.length > 0) {
        filteredData.edges = data.edges.filter(edge => filters.themes.includes(edge.theme));
        
        const themeOIVs = new Set();
        filteredData.edges.forEach(edge => {
            themeOIVs.add(edge.source);
            themeOIVs.add(edge.target);
        });
        
        filteredData.oiv = data.oiv.filter(oiv => themeOIVs.has(oiv.id));
    }
    else if (filters.complexes && filters.complexes.length > 0) {
        filteredData.oiv = data.oiv.filter(oiv => filters.complexes.includes(oiv.complex));
        
        const oivIds = filteredData.oiv.map(oiv => oiv.id);
        filteredData.edges = data.edges.filter(edge => 
            oivIds.includes(edge.source) || oivIds.includes(edge.target));
    }
    else if (filters.strategies && filters.strategies.length > 0) {
        filteredData.oiv = data.oiv.filter(oiv => 
            oiv.strategies && oiv.strategies.some(s => filters.strategies.includes(s)));
        
        const oivIds = filteredData.oiv.map(oiv => oiv.id);
        filteredData.edges = data.edges.filter(edge => 
            oivIds.includes(edge.source) || oivIds.includes(edge.target));
    }
    else if (filters.programs && filters.programs.length > 0) {
        filteredData.oiv = data.oiv.filter(oiv => 
            oiv.programs && oiv.programs.some(p => filters.programs.includes(p)));
        
        const oivIds = filteredData.oiv.map(oiv => oiv.id);
        filteredData.edges = data.edges.filter(edge => 
            oivIds.includes(edge.source) || oivIds.includes(edge.target));
    }
    else if (filters.edges && filters.edges.length > 0) {
        filteredData.edges = data.edges.filter(edge => filters.edges.includes(edge.id));
        
        const edgeOIVs = new Set();
        filteredData.edges.forEach(edge => {
            edgeOIVs.add(edge.source);
            edgeOIVs.add(edge.target);
        });
        
        filteredData.oiv = data.oiv.filter(oiv => edgeOIVs.has(oiv.id));
    } else {
        return {
            ...data,
            edges: [],
            oiv: []
        };
    }

    return filteredData;
}

function shouldShowDashboard(data, filters) {
    return (
        (filters.oivIds && filters.oivIds.length > 0) ||
        (filters.themes && filters.themes.length > 0) ||
        (filters.complexes && filters.complexes.length > 0) ||
        (filters.strategies && filters.strategies.length > 0) ||
        (filters.programs && filters.programs.length > 0) ||
        (filters.edges && filters.edges.length > 0)
    ) && data.oiv.length > 0;
}

function showEmptyState() {
    const container = document.querySelector('.dashboard-container');
    if (!container) {
        console.error('Dashboard container not found');
        return;
    }
    
    container.innerHTML = `
        <div class="empty-state">
            <h3>Выберите фильтр на 3D-схеме</h3>
            <p>Для отображения данных выберите органы власти, темы, комплексы или другие фильтры в 3D-визуализации</p>
        </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #666;
            font-family: Arial, sans-serif;
        }
        .empty-state h3 {
            color: #4a6da7;
            margin-bottom: 15px;
        }
        .empty-state p {
            font-size: 16px;
            line-height: 1.5;
        }
    `;
    document.head.appendChild(style);
}

async function createDashboardLayout(data) {
    const container = document.querySelector('.dashboard-container');
    if (!container) {
        console.error('Контейнер дашборда не найден');
        return;
    }
    
    try {
        await loadChartJS(); 

        if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
            Chart.register(ChartDataLabels);
        }		
        container.innerHTML = '';
        
        if (data.edges.length === 0 || data.oiv.length === 0) {
            showEmptyState();
            return;
        }
        
        container.innerHTML = `
            <div class="dashboard-layout">
                <div class="dashboard-header">
                    <button class="export-btn">Экспорт в Excel</button>
                </div>
                <div class="dashboard-content">
                    <div class="dashboard-left">
                        <div class="filters-container"></div>
                        <div class="summary-table-container"></div>
                    </div>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            .dashboard-layout {
                display: flex;
                flex-direction: column;
                width: 100%;
                gap: 20px;
            }
            .dashboard-header {
                display: flex;
                gap: 15px;
                margin-bottom: 20px;
            }    
            .dashboard-content {
                display: flex;
                width: 100%;
                gap: 20px;
            }            
            .dashboard-left {
                flex: 1;
                min-width: 100%;
                transition: all 0.3s ease;
            }
            .filters-container {
                display: flex;
                flex-direction: row;
                gap: 15px;
                padding: 15px;
                background-color: transparent;
                border-radius: 8px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            .filter-group {
                flex: 1;
                min-width: 280px;
                background-color: rgba(255, 255, 255, 0.8);
                padding: 15px;
                border-radius: 6px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .filter-group h4 {
                margin: 0 0 10px 0;
                color: #4a6da7;
            }
            .filter-checkbox {
                margin-bottom: 6px;
            }
            .filter-checkbox label {
                display: flex;
                align-items: center;
                cursor: pointer;
                font-size: 14px;
                color: #333;
            }
            .filter-checkbox input {
                margin-right: 8px;
            }
            .filter-group ::-webkit-scrollbar {
                width: 6px;
            }
            .filter-group ::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 3px;
            }
            .filter-group ::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 3px;
            }
            .filter-group ::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }
            .export-btn {
                padding: 12px 24px;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-family: 'Arial', sans-serif;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.3s ease;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background-color: #4a6da7;
            }
            .export-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }    
            .export-btn:active {
                transform: translateY(0);
                box-shadow: 0 2px 3px rgba(0,0,0,0.1);
            }            
            .export-btn::before {
                content: "";
                display: inline-block;
                width: 16px;
                height: 16px;
                margin-right: 8px;
                vertical-align: middle;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='white' viewBox='0 0 16 16'%3E%3Cpath d='M8.5 6.5a.5.5 0 0 0-1 0v3.793L6.354 9.146a.5.5 0 1 0-.708.708l2 2a.5.5 0 0 0 .708 0l2-2a.5.5 0 0 0-.708-.708L8.5 10.293V6.5z'/%3E%3Cpath d='M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: center;
            }
            .summary-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-family: Arial, sans-serif;
            }
            .summary-table th, .summary-table td {
                border: 1px solid #ddd;
                padding: 12px;
                text-align: left;
            }
            .summary-table th {
                background-color: #4a6da7;
                color: white;
                font-weight: bold;
            }
            .summary-table tr:nth-child(even) {
                background-color: #f2f2f2;
            }
            .summary-table tr:hover {
                background-color: #ddd;
            }
            .toggle-icon {
                cursor: pointer;
                margin-right: 8px;
                font-weight: bold;
                color: #4a6da7;
                display: inline-block;
                width: 20px;
                text-align: center;
            }
            .detail-table {
                width: 100%;
                border-collapse: collapse;
                margin: 10px 0;
                background-color: #f9f9f9;
            }
            .detail-table th, .detail-table td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            .detail-table th {
                background-color: #e8e8e8;
                font-weight: bold;
            }
            .checkmark {
                color: #4CAF50;
                font-weight: bold;
                font-size: 18px;
                text-align: center;
                display: block;
            }
            .summary-table-container {
                width: 100%;
                margin-bottom: 20px;
                background-color: #f9f9f9;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 20px;
            }
        `;
        document.head.appendChild(style);
        
        try {
            const filtersContainer = container.querySelector('.filters-container');
            const summaryTableContainer = container.querySelector('.summary-table-container');
            
            // Создаем фильтры
            createFilters(data, filtersContainer);
            
            // Создаем сводную таблицу
            createSummaryTable(data, summaryTableContainer);
            
            // Добавляем кнопку экспорта
            addExportButton(data);
            
        } catch (error) {
            console.error('Ошибка при создании дашборда:', error);
            container.innerHTML = '<p>Произошла ошибка при загрузке компонентов дашборда</p>';
        }
    } catch (error) {
        console.error('Ошибка при создании дашборда:', error);
        container.innerHTML = `
            <div class="error-state">
                <h3>Ошибка при загрузке компонентов</h3>
                <p>Пожалуйста, обновите страницу или попробуйте позже.</p>
                <p>Детали: ${error.message}</p>
            </div>
        `;
    }
}

function createFilters(data, container) {
    // Получаем уникальные темы и OIV
    const themes = [...new Set(data.edges.map(edge => edge.theme))];
    const sourceOIVs = [...new Set(data.edges.map(edge => edge.source))];
    const sourceOIVNames = sourceOIVs.map(id => ({
        id,
        name: data.oiv.find(oiv => oiv.id === id)?.name || id
    }));

    // Очищаем контейнер
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.gap = '20px';
    container.style.flexWrap = 'wrap';
    container.style.marginBottom = '20px';

    // Функция для создания выпадающего списка фильтров
    function createDropdownFilter(title, items, className, allChecked = true) {
        const dropdownId = `dropdown-${className}`;
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'dropdown-filter';
        dropdownContainer.style.position = 'relative';
        dropdownContainer.style.marginBottom = '0';
        dropdownContainer.style.minWidth = '280px';

        // Кнопка для открытия/закрытия dropdown
        const dropdownBtn = document.createElement('button');
        dropdownBtn.className = 'dropdown-btn';
        dropdownBtn.textContent = title;
        dropdownBtn.style.width = '100%';
        dropdownBtn.style.padding = '10px 15px';
        dropdownBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        dropdownBtn.style.border = '1px solid #ddd';
        dropdownBtn.style.borderRadius = '4px';
        dropdownBtn.style.textAlign = 'left';
        dropdownBtn.style.cursor = 'pointer';
        dropdownBtn.style.display = 'flex';
        dropdownBtn.style.justifyContent = 'space-between';
        dropdownBtn.style.alignItems = 'center';

        const arrowIcon = document.createElement('span');
        arrowIcon.textContent = '▼';
        arrowIcon.style.fontSize = '12px';
        dropdownBtn.appendChild(arrowIcon);

        // Контейнер для чекбоксов
        const dropdownContent = document.createElement('div');
        dropdownContent.id = dropdownId;
        dropdownContent.className = 'dropdown-content';
        dropdownContent.style.display = 'none';
        dropdownContent.style.position = 'absolute';
        dropdownContent.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        dropdownContent.style.border = '1px solid #ddd';
        dropdownContent.style.borderRadius = '4px';
        dropdownContent.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        dropdownContent.style.zIndex = '1000';
        dropdownContent.style.width = '100%';
        dropdownContent.style.maxHeight = '300px';
        dropdownContent.style.overflowY = 'auto';
        dropdownContent.style.padding = '10px';

        // Для фильтра ОИВ добавляем чекбокс "Объединить все ОИВ"
        if (className === 'oiv') {
            const combineOIVDiv = document.createElement('div');
            combineOIVDiv.className = 'filter-checkbox';
            combineOIVDiv.style.marginBottom = '10px';
            combineOIVDiv.style.paddingBottom = '10px';
            combineOIVDiv.style.borderBottom = '1px solid #eee';

            const combineOIVLabel = document.createElement('label');
            combineOIVLabel.style.display = 'flex';
            combineOIVLabel.style.alignItems = 'center';
            combineOIVLabel.style.cursor = 'pointer';

            const combineOIVCheckbox = document.createElement('input');
            combineOIVCheckbox.type = 'checkbox';
            combineOIVCheckbox.className = 'combine-oiv-checkbox';
            combineOIVCheckbox.checked = true;
            combineOIVCheckbox.style.marginRight = '8px';

            combineOIVLabel.appendChild(combineOIVCheckbox);
            combineOIVLabel.appendChild(document.createTextNode('Все органы власти'));
            combineOIVDiv.appendChild(combineOIVLabel);
            dropdownContent.appendChild(combineOIVDiv);
        }

        // Чекбокс "Выбрать все"
        const selectAllDiv = document.createElement('div');
        selectAllDiv.className = 'filter-checkbox';
        selectAllDiv.style.marginBottom = '10px';
        selectAllDiv.style.paddingBottom = '10px';
        selectAllDiv.style.borderBottom = '1px solid #eee';

        const selectAllLabel = document.createElement('label');
        selectAllLabel.style.display = 'flex';
        selectAllLabel.style.alignItems = 'center';
        selectAllLabel.style.cursor = 'pointer';

        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.className = `all-${className}-checkbox`;
        selectAllCheckbox.checked = false;
        selectAllCheckbox.style.marginRight = '8px';

        selectAllLabel.appendChild(selectAllCheckbox);
        selectAllLabel.appendChild(document.createTextNode('Выбрать все'));
        selectAllDiv.appendChild(selectAllLabel);
        dropdownContent.appendChild(selectAllDiv);

        // Добавляем чекбоксы для каждого элемента
        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'filter-checkbox';
            itemDiv.style.margin = '5px 0';

            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.cursor = 'pointer';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = `${className}-checkbox`;
            checkbox.value = item.id || item.name || item;
            checkbox.checked = false;
            checkbox.style.marginRight = '8px';

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(item.name || item));
            itemDiv.appendChild(label);
            dropdownContent.appendChild(itemDiv);
        });

        // Обработчик клика по кнопке
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isShowing = dropdownContent.style.display === 'block';
            dropdownContent.style.display = isShowing ? 'none' : 'block';
            arrowIcon.textContent = isShowing ? '▼' : '▲';
        });

        // Закрываем dropdown при клике вне его
        document.addEventListener('click', (e) => {
            if (!dropdownContainer.contains(e.target)) {
                dropdownContent.style.display = 'none';
                arrowIcon.textContent = '▼';
            }
        });

        dropdownContainer.appendChild(dropdownBtn);
        dropdownContainer.appendChild(dropdownContent);
        return dropdownContainer;
    }

    // Создаем выпадающие списки фильтров
    const oivFilterDropdown = createDropdownFilter('Органы власти', sourceOIVNames, 'oiv');
    const themeFilterDropdown = createDropdownFilter('Темы', themes, 'theme');

    container.appendChild(oivFilterDropdown);
    container.appendChild(themeFilterDropdown);

    // Функция для обновления таблицы
    function updateSummaryTableHandler() {
        const selectedOIVs = [...oivFilterDropdown.querySelectorAll('.oiv-checkbox:checked')].map(cb => cb.value);
        const selectedThemes = [...themeFilterDropdown.querySelectorAll('.theme-checkbox:checked')].map(cb => cb.value);
        
        // Обновляем сводную таблицу
        const summaryTableContainer = document.querySelector('.summary-table-container');
        if (summaryTableContainer) {
            summaryTableContainer.innerHTML = '';
            createSummaryTable(data, summaryTableContainer, selectedOIVs, selectedThemes);
        }
    }

    // Обработчики событий для чекбоксов "Выбрать все"
    oivFilterDropdown.querySelector(`.all-oiv-checkbox`).addEventListener('change', function() {
        const isChecked = this.checked;
        oivFilterDropdown.querySelectorAll('.oiv-checkbox').forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        updateSummaryTableHandler();
    });
    
    themeFilterDropdown.querySelector(`.all-theme-checkbox`).addEventListener('change', function() {
        const isChecked = this.checked;
        themeFilterDropdown.querySelectorAll('.theme-checkbox').forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        updateSummaryTableHandler();
    });
    
    // Обработчики событий для отдельных чекбоксов
    oivFilterDropdown.querySelectorAll('.oiv-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const allChecked = [...oivFilterDropdown.querySelectorAll('.oiv-checkbox')].every(cb => cb.checked);
            oivFilterDropdown.querySelector('.all-oiv-checkbox').checked = allChecked;
            updateSummaryTableHandler();
        });
    });
    
    themeFilterDropdown.querySelectorAll('.theme-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const allChecked = [...themeFilterDropdown.querySelectorAll('.theme-checkbox')].every(cb => cb.checked);
            themeFilterDropdown.querySelector('.all-theme-checkbox').checked = allChecked;
            updateSummaryTableHandler();
        });
    });
    
    // Обработчик для чекбокса "Объединить все ОИВ"
    const combineOIVCheckbox = oivFilterDropdown.querySelector('.combine-oiv-checkbox');
    if (combineOIVCheckbox) {
        combineOIVCheckbox.addEventListener('change', function() {
            // При включении "Объединить все ОИВ" снимаем выбор с отдельных ОИВ
            if (this.checked) {
                oivFilterDropdown.querySelectorAll('.oiv-checkbox').forEach(checkbox => {
                    checkbox.checked = false;
                });
                oivFilterDropdown.querySelector('.all-oiv-checkbox').checked = false;
            }
            updateSummaryTableHandler();
        });
    }
    
    // Инициализируем таблицу с текущими фильтрами
    updateSummaryTableHandler();
}

function createSummaryTable(data, container, selectedOIVs = [], selectedThemes = []) {
    if (!objectsData || !parametersData || !indicatorsData) {
        container.innerHTML = '<p>Нет данных для отображения</p>';
        return;
    }

    // Получаем уникальные темы
    const allThemes = [...new Set(data.edges.map(edge => edge.theme))];
    const themes = selectedThemes.length > 0 ? selectedThemes : allThemes;

    if (themes.length === 0) {
        container.innerHTML = '<p>Нет данных для отображения</p>';
        return;
    }

    // Создаем таблицу
    const table = document.createElement('table');
    table.className = 'summary-table';

    // Создаем заголовок таблицы
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Добавляем столбцы (убрали столбец "Детали")
    const themeHeader = document.createElement('th');
    themeHeader.textContent = 'Тема';
    themeHeader.style.width = '30%';
    headerRow.appendChild(themeHeader);
    
    const objectsHeader = document.createElement('th');
    objectsHeader.textContent = 'Объекты управления';
    objectsHeader.style.width = '17.5%';
    headerRow.appendChild(objectsHeader);
    
    const parametersHeader = document.createElement('th');
    parametersHeader.textContent = 'Параметры';
    parametersHeader.style.width = '17.5%';
    headerRow.appendChild(parametersHeader);
    
    const indicatorsHeader = document.createElement('th');
    indicatorsHeader.textContent = 'Показатели';
    indicatorsHeader.style.width = '17.5%';
    headerRow.appendChild(indicatorsHeader);
    
    const connectionsHeader = document.createElement('th');
    connectionsHeader.textContent = 'Связи';
    connectionsHeader.style.width = '17.5%';
    headerRow.appendChild(connectionsHeader);
    
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Создаем тело таблицы
    const tbody = document.createElement('tbody');

    themes.forEach(theme => {
        const row = document.createElement('tr');
        
        // Ячейка с темой (добавляем кнопку раскрытия перед названием темы)
        const themeCell = document.createElement('td');
        
        const toggleButton = document.createElement('span');
        toggleButton.className = 'toggle-icon';
        toggleButton.textContent = '+';
        toggleButton.setAttribute('data-theme', theme);
        toggleButton.setAttribute('data-expanded', 'false');
        
        toggleButton.addEventListener('click', function() {
            const isExpanded = this.getAttribute('data-expanded') === 'true';
            const theme = this.getAttribute('data-theme');
            
            if (isExpanded) {
                // Скрываем детальную таблицу
                const detailRow = this.closest('tr').nextElementSibling;
                if (detailRow && detailRow.classList.contains('detail-row')) {
                    detailRow.remove();
                }
                this.textContent = '+';
                this.setAttribute('data-expanded', 'false');
            } else {
                // Показываем детальную таблицу
                this.textContent = '-';
                this.setAttribute('data-expanded', 'true');
                
                // Создаем строку с детальной таблицей
                const detailRow = document.createElement('tr');
                detailRow.className = 'detail-row';
                
                const detailCell = document.createElement('td');
                detailCell.colSpan = 5; // Изменили на 5 столбцов вместо 6
                
                // Создаем детальную таблицу - ИСПРАВЛЕНО: передаем все необходимые параметры
                const detailTable = createDetailTable(data, theme, selectedOIVs);
                detailCell.appendChild(detailTable);
                
                detailRow.appendChild(detailCell);
                
                // Вставляем после текущей строки
                this.closest('tr').after(detailRow);
            }
        });
        
        themeCell.appendChild(toggleButton);
        themeCell.appendChild(document.createTextNode(` ${theme}`));
        row.appendChild(themeCell);
        
        // Ячейка с объектами управления
        const objectsCell = document.createElement('td');
        const objectsCount = countObjectsByTheme(theme, selectedOIVs);
        objectsCell.textContent = objectsCount;
        objectsCell.style.textAlign = 'center';
        row.appendChild(objectsCell);
        
        // Ячейка с параметрами
        const parametersCell = document.createElement('td');
        const parametersCount = countParametersByTheme(theme, selectedOIVs);
        parametersCell.textContent = parametersCount;
        parametersCell.style.textAlign = 'center';
        row.appendChild(parametersCell);
        
        // Ячейка с показателями
        const indicatorsCell = document.createElement('td');
        const indicatorsCount = countIndicatorsByTheme(theme, selectedOIVs);
        indicatorsCell.textContent = indicatorsCount;
        indicatorsCell.style.textAlign = 'center';
        row.appendChild(indicatorsCell);
        
        // Ячейка со связями
        const connectionsCell = document.createElement('td');
        const connectionsCount = countConnectionsByTheme(data, theme, selectedOIVs);
        connectionsCell.textContent = connectionsCount;
        connectionsCell.style.textAlign = 'center';
        row.appendChild(connectionsCell);
        
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}

function countObjectsByTheme(theme, selectedOIVs = []) {
    let filteredObjects = objectsData.filter(obj => obj.theme === theme);
    
    if (selectedOIVs.length > 0) {
        filteredObjects = filteredObjects.filter(obj => selectedOIVs.includes(obj.oiv_id));
    }
    
    return filteredObjects.length;
}

function countParametersByTheme(theme, selectedOIVs = []) {
    let filteredParameters = parametersData.filter(param => param.theme === theme);
    
    if (selectedOIVs.length > 0) {
        // Фильтруем объекты по выбранным OIV, затем параметры по этим объектам
        const filteredObjectIds = objectsData
            .filter(obj => selectedOIVs.includes(obj.oiv_id))
            .map(obj => obj.object_id);
        
        filteredParameters = filteredParameters.filter(param => 
            filteredObjectIds.includes(param.object_id)
        );
    }
    
    return filteredParameters.length;
}

function countIndicatorsByTheme(theme, selectedOIVs = []) {
    let filteredIndicators = indicatorsData.filter(ind => ind.theme === theme);
    
    if (selectedOIVs.length > 0) {
        filteredIndicators = filteredIndicators.filter(ind => selectedOIVs.includes(ind.oiv_id));
    }
    
    return filteredIndicators.length;
}

function countConnectionsByTheme(data, theme, selectedOIVs = []) {
    let filteredEdges = data.edges.filter(edge => edge.theme === theme);
    
    if (selectedOIVs.length > 0) {
        filteredEdges = filteredEdges.filter(edge => selectedOIVs.includes(edge.source));
    }
    
    return filteredEdges.length;
}

function createDetailTable(data, theme, selectedOIVs = []) {
    const table = document.createElement('table');
    table.className = 'detail-table';
    
    // Заголовок детальной таблицы
    const caption = document.createElement('caption');
    caption.textContent = `Детали по теме: ${theme}`;
    caption.style.captionSide = 'top';
    caption.style.fontWeight = 'bold';
    caption.style.marginBottom = '10px';
    caption.style.color = '#4a6da7';
    table.appendChild(caption);
    
    // Заголовки столбцов
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['Тип данных', 'Всего', 'Данные ОИВ', 'Данные ИИ', 'ОИВ и ИИ'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        th.style.textAlign = 'center';
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Тело таблицы
    const tbody = document.createElement('tbody');
    
    // Строка для объектов управления
    const objectsRow = createDetailRow('Объекты управления', theme, 'objects', selectedOIVs);
    tbody.appendChild(objectsRow);
    
    // Строка для параметров
    const parametersRow = createDetailRow('Параметры', theme, 'parameters', selectedOIVs);
    tbody.appendChild(parametersRow);
    
    // Строка для показателей
    const indicatorsRow = createDetailRow('Показатели', theme, 'indicators', selectedOIVs);
    tbody.appendChild(indicatorsRow);
    
    // Строка для связей
    const connectionsRow = createDetailRow('Связи', theme, 'connections', selectedOIVs);
    tbody.appendChild(connectionsRow);
    
    table.appendChild(tbody);
    return table;
}

function createDetailRow(label, theme, dataType, selectedOIVs = []) {
    const row = document.createElement('tr');
    
    // Ячейка с меткой
    const labelCell = document.createElement('td');
    labelCell.textContent = label;
    labelCell.style.fontWeight = 'bold';
    row.appendChild(labelCell);
    
    // Ячейка с общим количеством
    const totalCell = document.createElement('td');
    totalCell.style.textAlign = 'center';
    row.appendChild(totalCell);
    
    // Ячейка с данными ОИВ
    const oivCell = document.createElement('td');
    oivCell.style.textAlign = 'center';
    row.appendChild(oivCell);
    
    // Ячейка с данными ИИ
    const aiCell = document.createElement('td');
    aiCell.style.textAlign = 'center';
    row.appendChild(aiCell);
    
    // Ячейка с данными ОИВ и ИИ
    const bothCell = document.createElement('td');
    bothCell.style.textAlign = 'center';
    row.appendChild(bothCell);
    
    // Заполняем данные в зависимости от типа
    switch (dataType) {
        case 'objects':
            fillObjectsData(totalCell, oivCell, aiCell, bothCell, theme, selectedOIVs);
            break;
        case 'parameters':
            fillParametersData(totalCell, oivCell, aiCell, bothCell, theme, selectedOIVs);
            break;
        case 'indicators':
            fillIndicatorsData(totalCell, oivCell, aiCell, bothCell, theme, selectedOIVs);
            break;
        case 'connections':
            fillConnectionsData(totalCell, oivCell, aiCell, bothCell, data, theme, selectedOIVs);
            break;
    }
    
    return row;
}

function fillObjectsData(totalCell, oivCell, aiCell, bothCell, theme, selectedOIVs) {
    let objects = objectsData.filter(obj => obj.theme === theme);
    
    if (selectedOIVs.length > 0) {
        objects = objects.filter(obj => selectedOIVs.includes(obj.oiv_id));
    }
    
    totalCell.textContent = objects.length;
    
    const oivObjects = objects.filter(obj => obj.data_source === 'oiv');
    const aiObjects = objects.filter(obj => obj.data_source === 'ai');
    const bothObjects = objects.filter(obj => obj.data_source === 'both');
    
    oivCell.textContent = oivObjects.length;
    aiCell.textContent = aiObjects.length;
    bothCell.textContent = bothObjects.length;
}

function fillParametersData(totalCell, oivCell, aiCell, bothCell, theme, selectedOIVs) {
    let parameters = parametersData.filter(param => param.theme === theme);
    
    if (selectedOIVs.length > 0) {
        // Фильтруем объекты по выбранным OIV, затем параметры по этим объектам
        const filteredObjectIds = objectsData
            .filter(obj => selectedOIVs.includes(obj.oiv_id))
            .map(obj => obj.object_id);
        
        parameters = parameters.filter(param => 
            filteredObjectIds.includes(param.object_id)
        );
    }
    
    totalCell.textContent = parameters.length;
    
    const oivParameters = parameters.filter(param => param.data_source === 'oiv');
    const aiParameters = parameters.filter(param => param.data_source === 'ai');
    const bothParameters = parameters.filter(param => param.data_source === 'both');
    
    oivCell.textContent = oivParameters.length;
    aiCell.textContent = aiParameters.length;
    bothCell.textContent = bothParameters.length;
}

function fillIndicatorsData(totalCell, oivCell, aiCell, bothCell, theme, selectedOIVs) {
    let indicators = indicatorsData.filter(ind => ind.theme === theme);
    
    if (selectedOIVs.length > 0) {
        indicators = indicators.filter(ind => selectedOIVs.includes(ind.oiv_id));
    }
    
    totalCell.textContent = indicators.length;
    
    const oivIndicators = indicators.filter(ind => ind.data_source === 'oiv');
    const aiIndicators = indicators.filter(ind => ind.data_source === 'ai');
    const bothIndicators = indicators.filter(ind => ind.data_source === 'both');
    
    oivCell.textContent = oivIndicators.length;
    aiCell.textContent = aiIndicators.length;
    bothCell.textContent = bothIndicators.length;
}

function fillConnectionsData(totalCell, oivCell, aiCell, bothCell, data, theme, selectedOIVs) {
    let connections = data.edges.filter(edge => edge.theme === theme);
    
    if (selectedOIVs.length > 0) {
        connections = connections.filter(edge => selectedOIVs.includes(edge.source));
    }
    
    totalCell.textContent = connections.length;
    
    const oivConnections = connections.filter(conn => conn.data_source === 'oiv');
    const aiConnections = connections.filter(conn => conn.data_source === 'ai');
    const bothConnections = connections.filter(conn => conn.data_source === 'both');
    
    oivCell.textContent = oivConnections.length;
    aiCell.textContent = aiConnections.length;
    bothCell.textContent = bothConnections.length;
}

function addExportButton(data) {
    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportDashboardToExcel(data);
        });
    }
}