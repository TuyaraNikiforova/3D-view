// Глобальные переменные для хранения данных
let currentData = null;
let objectsData = null;
let parametersData = null;
let indicatorsData = null;
let availableThemes = [];
let availableOIVs = [];

// Основной код dashboard.js
// Основной код dashboard.js
document.addEventListener('DOMContentLoaded', function() {
    console.log("Dashboard loaded");
    
    // Проверяем, загружена ли библиотека XLSX
    if (typeof XLSX === 'undefined') {
        showError('Библиотека экспорта не загружена. Проверьте подключение к интернету.');
    } else {
        console.log('XLSX library loaded successfully');
    }
    
    // Загружаем дополнительные данные
    Promise.all([
        fetch('/data/objects.json').then(res => res.json()).catch(e => {
            console.error('Error loading objects:', e);
            return [];
        }),
        fetch('/data/parameters.json').then(res => res.json()).catch(e => {
            console.error('Error loading parameters:', e);
            return [];
        }),
        fetch('/data/indicators.json').then(res => res.json()).catch(e => {
            console.error('Error loading indicators:', e);
            return [];
        })
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
        } else {
            showEmptyState();
        }
    })
    .catch(error => {
        console.error('Error loading additional data:', error);
        showError('Ошибка загрузки данных. Проверьте консоль для подробностей.');
    });
    
    // Обработчик для кнопки экспорта
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportDashboardToExcel(currentData);
        });
    }
    
    // Добавляем обработчики для фильтров
    const applyFiltersBtn = document.getElementById('apply-filters');
    const clearFiltersBtn = document.getElementById('clear-filters');
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', showFiltersModal);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
    
    // Создаем модальное окно для фильтров
    createFiltersModal();
});

