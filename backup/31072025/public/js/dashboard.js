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
    
    // Создаем контейнер для таблиц
    const tablesContainer = document.createElement('div');
    tablesContainer.className = 'tables-container';
    
    // Создаем таблицу для source OIV
    createSourceTable(data, tablesContainer);
    
    // Добавляем разделитель
    const separator = document.createElement('div');
    separator.className = 'table-separator';
    separator.textContent = 'Связи с целевыми OIV';
    tablesContainer.appendChild(separator);
    
    // Создаем таблицу для target OIV
    createTargetTable(data, tablesContainer);
    
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
            text-align: left;
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
    detailsHeader.textContent = 'Источники (OIV)';
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
        themeCell.textContent = theme;
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
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
}

function createTargetTable(data, container) {
    const table = document.createElement('table');
    table.className = 'dashboard-table';
    
    // Получаем уникальные темы
    const themes = [...new Set(data.edges.map(edge => edge.theme))];
    
    // Собираем все уникальные target OIV
    const uniqueTargetOIVIds = new Set(data.edges.map(edge => edge.target));
    const targetOIV = Array.from(uniqueTargetOIVIds).map(oivId => ({
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
    detailsHeader.textContent = 'Цели (OIV)';
    detailsHeader.colSpan = targetOIV.length;
    headerRow1.appendChild(detailsHeader);
    
    thead.appendChild(headerRow1);
    
    const headerRow2 = document.createElement('tr');
    targetOIV.forEach(oiv => {
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
        themeCell.textContent = theme;
        row.appendChild(themeCell);
        
        targetOIV.forEach(oiv => {
            const count = data.edges.filter(edge => 
                edge.theme === theme && edge.target === oiv.id
            ).length;
            
            const countCell = document.createElement('td');
            countCell.textContent = count > 0 ? count : '';
            row.appendChild(countCell);
        });
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
}