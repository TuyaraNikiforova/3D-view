// Глобальные переменные для хранения данных
let currentData = null;
let objectsData = null;
let parametersData = null;
let indicatorsData = null;

// Основной код dashboard.js
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем дополнительные данные
    Promise.all([
        fetch('/data/objects.json').then(res => res.json()),
        fetch('/data/parameters.json').then(res => res.json()),
        fetch('/data/indicators.json').then(res => res.json())
    ])
    .then(([objects, parameters, indicators]) => {
        objectsData = objects;
        parametersData = parameters;
        indicatorsData = indicators;
        
        // Проверяем сохраненные фильтры из localStorage
        const savedFilters = localStorage.getItem('dashboardFilters');
        if (savedFilters) {
            const filters = JSON.parse(savedFilters);
            loadFilteredData(filters);
            applySavedFiltersToUI(filters); // Применяем фильтры к UI
        } else {
            showEmptyState();
        }
    })
    .catch(error => console.error('Error loading additional data:', error));
    
    // Добавляем обработчики для кнопок раскрытия/скрытия таблиц
    document.querySelectorAll('.table-header').forEach(header => {
        header.addEventListener('click', function() {
            const content = this.nextElementSibling;
            const icon = this.querySelector('.toggle-icon');
            
            if (content.classList.contains('visible')) {
                content.classList.remove('visible');
                icon.textContent = '+';
            } else {
                content.classList.add('visible');
                icon.textContent = '-';
            }
        });
    });
    
    // Обработчик для кнопки экспорта
    document.getElementById('export-btn').addEventListener('click', function() {
        exportDashboardToExcel(currentData);
    });
    
    // Добавляем обработчики для фильтров
    document.getElementById('apply-filters').addEventListener('click', applyFiltersFromUI);
    document.getElementById('clear-filters').addEventListener('click', clearFilters);
});

// Функция для применения сохраненных фильтров к UI
function applySavedFiltersToUI(filters) {
    // Применяем фильтры тем
    if (filters.themes && filters.themes.length > 0) {
        document.querySelectorAll('.theme-checkbox').forEach(checkbox => {
            checkbox.checked = filters.themes.includes(checkbox.value);
        });
    }
    
    // Применяем фильтры OIV
    if (filters.oivIds && filters.oivIds.length > 0) {
        document.querySelectorAll('.oiv-checkbox').forEach(checkbox => {
            checkbox.checked = filters.oivIds.includes(checkbox.value);
        });
    }
}