function createFiltersModal() {
    // Проверяем, не существует ли уже модальное окно
    if (document.getElementById('filters-modal')) {
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'filters-modal';
    modal.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        z-index: 1000;
        justify-content: center;
        align-items: center;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background-color: #2a2a2a;
        padding: 20px;
        border-radius: 8px;
        width: 80%;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    modalContent.innerHTML = `
        <h2 style="margin-top: 0; color: #4a6da7;">Фильтры</h2>
        
        <div class="filter-section">
            <h3>Темы</h3>
            <div id="modal-themes-filter" class="modal-filter-content"></div>
        </div>
        
        <div class="filter-section" style="margin-top: 20px;">
            <h3>Органы власти</h3>
            <div id="modal-oiv-filter" class="modal-filter-content"></div>
        </div>
        
        <div class="modal-buttons" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
            <button id="modal-cancel" style="padding: 10px 20px; background-color: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">Отмена</button>
            <button id="modal-apply" style="padding: 10px 20px; background-color: #4a6da7; color: white; border: none; border-radius: 4px; cursor: pointer;">Применить</button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Обработчики для кнопок модального окна
    document.getElementById('modal-cancel').addEventListener('click', hideFiltersModal);
    document.getElementById('modal-apply').addEventListener('click', applyFiltersFromModal);
    
    // Закрытие модального окна при клике вне его
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            hideFiltersModal();
        }
    });
}

function showFiltersModal() {
    const modal = document.getElementById('filters-modal');
    if (!modal) return;
    
    // Всегда обновляем данные при открытии модального окна
    loadFiltersData();
    
    modal.style.display = 'flex';
}

// Скрыть модальное окно
function hideFiltersModal() {
    const modal = document.getElementById('filters-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function loadFiltersData() {
    // Загружаем отфильтрованные данные, которые используются в дашборде
    const savedFilters = localStorage.getItem('dashboardFilters');
    
    if (!savedFilters) {
        // Если нет сохраненных фильтров, показываем пустое состояние
        availableThemes = [];
        availableOIVs = [];
        populateModalFilters();
        return;
    }
    
    const filters = JSON.parse(savedFilters);
    
    // Загружаем данные с примененными фильтрами
    fetch('/data/data.json')
        .then(res => res.json())
        .then(data => {
            // Применяем текущие фильтры к данным
            const filteredData = applyFiltersToData(data, filters);
            
            // Получаем уникальные темы из отфильтрованных данных
            availableThemes = [...new Set(filteredData.edges.map(edge => edge.theme))];
            
            // Получаем все уникальные OIV из отфильтрованных данных
            const allOIVs = new Set();
            filteredData.edges.forEach(edge => {
                allOIVs.add(edge.source);
                allOIVs.add(edge.target);
            });
            
            availableOIVs = Array.from(allOIVs).map(oivId => {
                const oiv = filteredData.oiv.find(o => o.id === oivId);
                return {
                    id: oivId,
                    name: oiv ? oiv.name : oivId
                };
            });
            
            populateModalFilters();
        })
        .catch(error => {
            console.error('Error loading filter data:', error);
            showError('Ошибка загрузки данных для фильтров');
        });
}

function populateModalFilters() {
    const themesContainer = document.getElementById('modal-themes-filter');
    const oivContainer = document.getElementById('modal-oiv-filter');
    
    if (!themesContainer || !oivContainer) return;
    
    // Очищаем контейнеры
    themesContainer.innerHTML = '';
    oivContainer.innerHTML = '';
    
    // Заполняем темы
    availableThemes.forEach(theme => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'filter-checkbox';
        
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = theme;
        input.className = 'modal-theme-checkbox';
        
        label.appendChild(input);
        label.appendChild(document.createTextNode(theme));
        checkboxDiv.appendChild(label);
        themesContainer.appendChild(checkboxDiv);
    });
    
    // Заполняем OIV
    availableOIVs.forEach(oiv => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'filter-checkbox';
        
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = oiv.id;
        input.className = 'modal-oiv-checkbox';
        
        label.appendChild(input);
        label.appendChild(document.createTextNode(oiv.name));
        checkboxDiv.appendChild(label);
        oivContainer.appendChild(checkboxDiv);
    });
    
    // Применяем сохраненные фильтры, если они есть
    const savedFilters = localStorage.getItem('dashboardFilters');
    if (savedFilters) {
        const filters = JSON.parse(savedFilters);
        
        // Применяем фильтры тем
        if (filters.themes && filters.themes.length > 0) {
            document.querySelectorAll('.modal-theme-checkbox').forEach(checkbox => {
                checkbox.checked = filters.themes.includes(checkbox.value);
            });
        }
        
        // Применяем фильтры OIV
        if (filters.oivIds && filters.oivIds.length > 0) {
            document.querySelectorAll('.modal-oiv-checkbox').forEach(checkbox => {
                checkbox.checked = filters.oivIds.includes(checkbox.value);
            });
        }
    }
}

function applyFiltersFromModal() {
    const selectedThemes = [...document.querySelectorAll('.modal-theme-checkbox:checked')].map(cb => cb.value);
    const selectedOIVs = [...document.querySelectorAll('.modal-oiv-checkbox:checked')].map(cb => cb.value);
    
    // Сохраняем фильтры в localStorage
    const filters = {
        themes: selectedThemes,
        oivIds: selectedOIVs
    };
    localStorage.setItem('dashboardFilters', JSON.stringify(filters));
    
    // Скрываем модальное окно
    hideFiltersModal();
    
    // Перезагружаем данные с новыми фильтрами
    loadFilteredData(filters);
    
    // Обновляем данные в модальном окне для следующего открытия
    loadFiltersData();
}

function initializeFilters() {
    // Создаем выпадающие списки для фильтров
    createFilterDropdowns();
}

function createFilterDropdowns() {
    const themesFilter = document.querySelector('#themes-filter .filter-checkboxes');
    const oivFilter = document.querySelector('#oiv-filter .filter-checkboxes');
    
    if (themesFilter) {
        themesFilter.innerHTML = `
            <div class="filter-dropdown">
                <div class="filter-dropdown-header" style="cursor: pointer; padding: 8px; background-color: #444; border-radius: 4px; margin-bottom: 5px;">
                    <span>Выберите темы</span>
                    <span class="dropdown-icon" style="float: right;">▼</span>
                </div>
                <div class="filter-dropdown-content" style="display: none; max-height: 200px; overflow-y: auto; background-color: #333; padding: 10px; border-radius: 4px;"></div>
            </div>
        `;
        
        const themesHeader = themesFilter.querySelector('.filter-dropdown-header');
        const themesContent = themesFilter.querySelector('.filter-dropdown-content');
        
        themesHeader.addEventListener('click', function() {
            if (themesContent.style.display === 'none') {
                themesContent.style.display = 'block';
                themesHeader.querySelector('.dropdown-icon').textContent = '▲';
                
                // Заполняем список тем только при первом открытии
                if (themesContent.children.length === 0 && currentData) {
                    populateThemesDropdown(themesContent);
                }
            } else {
                themesContent.style.display = 'none';
                themesHeader.querySelector('.dropdown-icon').textContent = '▼';
            }
        });
    }
    
    if (oivFilter) {
        oivFilter.innerHTML = `
            <div class="filter-dropdown">
                <div class="filter-dropdown-header" style="cursor: pointer; padding: 8px; background-color: #444; border-radius: 4px; margin-bottom: 5px;">
                    <span>Выберите органы власти</span>
                    <span class="dropdown-icon" style="float: right;">▼</span>
                </div>
                <div class="filter-dropdown-content" style="display: none; max-height: 200px; overflow-y: auto; background-color: #333; padding: 10px; border-radius: 4px;"></div>
            </div>
        `;
        
        const oivHeader = oivFilter.querySelector('.filter-dropdown-header');
        const oivContent = oivFilter.querySelector('.filter-dropdown-content');
        
        oivHeader.addEventListener('click', function() {
            if (oivContent.style.display === 'none') {
                oivContent.style.display = 'block';
                oivHeader.querySelector('.dropdown-icon').textContent = '▲';
                
                // Заполняем список OIV только при первом открытии
                if (oivContent.children.length === 0 && currentData) {
                    populateOIVDropdown(oivContent);
                }
            } else {
                oivContent.style.display = 'none';
                oivHeader.querySelector('.dropdown-icon').textContent = '▼';
            }
        });
    }
}

function populateThemesDropdown(container) {
    if (!currentData || !currentData.edges) return;
    
    // Получаем уникальные темы
    const themes = [...new Set(currentData.edges.map(edge => edge.theme))];
    
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
        container.appendChild(div);
    });
    
    // Добавляем обработчики событий для чекбоксов
    container.querySelectorAll('.theme-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', applyFiltersFromUI);
    });
}

function populateOIVDropdown(container) {
    if (!currentData || !currentData.oiv) return;
    
    // Получаем все уникальные OIV из edges (источники и цели)
    const allOIVs = new Set();
    if (currentData.edges) {
        currentData.edges.forEach(edge => {
            allOIVs.add(edge.source);
            allOIVs.add(edge.target);
        });
    }
    
    // Создаем чекбоксы для каждого OIV
    allOIVs.forEach(oivId => {
        const oiv = currentData.oiv.find(o => o.id === oivId);
        if (oiv) {
            const div = document.createElement('div');
            div.className = 'filter-checkbox';
            
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.value = oivId;
            input.className = 'oiv-checkbox';
            
            label.appendChild(input);
            label.appendChild(document.createTextNode(oiv.name));
            div.appendChild(label);
            container.appendChild(div);
        }
    });
    
    // Добавляем обработчики событий для чекбоксов
    container.querySelectorAll('.oiv-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', applyFiltersFromUI);
    });
}

function showError(message) {
    const statusArea = document.getElementById('status-area');
    if (statusArea) {
        statusArea.innerHTML = `<div class="status-message status-error">${message}</div>`;
    }
    console.error(message);
}		

function showSuccess(message) {
    const statusArea = document.getElementById('status-area');
    if (statusArea) {
        statusArea.innerHTML = `<div class="status-message status-success">${message}</div>`;
    }
    console.log(message);
}

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
        .catch(error => {
            console.error('Error loading data:', error);
            showError('Ошибка загрузки данных. Проверьте консоль для подробностей.');
        });
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
    
    // Очищаем контейнеры таблиц, если они существуют
    const themesContent = document.getElementById('themes-table-content');
    const objectsContent = document.getElementById('objects-table-content');
    const parametersContent = document.getElementById('parameters-table-content');
    const indicatorsContent = document.getElementById('indicators-table-content');
    
    if (themesContent) themesContent.innerHTML = '';
    if (objectsContent) objectsContent.innerHTML = '';
    if (parametersContent) parametersContent.innerHTML = '';
    if (indicatorsContent) indicatorsContent.innerHTML = '';
    
    // Создаем таблицы
    createThemesTable(data, themesContent);
    createObjectsTable(data, objectsContent);
    createParametersTable(data, parametersContent);
    createIndicatorsTable(data, indicatorsContent);
}

function createFilters(data) {
    // Получаем уникальные темы
    const themes = [...new Set(data.edges.map(edge => edge.theme))];
    const themesFilterContent = document.querySelector('#themes-filter .filter-dropdown-content');
    
    if (themesFilterContent) {
        themesFilterContent.innerHTML = '';
        
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
            themesFilterContent.appendChild(div);
        });
    }
    
    // Получаем уникальные OIV (объединенные источники и цели)
    const allOIVs = new Set();
    data.edges.forEach(edge => {
        allOIVs.add(edge.source);
        allOIVs.add(edge.target);
    });
    
    const oivFilterContent = document.querySelector('#oiv-filter .filter-dropdown-content');
    
    if (oivFilterContent) {
        oivFilterContent.innerHTML = '';
        
        allOIVs.forEach(oivId => {
            const oiv = data.oiv.find(oiv => oiv.id === oivId);
            if (oiv) {
                const div = document.createElement('div');
                div.className = 'filter-checkbox';
                
                const label = document.createElement('label');
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.value = oivId;
                input.className = 'oiv-checkbox';
                
                label.appendChild(input);
                label.appendChild(document.createTextNode(oiv.name));
                div.appendChild(label);
                oivFilterContent.appendChild(div);
            }
        });
    }
    
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
        themeHeader.style.backgroundColor = '#444';
        themeHeader.style.border = '1px solid #555';
        themeHeader.style.marginTop = '10px';
        themeHeader.style.borderRadius = '4px';
        themeHeader.style.display = 'flex';
        themeHeader.style.alignItems = 'center';
        themeHeader.style.justifyContent = 'space-between';
        
        const themeTitle = document.createElement('h4');
        themeTitle.textContent = `Тема: ${theme}`;
        themeTitle.style.margin = '0';
        themeTitle.style.color = '#FFFFFF';
        
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'toggle-icon';
        toggleIcon.textContent = '+';
        toggleIcon.style.fontWeight = 'bold';
        toggleIcon.style.fontSize = '16px';
        toggleIcon.style.color = '#cccccc';
        
        themeHeader.appendChild(themeTitle);
        themeHeader.appendChild(toggleIcon);
        themeContainer.appendChild(themeHeader);
        
        // Контейнер для содержимого темы (изначально скрыт)
        const themeContent = document.createElement('div');
        themeContent.className = 'theme-content';
        themeContent.style.display = 'none';
        themeContent.style.padding = '10px';
        themeContent.style.border = '1px solid #555';
        themeContent.style.borderTop = 'none';
        themeContent.style.borderRadius = '0 0 4px 4px';
        themeContent.style.backgroundColor = '#333';
        
        // Создаем таблицу
        const table = document.createElement('table');
        table.className = 'dashboard-table';
        table.style.width = '100%';
        
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
        themeHeader.style.backgroundColor = '#444';
        themeHeader.style.border = '1px solid #555';
        themeHeader.style.marginTop = '10px';
        themeHeader.style.borderRadius = '4px';
        themeHeader.style.display = 'flex';
        themeHeader.style.alignItems = 'center';
        themeHeader.style.justifyContent = 'space-between';
        
        const themeTitle = document.createElement('h4');
        themeTitle.textContent = `Тема: ${theme}`;
        themeTitle.style.margin = '0';
        themeTitle.style.color = '#FFFFFF';
        
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'toggle-icon';
        toggleIcon.textContent = '+';
        toggleIcon.style.fontWeight = 'bold';
        toggleIcon.style.fontSize = '16px';
        toggleIcon.style.color = '#cccccc';
        
        themeHeader.appendChild(themeTitle);
        themeHeader.appendChild(toggleIcon);
        themeContainer.appendChild(themeHeader);
        
        // Контейнер для содержимого темы (изначально скрыт)
        const themeContent = document.createElement('div');
        themeContent.className = 'theme-content';
        themeContent.style.display = 'none';
        themeContent.style.padding = '10px';
        themeContent.style.border = '1px solid #555';
        themeContent.style.borderTop = 'none';
        themeContent.style.borderRadius = '0 0 4px 4px';
        themeContent.style.backgroundColor = '#333';
        
        // Создаем таблицу
        const table = document.createElement('table');
        table.className = 'dashboard-table';
        table.style.width = '100%';
        
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
            oivDataCell.innerHTML = obj.info_type === 1 ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(oivDataCell);
            
            const aiDataCell = document.createElement('td');
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
        themeHeader.style.backgroundColor = '#444';
        themeHeader.style.border = '1px solid #555';
        themeHeader.style.marginTop = '10px';
        themeHeader.style.borderRadius = '4px';
        themeHeader.style.display = 'flex';
        themeHeader.style.alignItems = 'center';
        themeHeader.style.justifyContent = 'space-between';
        
        const themeTitle = document.createElement('h4');
        themeTitle.textContent = `Тема: ${theme}`;
        themeTitle.style.margin = '0';
        themeTitle.style.color = '#FFFFFF';
        
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'toggle-icon';
        toggleIcon.textContent = '+';
        toggleIcon.style.fontWeight = 'bold';
        toggleIcon.style.fontSize = '16px';
        toggleIcon.style.color = '#cccccc';
        
        themeHeader.appendChild(themeTitle);
        themeHeader.appendChild(toggleIcon);
        themeContainer.appendChild(themeHeader);
        
        // Контейнер для содержимого темы (изначально скрыт)
        const themeContent = document.createElement('div');
        themeContent.className = 'theme-content';
        themeContent.style.display = 'none';
        themeContent.style.padding = '10px';
        themeContent.style.border = '1px solid #555';
        themeContent.style.borderTop = 'none';
        themeContent.style.borderRadius = '0 0 4px 4px';
        themeContent.style.backgroundColor = 'transparent';
        
        // Создаем таблицу
        const table = document.createElement('table');
        table.className = 'dashboard-table';
        table.style.width = '100%';
        
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
            oivDataCell.innerHTML = param.info_type === 1 ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(oivDataCell);
            
            const aiDataCell = document.createElement('td');
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
        container.innerHTML = '<p>Нет данных о показателях для выбранных фильтры</p>';
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
        themeHeader.style.backgroundColor = '#444';
        themeHeader.style.border = '1px solid #555';
        themeHeader.style.marginTop = '10px';
        themeHeader.style.borderRadius = '4px';
        themeHeader.style.display = 'flex';
        themeHeader.style.alignItems = 'center';
        themeHeader.style.justifyContent = 'space-between';
        
        const themeTitle = document.createElement('h4');
        themeTitle.textContent = `Тема: ${theme}`;
        themeTitle.style.margin = '0';
        themeTitle.style.color = '#FFFFFF';
        
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'toggle-icon';
        toggleIcon.textContent = '+';
        toggleIcon.style.fontWeight = 'bold';
        toggleIcon.style.fontSize = '16px';
        toggleIcon.style.color = '#cccccc';
        
        themeHeader.appendChild(themeTitle);
        themeHeader.appendChild(toggleIcon);
        themeContainer.appendChild(themeHeader);
        
        // Контейнер для содержимого темы (изначально скрыт)
        const themeContent = document.createElement('div');
        themeContent.className = 'theme-content';
        themeContent.style.display = 'none';
        themeContent.style.padding = '10px';
        themeContent.style.border = '1px solid #555';
        themeContent.style.borderTop = 'none';
        themeContent.style.borderRadius = '0 0 4px 4px';
        themeContent.style.backgroundColor = 'transparent';
        
        // Создаем таблицу
        const table = document.createElement('table');
        table.className = 'dashboard-table';
        table.style.width = '100%';
        
        // Создаем заголовок таблицы
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        const nameHeader = document.createElement('th');
        nameHeader.textContent = 'Наименование показателя';
        headerRow.appendChild(nameHeader);
        
        const parameterHeader = document.createElement('th');
        parameterHeader.textContent = 'Параметр';
        headerRow.appendChild(parameterHeader);
        
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
        
        themeIndicators.forEach(indicator => {
            const row = document.createElement('tr');
            
            const nameCell = document.createElement('td');
            nameCell.textContent = indicator.indicator_name;
            row.appendChild(nameCell);
            
            const parameterCell = document.createElement('td');
            const parameter = parametersData.find(param => param.parameter_id === indicator.parameter_id);
            parameterCell.textContent = parameter ? parameter.parameter_name : 'Неизвестный параметр';
            row.appendChild(parameterCell);
            
            const oivCell = document.createElement('td');
            const oiv = data.oiv.find(o => o.id === indicator.oiv_id);
            oivCell.textContent = oiv ? oiv.name : 'Неизвестный орган';
            row.appendChild(oivCell);
            
            const oivDataCell = document.createElement('td');
            oivDataCell.innerHTML = indicator.info_type === 1 ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(oivDataCell);
            
            const aiDataCell = document.createElement('td');
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

function exportDashboardToExcel(data) {
    if (!data || !data.edges || data.edges.length === 0) {
        showError('Нет данных для экспорта');
        return;
    }
    
    try {
        // Создаем новую книгу
        const wb = XLSX.utils.book_new();
        
        // Создаем лист для связей
        const edgesData = data.edges.map(edge => {
            const sourceOIV = data.oiv.find(oiv => oiv.id === edge.source);
            const targetOIV = data.oiv.find(oiv => oiv.id === edge.target);
            
            return {
                'Тема': edge.theme,
                'Орган власти (Источник)': sourceOIV ? sourceOIV.name : edge.source,
                'Орган власти (Цель)': targetOIV ? targetOIV.name : edge.target,
                'Наименование связи': edge.label || ''
            };
        });
        
        const edgesWS = XLSX.utils.json_to_sheet(edgesData);
        XLSX.utils.book_append_sheet(wb, edgesWS, 'Связи');
        
        // Добавляем лист для объектов управления, если есть данные
        if (objectsData && objectsData.length > 0) {
            const objectsWS = XLSX.utils.json_to_sheet(objectsData.map(obj => {
                const oiv = data.oiv.find(o => o.id === obj.oiv_id);
                return {
                    'Тема': obj.theme,
                    'Наименование объекта': obj.object_name,
                    'Орган власти': oiv ? oiv.name : obj.oiv_id,
                    'Данные ОИВ': obj.info_type === 1 ? 'Да' : 'Нет',
                    'Данные ИИ': (obj.info_type === 2 || obj.AI_object_id !== null) ? 'Да' : 'Нет'
                };
            }));
            XLSX.utils.book_append_sheet(wb, objectsWS, 'Объекты управления');
        }
        
        // Добавляем лист для параметров, если есть данные
        if (parametersData && parametersData.length > 0) {
            const parametersWS = XLSX.utils.json_to_sheet(parametersData.map(param => {
                const oiv = data.oiv.find(o => o.id === param.oiv_id);
                const object = objectsData.find(obj => obj.object_id === param.object_id);
                return {
                    'Тема': param.theme,
                    'Наименование параметра': param.parameter_name,
                    'Объект управления': object ? object.object_name : param.object_id,
                    'Орган власти': oiv ? oiv.name : param.oiv_id,
                    'Данные ОИВ': param.info_type === 1 ? 'Да' : 'Нет',
                    'Данные ИИ': (param.info_type === 2 || param.AI_parameter_id !== null) ? 'Да' : 'Нет'
                };
            }));
            XLSX.utils.book_append_sheet(wb, parametersWS, 'Параметры');
        }
        
        // Добавляем лист для показателей, если есть данные
        if (indicatorsData && indicatorsData.length > 0) {
            const indicatorsWS = XLSX.utils.json_to_sheet(indicatorsData.map(indicator => {
                const oiv = data.oiv.find(o => o.id === indicator.oiv_id);
                const parameter = parametersData.find(param => param.parameter_id === indicator.parameter_id);
                return {
                    'Тема': indicator.theme,
                    'Наименование показателя': indicator.indicator_name,
                    'Параметр': parameter ? parameter.parameter_name : indicator.parameter_id,
                    'Орган власти': oiv ? oiv.name : indicator.oiv_id,
                    'Данные ОИВ': indicator.info_type === 1 ? 'Да' : 'Нет',
                    'Данные ИИ': (indicator.info_type === 2 || indicator.AI_indicator_id !== null) ? 'Да' : 'Нет'
                };
            }));
            XLSX.utils.book_append_sheet(wb, indicatorsWS, 'Показатели');
        }
        
        // Сохраняем файл
        const fileName = `Детализация_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showSuccess('Экспорт успешно завершен');
    } catch (error) {
        console.error('Ошибка при экспорте в Excel:', error);
        showError('Ошибка при экспорте в Excel. Проверьте консоль для подробностей.');
    }
}