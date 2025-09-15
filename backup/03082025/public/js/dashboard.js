import { exportDashboardToExcel } from './export_dashboard.js';

document.addEventListener('DOMContentLoaded', function() {
    // Проверяем сохраненные фильтры из localStorage
    const savedFilters = localStorage.getItem('dashboardFilters');
    if (savedFilters) {
        const filters = JSON.parse(savedFilters);
        loadFilteredData(filters);
    } else {
        showEmptyState();
    }
});

function loadFilteredData(filters) {
    // Загружаем данные и применяем фильтры
    fetch('/data/data.json')
        .then(res => res.json())
        .then(data => {
            // Фильтруем данные в соответствии с выбранными фильтрами
            const filteredData = applyFiltersToData(data, filters);
            if (shouldShowDashboard(filteredData, filters)) {
                createSimpleTable(filteredData);
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

    // Фильтрация по source OIV
    if (filters.sourceOivIds && filters.sourceOivIds.length > 0) {
        filteredData.edges = data.edges.filter(edge => 
            filters.sourceOivIds.includes(edge.source));
        
        // Получаем все уникальные OIV (источники и цели)
        const allOIVs = new Set();
        filteredData.edges.forEach(edge => {
            allOIVs.add(edge.source);
            allOIVs.add(edge.target);
        });
        
        filteredData.oiv = data.oiv.filter(oiv => allOIVs.has(oiv.id));
    } 
    // Фильтрация по target OIV
    else if (filters.targetOivIds && filters.targetOivIds.length > 0) {
        filteredData.edges = data.edges.filter(edge => 
            filters.targetOivIds.includes(edge.target));
        
        // Получаем все уникальные OIV (источники и цели)
        const allOIVs = new Set();
        filteredData.edges.forEach(edge => {
            allOIVs.add(edge.source);
            allOIVs.add(edge.target);
        });
        
        filteredData.oiv = data.oiv.filter(oiv => allOIVs.has(oiv.id));
    }
    // Фильтрация по темам
    else if (filters.themes && filters.themes.length > 0) {
        filteredData.edges = data.edges.filter(edge => filters.themes.includes(edge.theme));
        
        // Получаем OIV, участвующие в выбранных темах
        const themeOIVs = new Set();
        filteredData.edges.forEach(edge => {
            themeOIVs.add(edge.source);
            themeOIVs.add(edge.target);
        });
        
        filteredData.oiv = data.oiv.filter(oiv => themeOIVs.has(oiv.id));
    }
    // Фильтрация по комплексам
    else if (filters.complexes && filters.complexes.length > 0) {
        filteredData.oiv = data.oiv.filter(oiv => filters.complexes.includes(oiv.complex));
        
        // Фильтрация связей для выбранных комплексов
        const oivIds = filteredData.oiv.map(oiv => oiv.id);
        filteredData.edges = data.edges.filter(edge => 
            oivIds.includes(edge.source) || oivIds.includes(edge.target));
    }
    // Фильтрация по стратегиям
    else if (filters.strategies && filters.strategies.length > 0) {
        filteredData.oiv = data.oiv.filter(oiv => 
            oiv.strategies && oiv.strategies.some(s => filters.strategies.includes(s)));
        
        // Фильтрация связей для выбранных стратегий
        const oivIds = filteredData.oiv.map(oiv => oiv.id);
        filteredData.edges = data.edges.filter(edge => 
            oivIds.includes(edge.source) || oivIds.includes(edge.target));
    }
    // Фильтрация по программам
    else if (filters.programs && filters.programs.length > 0) {
        filteredData.oiv = data.oiv.filter(oiv => 
            oiv.programs && oiv.programs.some(p => filters.programs.includes(p)));
        
        // Фильтрация связей для выбранных программ
        const oivIds = filteredData.oiv.map(oiv => oiv.id);
        filteredData.edges = data.edges.filter(edge => 
            oivIds.includes(edge.source) || oivIds.includes(edge.target));
    }
    // Фильтрация по связям
    else if (filters.edges && filters.edges.length > 0) {
        filteredData.edges = data.edges.filter(edge => filters.edges.includes(edge.id));
        
        // Получаем OIV, участвующие в выбранных связях
        const edgeOIVs = new Set();
        filteredData.edges.forEach(edge => {
            edgeOIVs.add(edge.source);
            edgeOIVs.add(edge.target);
        });
        
        filteredData.oiv = data.oiv.filter(oiv => edgeOIVs.has(oiv.id));
    } else {
        // Если нет подходящих фильтров, возвращаем пустые данные
        return {
            ...data,
            edges: [],
            oiv: []
        };
    }

    return filteredData;
}

function shouldShowDashboard(data, filters) {
    // Проверяем, есть ли данные для отображения
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
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <h3>Выберите фильтр на 3D-схеме</h3>
            <p>Для отображения данных выберите органы власти, темы, комплексы или другие фильтры в 3D-визуализации</p>
        </div>
    `;
    
    // Добавляем стили для пустого состояния
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

function addExportButton(data) {
    const container = document.querySelector('.dashboard-container');
    if (!container) return;
    
    // Проверяем, есть ли уже кнопка экспорта
    const existingBtn = container.querySelector('.export-btn');
    if (existingBtn) return;
    
    // Создаем кнопку экспорта
    const exportBtn = document.createElement('button');
    exportBtn.className = 'export-btn';
    exportBtn.textContent = 'Экспорт в Excel';
    
    // Добавляем стили для кнопки
    exportBtn.style.cssText = `
        padding: 10px 20px;
        background-color: #4a6da7;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: Arial, sans-serif;
        font-size: 14px;
        margin: 20px 0;
        display: block;
    `;
    
    // Добавляем обработчик клика
    exportBtn.addEventListener('click', () => {
        try {
            exportDashboardToExcel(data);
        } catch (error) {
            console.error('Ошибка при экспорте в Excel:', error);
            alert('Произошла ошибка при экспорте. Проверьте консоль для подробностей.');
        }
    });
    
    // Вставляем кнопку в начало контейнера
    container.insertBefore(exportBtn, container.firstChild);
}

function createSimpleTable(data) {
    const container = document.querySelector('.dashboard-container');
    if (!container) return;
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Проверяем, есть ли данные для отображения
    if (data.edges.length === 0 || data.oiv.length === 0) {
        showEmptyState();
        return;
    }
    
	addExportButton(data);
		
    // Создаем контейнер для таблиц
    const tablesContainer = document.createElement('div');
    tablesContainer.className = 'tables-container';
    
    // Создаем таблицу для source OIV
    createSourceTable(data, tablesContainer);
    
    container.appendChild(tablesContainer);
    
    // Добавляем стили
    const style = document.createElement('style');
	style.textContent = `
		.tables-container {
			display: flex;
			flex-direction: column;
			gap: 20px;
		}
		.table-separator {
			text-align: center;
			font-weight: bold;
			margin: 10px 0;
			color: #4a6da7;
		}
		.dashboard-table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 20px;
			font-family: Arial, sans-serif;
		}
		.dashboard-table th, .dashboard-table td {
			border: 1px solid #ddd;
			padding: 8px;
			text-align: center;
		}
		.dashboard-table th {
			background-color: #4a6da7;
			color: white;
			font-weight: bold;
		}
		.dashboard-table tr:nth-child(even) {
			background-color: #f2f2f2;
		}
		.dashboard-table tr:hover {
			background-color: #ddd;
		}
		.dashboard-table th:first-child {
			width: 200px;
			text-align: center;
		}
		.toggle-icon {
			cursor: pointer;
			margin-right: 5px;
			font-weight: bold;
			color: #4a6da7;
		}
		.theme-cell {
			cursor: pointer;
			display: flex;
			align-items: center;
		}
		.target-table-container {
			display: none;
			width: 100%;
			margin: 10px 0;
			padding: 10px;
			background-color: #f9f9f9;
			border: 1px solid #ddd;
			border-radius: 4px;
		}
		.target-table-container.visible {
			display: block;
		}
		.target-table-container .dashboard-table {
			color: #333;
		}
	`;
    document.head.appendChild(style);
}

function createSourceTable(data, container) {
    const table = document.createElement('table');
    table.className = 'dashboard-table';
    
    // Получаем уникальные темы
    const themes = [...new Set(data.edges.map(edge => edge.theme))];
    
    // Собираем все уникальные source OIV
    const uniqueSourceOIVIds = new Set(data.edges.map(edge => edge.source));
    const sourceOIV = Array.from(uniqueSourceOIVIds).map(oivId => ({
        id: oivId,
        name: data.oiv.find(oiv => oiv.id === oivId)?.name || oivId
    })).sort((a, b) => a.name.localeCompare(b.name));
    
    // Создаем заголовок таблицы
    const thead = document.createElement('thead');
    const headerRow1 = document.createElement('tr');
    
    const themeHeader = document.createElement('th');
    themeHeader.textContent = 'Темы';
    themeHeader.rowSpan = 2;
    headerRow1.appendChild(themeHeader);
    
    const detailsHeader = document.createElement('th');
    detailsHeader.textContent = 'Выбранный орган власти';
    detailsHeader.colSpan = sourceOIV.length;
    headerRow1.appendChild(detailsHeader);
    
    thead.appendChild(headerRow1);
    
    const headerRow2 = document.createElement('tr');
    sourceOIV.forEach(oiv => {
        const oivHeader = document.createElement('th');
        oivHeader.textContent = oiv.name;
        headerRow2.appendChild(oivHeader);
    });
    
    thead.appendChild(headerRow2);
    table.appendChild(thead);
    
    // Создаем тело таблицы
    const tbody = document.createElement('tbody');
    themes.forEach(theme => {
        const row = document.createElement('tr');
        const themeCell = document.createElement('td');
        themeCell.className = 'theme-cell';
        
        // Добавляем иконку +/-
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'toggle-icon';
        toggleIcon.textContent = '+';
        toggleIcon.dataset.expanded = 'false';
        themeCell.appendChild(toggleIcon);
        
        // Добавляем текст темы
        const themeText = document.createElement('span');
        themeText.textContent = theme;
        themeCell.appendChild(themeText);
        
        row.appendChild(themeCell);
        
        sourceOIV.forEach(oiv => {
            const count = data.edges.filter(edge => 
                edge.theme === theme && edge.source === oiv.id
            ).length;
            
            const countCell = document.createElement('td');
            countCell.textContent = count > 0 ? count : '';
            row.appendChild(countCell);
        });
        
        tbody.appendChild(row);
        
        // Создаем контейнер для целевой таблицы
        const targetTableContainer = document.createElement('div');
        targetTableContainer.className = 'target-table-container';
        targetTableContainer.id = `target-table-${theme.replace(/\s+/g, '-')}`;
        
        // Создаем целевую таблицу
        createTargetTable(data, targetTableContainer, theme);
        
        // Добавляем контейнер после строки
        const containerRow = document.createElement('tr');
        const containerCell = document.createElement('td');
        containerCell.colSpan = sourceOIV.length + 1;
        containerCell.appendChild(targetTableContainer);
        containerRow.appendChild(containerCell);
        tbody.appendChild(containerRow);
        
        // Добавляем обработчик клика на иконку и текст темы
        const toggleHandler = () => {
            const isExpanded = toggleIcon.dataset.expanded === 'true';
            toggleIcon.dataset.expanded = !isExpanded;
            toggleIcon.textContent = isExpanded ? '+' : '-';
            targetTableContainer.classList.toggle('visible', !isExpanded);
        };
        
        toggleIcon.addEventListener('click', toggleHandler);
        themeText.addEventListener('click', toggleHandler);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
}

function createTargetTable(data, container, theme) {
    // Фильтруем связи по выбранной теме
    const themeEdges = data.edges.filter(edge => edge.theme === theme);
    
    // Получаем уникальные source OIV для этой темы
    const sourceOIVs = [...new Set(themeEdges.map(edge => edge.source))];
    
    // Создаем таблицу для каждой source OIV
    sourceOIVs.forEach(sourceOIVId => {
        const sourceName = data.oiv.find(oiv => oiv.id === sourceOIVId)?.name || sourceOIVId;
        
        // Создаем заголовок для source OIV
        const sourceHeader = document.createElement('h4');
        sourceHeader.textContent = `Выбранный орган власти: ${sourceName}`;
        container.appendChild(sourceHeader);

        // Создаем таблицу
        const table = document.createElement('table');
        table.className = 'dashboard-table';
        
        // Создаем заголовок таблицы
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Добавляем столбец №п/п
        const numberHeader = document.createElement('th');
        numberHeader.textContent = '№п/п';
        numberHeader.style.width = '50px';
        headerRow.appendChild(numberHeader);
        
        const targetHeader = document.createElement('th');
        targetHeader.textContent = 'Связанный орган власти';
        targetHeader.style.width = '700px';
        headerRow.appendChild(targetHeader);
        
        const detailsHeader = document.createElement('th');
        detailsHeader.textContent = 'Наименование связи';
        headerRow.appendChild(detailsHeader);
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Создаем тело таблицы
        const tbody = document.createElement('tbody');
        
        // Получаем все target OIV для этого source и темы
        const targetEdges = themeEdges.filter(edge => edge.source === sourceOIVId);
        const targetOIVs = [...new Set(targetEdges.map(edge => edge.target))];
        
        // Добавляем счетчик для порядкового номера
        let rowNumber = 1;
        
        targetOIVs.forEach(targetOIVId => {
            const targetName = data.oiv.find(oiv => oiv.id === targetOIVId)?.name || targetOIVId;
            
            // Находим все связи между source и target для данной темы
            const connections = targetEdges.filter(edge => edge.target === targetOIVId);
            
            connections.forEach(connection => {
                const row = document.createElement('tr');
                
                // Добавляем ячейку с порядковым номером
                const numberCell = document.createElement('td');
                numberCell.textContent = rowNumber++;
                row.appendChild(numberCell);
                
                const targetCell = document.createElement('td');
                targetCell.textContent = targetName;
                row.appendChild(targetCell);
                
                const detailsCell = document.createElement('td');
                detailsCell.textContent = connection.label || connection.name || connection.description || 'Связь без названия';
                row.appendChild(detailsCell);
                
                tbody.appendChild(row);
            });
        });
        
        table.appendChild(tbody);
        container.appendChild(table);
    });
}