function loadFilteredData(filters) {
    // Загружаем данные и применяем фильтры
    fetch('/data/data.json')
        .then(res => res.json())
        .then(data => {
            // Фильтруем данные в соответствии с выбранными фильтрами
            const filteredData = applyFiltersToData(data, filters);
            if (shouldShowDashboard(filteredData, filters)) {
                createDashboardLayout(filteredData);
                createFilters(filteredData);
                applySavedFiltersToUI(filters); // Применяем фильтры к UI после создания
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

    // Фильтрация по темам
    if (filters.themes && filters.themes.length > 0) {
        filteredData.edges = data.edges.filter(edge => filters.themes.includes(edge.theme));
        
        // Получаем OIV, участвующие в выбранных темах
        const themeOIVs = new Set();
        filteredData.edges.forEach(edge => {
            themeOIVs.add(edge.source);
            themeOIVs.add(edge.target);
        });
        
        filteredData.oiv = data.oiv.filter(oiv => themeOIVs.has(oiv.id));
    }
    // Фильтрация по OIV (объединенный фильтр для источников и целей)
    else if (filters.oivIds && filters.oivIds.length > 0) {
        filteredData.edges = data.edges.filter(edge => 
            filters.oivIds.includes(edge.source) || filters.oivIds.includes(edge.target));
        
        // Получаем все уникальные OIV (источники и цели)
        const allOIVs = new Set();
        filteredData.edges.forEach(edge => {
            allOIVs.add(edge.source);
            allOIVs.add(edge.target);
        });
        
        filteredData.oiv = data.oiv.filter(oiv => allOIVs.has(oiv.id));
    }
    // Если нет подходящих фильтров, возвращаем пустые данные
    else {
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
        (filters.themes && filters.themes.length > 0)
    ) && data.oiv.length > 0;
}

function showEmptyState() {
    const container = document.getElementById('dashboard-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <h3>Выберите фильтр на 3D-схеме</h3>
            <p>Для отображения данных выберите органы власти, темы, комплексы или другие фильтры в 3D-визуализации</p>
        </div>
    `;
}

function createDashboardLayout(data) {
    const container = document.getElementById('dashboard-container');
    if (!container) return;
    
    // Сохраняем данные для использования в фильтрах и экспорте
    currentData = data;
    
    // Очищаем контейнер, но оставляем структуру
    document.getElementById('themes-table-content').innerHTML = '';
    document.getElementById('objects-table-content').innerHTML = '';
    document.getElementById('parameters-table-content').innerHTML = '';
    document.getElementById('indicators-table-content').innerHTML = '';
    
    // Создаем таблицы
    createThemesTable(data, document.getElementById('themes-table-content'));
    createObjectsTable(data, document.getElementById('objects-table-content'));
    createParametersTable(data, document.getElementById('parameters-table-content'));
    createIndicatorsTable(data, document.getElementById('indicators-table-content'));
}

function createFilters(data) {
    // Получаем уникальные темы
    const themes = [...new Set(data.edges.map(edge => edge.theme))];
    const themesFilter = document.querySelector('#themes-filter .filter-checkboxes');
    themesFilter.innerHTML = '';
    
    themes.forEach(theme => {
        const div = document.createElement('div');
        div.className = 'filter-checkbox';
        
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = theme;
        input.className = 'theme-checkbox';
        
        label.appendChild(input);
        label.appendChild(document.createTextNode(theme));
        div.appendChild(label);
        themesFilter.appendChild(div);
    });
    
    // Получаем уникальные OIV (объединенные источники и цели)
    const allOIVs = new Set();
    data.edges.forEach(edge => {
        allOIVs.add(edge.source);
        allOIVs.add(edge.target);
    });
    
    const oivFilter = document.querySelector('#oiv-filter .filter-checkboxes');
    oivFilter.innerHTML = '';
    
    allOIVs.forEach(oivId => {
        const oivName = data.oiv.find(oiv => oiv.id === oivId)?.name || oivId;
        
        const div = document.createElement('div');
        div.className = 'filter-checkbox';
        
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = oivId;
        input.className = 'oiv-checkbox';
        
        label.appendChild(input);
        label.appendChild(document.createTextNode(oivName));
        div.appendChild(label);
        oivFilter.appendChild(div);
    });
    
    // Добавляем обработчики событий для фильтров
    document.querySelectorAll('.theme-checkbox, .oiv-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', applyFiltersFromUI);
    });
}

function applyFiltersFromUI() {
    const selectedThemes = [...document.querySelectorAll('.theme-checkbox:checked')].map(cb => cb.value);
    const selectedOIVs = [...document.querySelectorAll('.oiv-checkbox:checked')].map(cb => cb.value);
    
    // Сохраняем фильтры в localStorage
    const filters = {
        themes: selectedThemes,
        oivIds: selectedOIVs
    };
    localStorage.setItem('dashboardFilters', JSON.stringify(filters));
    
    // Перезагружаем данные с новыми фильтрами
    loadFilteredData(filters);
}

function clearFilters() {
    // Очищаем все чекбоксы
    document.querySelectorAll('.theme-checkbox, .oiv-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Очищаем localStorage
    localStorage.removeItem('dashboardFilters');
    
    // Показываем пустое состояние
    showEmptyState();
}

// Модифицированные функции для создания таблиц с учетом фильтров
function createThemesTable(data, container) {
    if (!data.edges || data.edges.length === 0) {
        container.innerHTML = '<p>Нет данных для отображения</p>';
        return;
    }
    
    // Получаем сохраненные фильтры
    const savedFilters = JSON.parse(localStorage.getItem('dashboardFilters') || '{}');
    const filteredThemes = savedFilters.themes || [];
    
    // Получаем уникальные темы, отфильтрованные если есть фильтры
    let themes = [...new Set(data.edges.map(edge => edge.theme))];
    if (filteredThemes.length > 0) {
        themes = themes.filter(theme => filteredThemes.includes(theme));
    }
    
    // Создаем таблицы для каждой темы
    themes.forEach(theme => {
        const themeEdges = data.edges.filter(edge => edge.theme === theme);
        
        if (themeEdges.length === 0) return;
        
        // Создаем контейнер для таблицы темы с возможностью раскрытия/скрытия
        const themeContainer = document.createElement('div');
        themeContainer.className = 'theme-table-container';
        
        // Заголовок темы с кнопкой раскрытия
        const themeHeader = document.createElement('div');
        themeHeader.className = 'theme-header';
        themeHeader.style.cursor = 'pointer';
        themeHeader.style.padding = '10px';
        themeHeader.style.backgroundColor = '#f5f5f5';
        themeHeader.style.border = '1px solid #ddd';
        themeHeader.style.marginTop = '10px';
        themeHeader.style.borderRadius = '4px';
        themeHeader.style.display = 'flex';
        themeHeader.style.alignItems = 'center';
        themeHeader.style.justifyContent = 'space-between';
        
        const themeTitle = document.createElement('h4');
        themeTitle.textContent = `Тема: ${theme}`;
        themeTitle.style.margin = '0';
        themeTitle.style.color = '#4a6da7';
        
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'toggle-icon';
        toggleIcon.textContent = '+';
        toggleIcon.style.fontWeight = 'bold';
        toggleIcon.style.fontSize = '16px';
        
        themeHeader.appendChild(themeTitle);
        themeHeader.appendChild(toggleIcon);
        themeContainer.appendChild(themeHeader);
        
        // Контейнер для содержимого темы (изначально скрыт)
        const themeContent = document.createElement('div');
        themeContent.className = 'theme-content';
        themeContent.style.display = 'none';
        themeContent.style.padding = '10px';
        themeContent.style.border = '1px solid #ddd';
        themeContent.style.borderTop = 'none';
        themeContent.style.borderRadius = '0 0 4px 4px';
        
        // Создаем таблицу
        const table = document.createElement('table');
        table.className = 'dashboard-table';
        table.style.width = '100%'; // Увеличиваем ширину таблицы
        
        // Создаем заголовок таблицы
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        const sourceHeader = document.createElement('th');
        sourceHeader.textContent = 'Орган власти (Источник)';
        headerRow.appendChild(sourceHeader);
        
        const targetHeader = document.createElement('th');
        targetHeader.textContent = 'Орган власти (Взаимосвязанный)';
        headerRow.appendChild(targetHeader);
        
        const labelHeader = document.createElement('th');
        labelHeader.textContent = 'Наименование связи';
        headerRow.appendChild(labelHeader);
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Создаем тело таблицы
        const tbody = document.createElement('tbody');
        
        themeEdges.forEach(edge => {
            const row = document.createElement('tr');
            
            // Источник
            const sourceCell = document.createElement('td');
            const sourceOIV = data.oiv.find(oiv => oiv.id === edge.source);
            sourceCell.textContent = sourceOIV ? sourceOIV.name : edge.source;
            row.appendChild(sourceCell);
            
            // Цель
            const targetCell = document.createElement('td');
            const targetOIV = data.oiv.find(oiv => oiv.id === edge.target);
            targetCell.textContent = targetOIV ? targetOIV.name : edge.target;
            row.appendChild(targetCell);
            
            // Наименование связи
            const labelCell = document.createElement('td');
            labelCell.textContent = edge.label || 'Без названия';
            row.appendChild(labelCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        themeContent.appendChild(table);
        themeContainer.appendChild(themeContent);
        container.appendChild(themeContainer);
        
        // Добавляем обработчик для раскрытия/скрытия темы
        themeHeader.addEventListener('click', function() {
            if (themeContent.style.display === 'none') {
                themeContent.style.display = 'block';
                toggleIcon.textContent = '-';
            } else {
                themeContent.style.display = 'none';
                toggleIcon.textContent = '+';
            }
        });
    });
}

function createObjectsTable(data, container) {
    if (!objectsData || objectsData.length === 0) {
        container.innerHTML = '<p>Нет данных об объектах управления</p>';
        return;
    }
    
    // Получаем сохраненные фильтры
    const savedFilters = JSON.parse(localStorage.getItem('dashboardFilters') || '{}');
    const filteredOIVs = savedFilters.oivIds || [];
    const filteredThemes = savedFilters.themes || [];
    
    // Фильтруем объекты по выбранным OIV и темам
    let filteredObjects = objectsData;
    
    if (filteredOIVs.length > 0) {
        filteredObjects = filteredObjects.filter(obj => filteredOIVs.includes(obj.oiv_id));
    }
    
    if (filteredThemes.length > 0) {
        filteredObjects = filteredObjects.filter(obj => filteredThemes.includes(obj.theme));
    }
    
    if (filteredObjects.length === 0) {
        container.innerHTML = '<p>Нет данных об объектах управления для выбранных фильтров</p>';
        return;
    }
    
    // Получаем уникальные темы из отфильтрованных объектов управления
    const themes = [...new Set(filteredObjects.map(obj => obj.theme))];
    
    // Создаем таблицы для каждой темы
    themes.forEach(theme => {
        const themeObjects = filteredObjects.filter(obj => obj.theme === theme);
        
        if (themeObjects.length === 0) return;
        
        // Создаем контейнер для таблицы темы с возможностью раскрытия/скрытия
        const themeContainer = document.createElement('div');
        themeContainer.className = 'theme-objects-container';
        
        // Заголовок темы с кнопкой раскрытия
        const themeHeader = document.createElement('div');
        themeHeader.className = 'theme-header';
        themeHeader.style.cursor = 'pointer';
        themeHeader.style.padding = '10px';
        themeHeader.style.backgroundColor = '#f5f5f5';
        themeHeader.style.border = '1px solid #ddd';
        themeHeader.style.marginTop = '10px';
        themeHeader.style.borderRadius = '4px';
        themeHeader.style.display = 'flex';
        themeHeader.style.alignItems = 'center';
        themeHeader.style.justifyContent = 'space-between';
        
        const themeTitle = document.createElement('h4');
        themeTitle.textContent = `Тема: ${theme}`;
        themeTitle.style.margin = '0';
        themeTitle.style.color = '#4a6da7';
        
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'toggle-icon';
        toggleIcon.textContent = '+';
        toggleIcon.style.fontWeight = 'bold';
        toggleIcon.style.fontSize = '16px';
        
        themeHeader.appendChild(themeTitle);
        themeHeader.appendChild(toggleIcon);
        themeContainer.appendChild(themeHeader);
        
        // Контейнер для содержимого темы (изначально скрыт)
        const themeContent = document.createElement('div');
        themeContent.className = 'theme-content';
        themeContent.style.display = 'none';
        themeContent.style.padding = '10px';
        themeContent.style.border = '1px solid #ddd';
        themeContent.style.borderTop = 'none';
        themeContent.style.borderRadius = '0 0 4px 4px';
        
        // Создаем таблицу
        const table = document.createElement('table');
        table.className = 'dashboard-table';
        table.style.width = '100%'; // Увеличиваем ширину таблицы
        
        // Создаем заголовок таблицы
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        const nameHeader = document.createElement('th');
        nameHeader.textContent = 'Наименование объекта управления';
        headerRow.appendChild(nameHeader);
        
        const oivHeader = document.createElement('th');
        oivHeader.textContent = 'Орган власти';
        headerRow.appendChild(oivHeader);
        
        const oivDataHeader = document.createElement('th');
        oivDataHeader.textContent = 'Данные ОИВ';
        headerRow.appendChild(oivDataHeader);
        
        const aiDataHeader = document.createElement('th');
        aiDataHeader.textContent = 'Данные ИИ';
        headerRow.appendChild(aiDataHeader);
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Создаем тело таблицы
        const tbody = document.createElement('tbody');
        
        themeObjects.forEach(obj => {
            const row = document.createElement('tr');
            
            const nameCell = document.createElement('td');
            nameCell.textContent = obj.object_name;
            row.appendChild(nameCell);
            
            const oivCell = document.createElement('td');
            const oiv = data.oiv.find(o => o.id === obj.oiv_id);
            oivCell.textContent = oiv ? oiv.name : 'Неизвестный орган';
            row.appendChild(oivCell);
            
            const oivDataCell = document.createElement('td');
            // Данные ОИВ (info_type = 1)
            oivDataCell.innerHTML = obj.info_type === 1 ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(oivDataCell);
            
            const aiDataCell = document.createElement('td');
            // Данные ИИ (info_type = 2 ИЛИ есть AI_object_id)
            const hasAIData = obj.info_type === 2 || obj.AI_object_id !== null;
            aiDataCell.innerHTML = hasAIData ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(aiDataCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        themeContent.appendChild(table);
        themeContainer.appendChild(themeContent);
        container.appendChild(themeContainer);
        
        // Добавляем обработчик для раскрытия/скрытия темы
        themeHeader.addEventListener('click', function() {
            if (themeContent.style.display === 'none') {
                themeContent.style.display = 'block';
                toggleIcon.textContent = '-';
            } else {
                themeContent.style.display = 'none';
                toggleIcon.textContent = '+';
            }
        });
    });
}

function createParametersTable(data, container) {
    if (!parametersData || parametersData.length === 0) {
        container.innerHTML = '<p>Нет данных о параметрах объектов управления</p>';
        return;
    }
    
    // Получаем сохраненные фильтры
    const savedFilters = JSON.parse(localStorage.getItem('dashboardFilters') || '{}');
    const filteredOIVs = savedFilters.oivIds || [];
    const filteredThemes = savedFilters.themes || [];
    
    // Фильтруем параметры по выбранным OIV и темам
    let filteredParameters = parametersData;
    
    if (filteredOIVs.length > 0) {
        filteredParameters = filteredParameters.filter(param => filteredOIVs.includes(param.oiv_id));
    }
    
    if (filteredThemes.length > 0) {
        filteredParameters = filteredParameters.filter(param => filteredThemes.includes(param.theme));
    }
    
    if (filteredParameters.length === 0) {
        container.innerHTML = '<p>Нет данных о параметрах для выбранных фильтров</p>';
        return;
    }
    
    // Получаем уникальные темы из отфильтрованных параметров
    const themes = [...new Set(filteredParameters.map(param => param.theme))];
    
    // Создаем таблицы для каждой темы
    themes.forEach(theme => {
        const themeParameters = filteredParameters.filter(param => param.theme === theme);
        
        if (themeParameters.length === 0) return;
        
        // Создаем контейнер для таблицы темы с возможностью раскрытия/скрытия
        const themeContainer = document.createElement('div');
        themeContainer.className = 'theme-parameters-container';
        
        // Заголовок темы с кнопкой раскрытия
        const themeHeader = document.createElement('div');
        themeHeader.className = 'theme-header';
        themeHeader.style.cursor = 'pointer';
        themeHeader.style.padding = '10px';
        themeHeader.style.backgroundColor = '#f5f5f5';
        themeHeader.style.border = '1px solid #ddd';
        themeHeader.style.marginTop = '10px';
        themeHeader.style.borderRadius = '4px';
        themeHeader.style.display = 'flex';
        themeHeader.style.alignItems = 'center';
        themeHeader.style.justifyContent = 'space-between';
        
        const themeTitle = document.createElement('h4');
        themeTitle.textContent = `Тема: ${theme}`;
        themeTitle.style.margin = '0';
        themeTitle.style.color = '#4a6da7';
        
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'toggle-icon';
        toggleIcon.textContent = '+';
        toggleIcon.style.fontWeight = 'bold';
        toggleIcon.style.fontSize = '16px';
        
        themeHeader.appendChild(themeTitle);
        themeHeader.appendChild(toggleIcon);
        themeContainer.appendChild(themeHeader);
        
        // Контейнер для содержимого темы (изначально скрыт)
        const themeContent = document.createElement('div');
        themeContent.className = 'theme-content';
        themeContent.style.display = 'none';
        themeContent.style.padding = '10px';
        themeContent.style.border = '1px solid #ddd';
        themeContent.style.borderTop = 'none';
        themeContent.style.borderRadius = '0 0 4px 4px';
        
        // Создаем таблицу
        const table = document.createElement('table');
        table.className = 'dashboard-table';
        table.style.width = '100%'; // Увеличиваем ширину таблицы
        
        // Создаем заголовок таблицы
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        const nameHeader = document.createElement('th');
        nameHeader.textContent = 'Наименование параметра';
        headerRow.appendChild(nameHeader);
        
        const objectHeader = document.createElement('th');
        objectHeader.textContent = 'Объект управления';
        headerRow.appendChild(objectHeader);
        
        const oivHeader = document.createElement('th');
        oivHeader.textContent = 'Орган власти';
        headerRow.appendChild(oivHeader);
        
        const oivDataHeader = document.createElement('th');
        oivDataHeader.textContent = 'Данные ОИВ';
        headerRow.appendChild(oivDataHeader);
        
        const aiDataHeader = document.createElement('th');
        aiDataHeader.textContent = 'Данные ИИ';
        headerRow.appendChild(aiDataHeader);
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Создаем тело таблицы
        const tbody = document.createElement('tbody');
        
        themeParameters.forEach(param => {
            const row = document.createElement('tr');
            
            const nameCell = document.createElement('td');
            nameCell.textContent = param.parameter_name;
            row.appendChild(nameCell);
            
            const objectCell = document.createElement('td');
            const object = objectsData.find(obj => obj.object_id === param.object_id);
            objectCell.textContent = object ? object.object_name : 'Неизвестный объект';
            row.appendChild(objectCell);
            
            const oivCell = document.createElement('td');
            const oiv = data.oiv.find(o => o.id === param.oiv_id);
            oivCell.textContent = oiv ? oiv.name : 'Неизвестный орган';
            row.appendChild(oivCell);
            
            const oivDataCell = document.createElement('td');
            // Данные ОИВ (info_type = 1)
            oivDataCell.innerHTML = param.info_type === 1 ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(oivDataCell);
            
            const aiDataCell = document.createElement('td');
            // Данные ИИ (info_type = 2 ИЛИ есть AI_parameter_id)
            const hasAIData = param.info_type === 2 || (param.AI_parameter_id !== null && param.AI_parameter_id !== undefined);
            aiDataCell.innerHTML = hasAIData ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(aiDataCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        themeContent.appendChild(table);
        themeContainer.appendChild(themeContent);
        container.appendChild(themeContainer);
        
        // Добавляем обработчик для раскрытия/скрытия темы
        themeHeader.addEventListener('click', function() {
            if (themeContent.style.display === 'none') {
                themeContent.style.display = 'block';
                toggleIcon.textContent = '-';
            } else {
                themeContent.style.display = 'none';
                toggleIcon.textContent = '+';
            }
        });
    });
}

function createIndicatorsTable(data, container) {
    if (!indicatorsData || indicatorsData.length === 0) {
        container.innerHTML = '<p>Нет данных о показателях для выбранных фильтров</p>';
        return;
    }
    
    // Получаем сохраненные фильтры
    const savedFilters = JSON.parse(localStorage.getItem('dashboardFilters') || '{}');
    const filteredOIVs = savedFilters.oivIds || [];
    const filteredThemes = savedFilters.themes || [];
    
    // Фильтруем показатели по выбранным OIV и темам
    let filteredIndicators = indicatorsData;
    
    if (filteredOIVs.length > 0) {
        filteredIndicators = filteredIndicators.filter(indicator => filteredOIVs.includes(indicator.oiv_id));
    }
    
    if (filteredThemes.length > 0) {
        filteredIndicators = filteredIndicators.filter(indicator => filteredThemes.includes(indicator.theme));
    }
    
    if (filteredIndicators.length === 0) {
        container.innerHTML = '<p>Нет данных о показателях для выбранных фильтров</p>';
        return;
    }
    
    // Получаем уникальные темы из отфильтрованных показателей
    const themes = [...new Set(filteredIndicators.map(indicator => indicator.theme))];
    
    // Создаем таблицы для каждой темы
    themes.forEach(theme => {
        const themeIndicators = filteredIndicators.filter(indicator => indicator.theme === theme);
        
        if (themeIndicators.length === 0) return;
        
        // Создаем контейнер для таблицы темы с возможностью раскрытия/скрытия
        const themeContainer = document.createElement('div');
        themeContainer.className = 'theme-indicators-container';
        
        // Заголовок темы с кнопкой раскрытия
        const themeHeader = document.createElement('div');
        themeHeader.className = 'theme-header';
        themeHeader.style.cursor = 'pointer';
        themeHeader.style.padding = '10px';
        themeHeader.style.backgroundColor = '#f5f5f5';
        themeHeader.style.border = '1px solid #ddd';
        themeHeader.style.marginTop = '10px';
        themeHeader.style.borderRadius = '4px';
        themeHeader.style.display = 'flex';
        themeHeader.style.alignItems = 'center';
        themeHeader.style.justifyContent = 'space-between';
        
        const themeTitle = document.createElement('h4');
        themeTitle.textContent = `Тема: ${theme}`;
        themeTitle.style.margin = '0';
        themeTitle.style.color = '#4a6da7';
        
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'toggle-icon';
        toggleIcon.textContent = '+';
        toggleIcon.style.fontWeight = 'bold';
        toggleIcon.style.fontSize = '16px';
        
        themeHeader.appendChild(themeTitle);
        themeHeader.appendChild(toggleIcon);
        themeContainer.appendChild(themeHeader);
        
        // Контейнер для содержимого темы (изначально скрыт)
        const themeContent = document.createElement('div');
        themeContent.className = 'theme-content';
        themeContent.style.display = 'none';
        themeContent.style.padding = '10px';
        themeContent.style.border = '1px solid #ddd';
        themeContent.style.borderTop = 'none';
        themeContent.style.borderRadius = '0 0 4px 4px';
        
        // Создаем таблицу
        const table = document.createElement('table');
        table.className = 'dashboard-table';
        table.style.width = '100%'; // Увеличиваем ширину таблицы
        
        // Создаем заголовок таблицы
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        const nameHeader = document.createElement('th');
        nameHeader.textContent = 'Наименование показателя';
        headerRow.appendChild(nameHeader);
        
        const objectHeader = document.createElement('th');
        objectHeader.textContent = 'Объект управления';
        headerRow.appendChild(objectHeader);
        
        const oivHeader = document.createElement('th');
        oivHeader.textContent = 'Орган власти';
        headerRow.appendChild(oivHeader);
        
        const valueHeader = document.createElement('th');
        valueHeader.textContent = 'Значение';
        headerRow.appendChild(valueHeader);
        
        const unitHeader = document.createElement('th');
        unitHeader.textContent = 'Единица измерения';
        headerRow.appendChild(unitHeader);
        
        const periodHeader = document.createElement('th');
        periodHeader.textContent = 'Период';
        headerRow.appendChild(periodHeader);
        
        const oivDataHeader = document.createElement('th');
        oivDataHeader.textContent = 'Данные ОИВ';
        headerRow.appendChild(oivDataHeader);
        
        const aiDataHeader = document.createElement('th');
        aiDataHeader.textContent = 'Данные ИИ';
        headerRow.appendChild(aiDataHeader);
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Создаем тело таблицы
        const tbody = document.createElement('tbody');
        
        themeIndicators.forEach(indicator => {
            const row = document.createElement('tr');
            
            const nameCell = document.createElement('td');
            nameCell.textContent = indicator.indicator_name;
            row.appendChild(nameCell);
            
            const objectCell = document.createElement('td');
            const object = objectsData.find(obj => obj.object_id === indicator.object_id);
            objectCell.textContent = object ? object.object_name : 'Неизвестный объект';
            row.appendChild(objectCell);
            
            const oivCell = document.createElement('td');
            const oiv = data.oiv.find(o => o.id === indicator.oiv_id);
            oivCell.textContent = oiv ? oiv.name : 'Неизвестный орган';
            row.appendChild(oivCell);
            
            const valueCell = document.createElement('td');
            valueCell.textContent = indicator.value || 'Нет данных';
            row.appendChild(valueCell);
            
            const unitCell = document.createElement('td');
            unitCell.textContent = indicator.unit || 'Не указано';
            row.appendChild(unitCell);
            
            const periodCell = document.createElement('td');
            periodCell.textContent = indicator.period || 'Не указано';
            row.appendChild(periodCell);
            
            const oivDataCell = document.createElement('td');
            // Данные ОИВ (info_type = 1)
            oivDataCell.innerHTML = indicator.info_type === 1 ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(oivDataCell);
            
            const aiDataCell = document.createElement('td');
            // Данные ИИ (info_type = 2 ИЛИ есть AI_indicator_id)
            const hasAIData = indicator.info_type === 2 || (indicator.AI_indicator_id !== null && indicator.AI_indicator_id !== undefined);
            aiDataCell.innerHTML = hasAIData ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(aiDataCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        themeContent.appendChild(table);
        themeContainer.appendChild(themeContent);
        container.appendChild(themeContainer);
        
        // Добавляем обработчик для раскрытия/скрытия темы
        themeHeader.addEventListener('click', function() {
            if (themeContent.style.display === 'none') {
                themeContent.style.display = 'block';
                toggleIcon.textContent = '-';
            } else {
                themeContent.style.display = 'none';
                toggleIcon.textContent = '+';
            }
        });
    });
}

// Функция экспорта в Excel
function exportDashboardToExcel(data, fileName = 'dashboard_export') {
    // Проверяем, загружена ли библиотека XLSX
    if (typeof XLSX === 'undefined') {
        alert('Библиотека экспорта не загружена');
        return;
    }
    
    // Создаем новую рабочую книгу
    const wb = XLSX.utils.book_new();
    
    // Создаем лист с темами
    if (data.edges && data.edges.length > 0) {
        const themesData = data.edges.map(edge => {
            const sourceOIV = data.oiv.find(oiv => oiv.id === edge.source);
            const targetOIV = data.oiv.find(oiv => oiv.id === edge.target);
            
            return {
                'Тема': edge.theme,
                'Орган власти (Источник)': sourceOIV ? sourceOIV.name : edge.source,
                'Орган власти (Цель)': targetOIV ? targetOIV.name : edge.target,
                'Наименование связи': edge.label || 'Без названия'
            };
        });
        
        const themesWs = XLSX.utils.json_to_sheet(themesData);
        XLSX.utils.book_append_sheet(wb, themesWs, 'Темы');
    }
    
    // Создаем лист с объектами управления
    if (objectsData && objectsData.length > 0) {
        const objectsDataForExport = objectsData.map(obj => {
            const oiv = data.oiv.find(o => o.id === obj.oiv_id);
            
            return {
                'Тема': obj.theme,
                'Наименование объекта управления': obj.object_name,
                'Орган власти': oiv ? oiv.name : 'Неизвестный орган',
                'Данные ОИВ': obj.info_type === 1 ? '✓' : '',
                'Данные ИИ': (obj.info_type === 2 || obj.AI_object_id !== null) ? '✓' : ''
            };
        });
        
        const objectsWs = XLSX.utils.json_to_sheet(objectsDataForExport);
        XLSX.utils.book_append_sheet(wb, objectsWs, 'Объекты управления');
    }
    
    // Создаем лист с параметрами
    if (parametersData && parametersData.length > 0) {
        const parametersDataForExport = parametersData.map(param => {
            const object = objectsData.find(obj => obj.object_id === param.object_id);
            const oiv = data.oiv.find(o => o.id === param.oiv_id);
            
            return {
                'Тема': param.theme,
                'Наименование параметра': param.parameter_name,
                'Объект управления': object ? object.object_name : 'Неизвестный объект',
                'Орган власти': oiv ? oiv.name : 'Неизвестный орган',
                'Данные ОИВ': param.info_type === 1 ? '✓' : '',
                'Данные ИИ': (param.info_type === 2 || (param.AI_parameter_id !== null && param.AI_parameter_id !== undefined)) ? '✓' : ''
            };
        });
        
        const parametersWs = XLSX.utils.json_to_sheet(parametersDataForExport);
        XLSX.utils.book_append_sheet(wb, parametersWs, 'Параметры');
    }
    
    // Создаем лист с показателями
    if (indicatorsData && indicatorsData.length > 0) {
        const indicatorsDataForExport = indicatorsData.map(indicator => {
            const object = objectsData.find(obj => obj.object_id === indicator.object_id);
            const oiv = data.oiv.find(o => o.id === indicator.oiv_id);
            
            return {
                'Тема': indicator.theme,
                'Наименование показателя': indicator.indicator_name,
                'Объект управления': object ? object.object_name : 'Неизвестный объект',
                'Орган власти': oiv ? oiv.name : 'Неизвестный орган',
                'Данные ОИВ': indicator.info_type === 1 ? '✓' : '',
                'Данные ИИ': (indicator.info_type === 2 || (indicator.AI_indicator_id !== null && indicator.AI_indicator_id !== undefined)) ? '✓' : ''
            };
        });
        
        const indicatorsWs = XLSX.utils.json_to_sheet(indicatorsDataForExport);
        XLSX.utils.book_append_sheet(wb, indicatorsWs, 'Показатели');
    }
    
    // Сохраняем файл
    XLSX.writeFile(wb, `${fileName}.xlsx`);
}