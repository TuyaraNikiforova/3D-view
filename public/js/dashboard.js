let currentData = null;
let objectsData = null;
let parametersData = null;
let indicatorsData = null;
let availableThemes = [];
let availableOIVs = [];

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
    
    // Добавляем обработчики для фильтры
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
        max-width: 800px;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    modalContent.innerHTML = `
        <h2 style="margin-top: 0; color: #4a6da7;">Фильтры</h2>
        
        <!-- Вкладки -->
        <div class="tabs" style="display: flex; border-bottom: 1px solid #555; margin-bottom: 20px;">
            <button class="tab-btn active" data-tab="selected" style="padding: 10px 20px; background: none; border: none; color: #4a6da7; cursor: pointer; border-bottom: 2px solid #4a6da7;">
                Выбранные фильтры
            </button>
            <button class="tab-btn" data-tab="all" style="padding: 10px 20px; background: none; border: none; color: #ccc; cursor: pointer;">
                Все фильтры
            </button>
        </div>
        
        <!-- Контент вкладки "Выбранные фильтры" -->
        <div id="tab-selected" class="tab-content" style="display: block;">
            <div class="filter-section">
                <h3>Темы</h3>
                <div class="search-container" style="margin-bottom: 10px;">
                    <input type="text" id="themes-search-selected" placeholder="Поиск по темам..." 
                           style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #555; background-color: #333; color: white;">
                </div>
                <div id="modal-themes-filter-selected" class="modal-filter-content" style="max-height: 200px; overflow-y: auto;"></div>
            </div>
            
            <div class="filter-section" style="margin-top: 20px;">
                <h3>Органы власти</h3>
                <div class="search-container" style="margin-bottom: 10px;">
                    <input type="text" id="oiv-search-selected" placeholder="Поиск по органам власти..." 
                           style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #555; background-color: #333; color: white;">
                </div>
                <div id="modal-oiv-filter-selected" class="modal-filter-content" style="max-height: 200px; overflow-y: auto;"></div>
            </div>
        </div>
        
        <!-- Контент вкладки "Все фильтры" -->
        <div id="tab-all" class="tab-content" style="display: none;">
            <div class="filter-section">
                <h3>Все темы</h3>
                <div class="search-container" style="margin-bottom: 10px;">
                    <input type="text" id="themes-search-all" placeholder="Поиск по темам..." 
                           style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #555; background-color: #333; color: white;">
                </div>
                <div id="modal-themes-filter-all" class="modal-filter-content" style="max-height: 200px; overflow-y: auto;"></div>
            </div>
            
            <div class="filter-section" style="margin-top: 20px;">
                <h3>Все органы власти</h3>
                <div class="search-container" style="margin-bottom: 10px;">
                    <input type="text" id="oiv-search-all" placeholder="Поиск по органам власти..." 
                           style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #555; background-color: #333; color: white;">
                </div>
                <div id="modal-oiv-filter-all" class="modal-filter-content" style="max-height: 200px; overflow-y: auto;"></div>
            </div>
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
    
    // Обработчики для вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Делаем все вкладки неактивными
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.style.color = '#ccc';
                b.style.borderBottom = 'none';
            });
            
            // Скрываем все контенты вкладок
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            // Активируем текущую вкладку
            this.style.color = '#4a6da7';
            this.style.borderBottom = '2px solid #4a6da7';
            
            // Показываем соответствующий контент
            const tabName = this.getAttribute('data-tab');
            document.getElementById(`tab-${tabName}`).style.display = 'block';
        });
    });
    
    // Добавляем обработчики для поиска на обеих вкладках
    document.getElementById('themes-search-selected').addEventListener('input', function(e) {
        filterCheckboxes('modal-themes-filter-selected', e.target.value);
    });
    
    document.getElementById('oiv-search-selected').addEventListener('input', function(e) {
        filterCheckboxes('modal-oiv-filter-selected', e.target.value);
    });
    
    document.getElementById('themes-search-all').addEventListener('input', function(e) {
        filterCheckboxes('modal-themes-filter-all', e.target.value);
    });
    
    document.getElementById('oiv-search-all').addEventListener('input', function(e) {
        filterCheckboxes('modal-oiv-filter-all', e.target.value);
    });
    
    // Закрытие модального окна при клике вне его
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            hideFiltersModal();
        }
    });
}

function filterCheckboxes(containerId, searchText) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const checkboxes = container.querySelectorAll('.filter-checkbox');
    const searchLower = searchText.toLowerCase();
    
    checkboxes.forEach(checkbox => {
        const label = checkbox.querySelector('label');
        const text = label.textContent.toLowerCase();
        if (text.includes(searchLower)) {
            checkbox.style.display = 'block';
        } else {
            checkbox.style.display = 'none';
        }
    });
}


function showFiltersModal() {
    const modal = document.getElementById('filters-modal');
    if (!modal) return;
    
    // Всегда обновляем данные при открытии модального окна
    loadFiltersData();
    
    // Очищаем поля поиска
    document.getElementById('themes-search-selected').value = '';
    document.getElementById('oiv-search-selected').value = '';
    document.getElementById('themes-search-all').value = '';
    document.getElementById('oiv-search-all').value = '';
    
    // Активируем первую вкладку
    document.querySelectorAll('.tab-btn').forEach((btn, index) => {
        if (index === 0) {
            btn.style.color = '#4a6da7';
            btn.style.borderBottom = '2px solid #4a6da7';
        } else {
            btn.style.color = '#ccc';
            btn.style.borderBottom = 'none';
        }
    });
    
    // Показываем только первую вкладку
    document.querySelectorAll('.tab-content').forEach((content, index) => {
        content.style.display = index === 0 ? 'block' : 'none';
    });
    
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
    // Загружаем все данные для фильтрации (не только отфильтрованные)
    fetch('/data/data.json')
        .then(res => res.json())
        .then(data => {
            // Получаем уникальные темы из всех данных
            availableThemes = [...new Set(data.edges.map(edge => edge.theme))];
            
            // Получаем все уникальные OIV из всех данных
            const allOIVs = new Set();
            data.edges.forEach(edge => {
                allOIVs.add(edge.source);
                allOIVs.add(edge.target);
            });
            
            availableOIVs = Array.from(allOIVs).map(oivId => {
                const oiv = data.oiv.find(o => o.id === oivId);
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
    // Получаем сохраненные фильтры
    const savedFilters = localStorage.getItem('dashboardFilters');
    const filters = savedFilters ? JSON.parse(savedFilters) : { themes: [], oivIds: [] };
    
    // Заполняем вкладку "Выбранные фильтры" - только те, что есть в текущих данных
    populateSelectedFiltersTab(filters);
    
    // Заполняем вкладку "Все фильтры" - все доступные темы и OIV
    populateAllFiltersTab(filters);
}

function populateSelectedFiltersTab(filters) {
    const themesContainer = document.getElementById('modal-themes-filter-selected');
    const oivContainer = document.getElementById('modal-oiv-filter-selected');
    
    if (!themesContainer || !oivContainer) return;
    
    // Очищаем контейнеры
    themesContainer.innerHTML = '';
    oivContainer.innerHTML = '';
    
    // Заполняем темы из текущих данных
    const currentThemes = currentData ? [...new Set(currentData.edges.map(edge => edge.theme))] : [];
    
    currentThemes.forEach(theme => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'filter-checkbox';
        
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = theme;
        input.className = 'modal-theme-checkbox selected';
        
        label.appendChild(input);
        label.appendChild(document.createTextNode(theme));
        checkboxDiv.appendChild(label);
        themesContainer.appendChild(checkboxDiv);
    });
    
    // Отображаем все ОИВ из текущих данных
    const currentOIVs = new Set();
    if (currentData && currentData.edges) {
        currentData.edges.forEach(edge => {
            currentOIVs.add(edge.source);
            currentOIVs.add(edge.target);
        });
    }
    
    Array.from(currentOIVs).forEach(oivId => {
        const oiv = currentData ? currentData.oiv.find(o => o.id === oivId) : null;
        if (oiv) {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'filter-checkbox';
            
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.value = oivId;
            input.className = 'modal-oiv-checkbox selected';
            
            label.appendChild(input);
            label.appendChild(document.createTextNode(oiv.name));
            checkboxDiv.appendChild(label);
            oivContainer.appendChild(checkboxDiv);
        }
    });
    
    // Применяем сохраненные фильтры
    if (filters.themes && filters.themes.length > 0) {
        document.querySelectorAll('.modal-theme-checkbox.selected').forEach(checkbox => {
            checkbox.checked = filters.themes.includes(checkbox.value);
        });
    }
    
    if (filters.oivIds && filters.oivIds.length > 0) {
        document.querySelectorAll('.modal-oiv-checkbox.selected').forEach(checkbox => {
            checkbox.checked = filters.oivIds.includes(checkbox.value);
        });
    }
}

function populateAllFiltersTab(filters) {
    const themesContainer = document.getElementById('modal-themes-filter-all');
    const oivContainer = document.getElementById('modal-oiv-filter-all');
    
    if (!themesContainer || !oivContainer) return;
    
    // Очищаем контейнеры
    themesContainer.innerHTML = '';
    oivContainer.innerHTML = '';
    
    // Заполняем все доступные темы
    availableThemes.forEach(theme => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'filter-checkbox';
        
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = theme;
        input.className = 'modal-theme-checkbox all';
        
        label.appendChild(input);
        label.appendChild(document.createTextNode(theme));
        checkboxDiv.appendChild(label);
        themesContainer.appendChild(checkboxDiv);
    });
    
    // Заполняем все доступные OIV
    availableOIVs.forEach(oiv => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'filter-checkbox';
        
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = oiv.id;
        input.className = 'modal-oiv-checkbox all';
        
        label.appendChild(input);
        label.appendChild(document.createTextNode(oiv.name));
        checkboxDiv.appendChild(label);
        oivContainer.appendChild(checkboxDiv);
    });
    
    // Применяем сохраненные фильтры
    if (filters.themes && filters.themes.length > 0) {
        document.querySelectorAll('.modal-theme-checkbox.all').forEach(checkbox => {
            checkbox.checked = filters.themes.includes(checkbox.value);
        });
    }
    
    if (filters.oivIds && filters.oivIds.length > 0) {
        document.querySelectorAll('.modal-oiv-checkbox.all').forEach(checkbox => {
            checkbox.checked = filters.oivIds.includes(checkbox.value);
        });
    }
}

function applyFiltersFromModal() {
    // Собираем выбранные фильтры из обеих вкладок
    const selectedThemesFromSelected = [...document.querySelectorAll('.modal-theme-checkbox.selected:checked')].map(cb => cb.value);
    const selectedOIVsFromSelected = [...document.querySelectorAll('.modal-oiv-checkbox.selected:checked')].map(cb => cb.value);
    
    const selectedThemesFromAll = [...document.querySelectorAll('.modal-theme-checkbox.all:checked')].map(cb => cb.value);
    const selectedOIVsFromAll = [...document.querySelectorAll('.modal-oiv-checkbox.all:checked')].map(cb => cb.value);
    
    // Объединяем фильтры из обеих вкладок
    const selectedThemes = [...new Set([...selectedThemesFromSelected, ...selectedThemesFromAll])];
    const selectedOIVs = [...new Set([...selectedOIVsFromSelected, ...selectedOIVsFromAll])];
    
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
}

function initializeFilters() {
    // Создаем выпадающие списки для фильтры
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
                this.querySelector('.toggle-icon').textContent = '-';
                
                // Заполняем список тем только при первом открытии
                if (themesContent.children.length === 0 && currentData) {
                    populateThemesDropdown(themesContent);
                }
            } else {
                themesContent.style.display = 'none';
                this.querySelector('.toggle-icon').textContent = '+';
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
                oivHeader.querySelector('.toggle-icon').textContent = '-';
                
                // Заполняем список OIV только при первом открытии
                if (oivContent.children.length === 0 && currentData) {
                    populateOIVDropdown(oivContent);
                }
            } else {
                oivContent.style.display = 'none';
                oivHeader.querySelector('.toggle-icon').textContent = '+';
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
            // Если фильтры пустые, используем все данные
            if ((!filters.themes || filters.themes.length === 0) && 
                (!filters.oivIds || filters.oivIds.length === 0)) {
                currentData = data;
                createDashboardLayout(data);
                createFilters(data);
            } else {
                // Фильтруем данные в соответствии с выбранными фильтрами
                const filteredData = applyFiltersToData(data, filters);
                if (shouldShowDashboard(filteredData, filters)) {
                    createDashboardLayout(filteredData);
                    createFilters(filteredData);
                    applySavedFiltersToUI(filters);
                } else {
                    showEmptyState();
                }
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
    // Если фильтры пустые, показываем все данные
    if ((!filters.themes || filters.themes.length === 0) && 
        (!filters.oivIds || filters.oivIds.length === 0)) {
        return data.oiv.length > 0;
    }
    
    // Если есть фильтры, проверяем, что есть отфильтрованные данные
    return data.oiv.length > 0;
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
    
    // Создаем таблицы, передавая текущие отфильтрованные данные
    createThemesTable(data, themesContent);
    createObjectsTable(data, objectsContent);
    createParametersTable(data, parametersContent); 
    createIndicatorsTable(data, indicatorsContent); 
}


function createFilters(data) {
    // Получаем уникальные темы
    const themes = [...new Set(data.edges.map(edge => edge.theme))];
    const themesFilterContent = document.querySelector('#thems-filter .filter-dropdown-content');
    
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
    // Очищаем все чекбоксы в модальном окне
    document.querySelectorAll('.modal-theme-checkbox, .modal-oiv-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Очищаем все чекбоксы в выпадающих списках (если они есть)
    document.querySelectorAll('.theme-checkbox, .oiv-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Очищаем localStorage
    localStorage.removeItem('dashboardFilters');
    
    // Загружаем все данные без фильтров
    loadAllDataWithoutFilters();
}

function loadAllDataWithoutFilters() {
    // Загружаем все данные без применения фильтров
    fetch('/data/data.json')
        .then(res => res.json())
        .then(data => {
            currentData = data;
            createDashboardLayout(data);
            createFilters(data);
        })
        .catch(error => {
            console.error('Error loading data:', error);
            showError('Ошибка загрузки данных. Проверьте консоль для подробностей.');
        });
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
    const filteredOIVs = savedFilters.oivIds || [];
    
    // Получаем уникальные темы, отфильтрованные если есть фильтры
    let themes = [...new Set(data.edges.map(edge => edge.theme))];
    if (filteredThemes.length > 0) {
        themes = themes.filter(theme => filteredThemes.includes(theme));
    }
    
    // Создаем таблицы для каждой темы
    themes.forEach(theme => {
        // Фильтруем связи по выбранной теме
        let themeEdges = data.edges.filter(edge => edge.theme === theme);
        
        // Фильтруем по выбранным источникам
        if (filteredOIVs.length > 0) {
            themeEdges = themeEdges.filter(edge => filteredOIVs.includes(edge.source));
        }
        
        // Если после фильтрации нет связей, пропускаем эту тему
        if (themeEdges.length === 0) {
            return;
        }
        
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
        themeContent.style.backgroundColor = '#2a2a2a';
        
        // Получаем уникальные source OIV для этой темы после фильтрации
        const sourceOIVs = [...new Set(themeEdges.map(edge => edge.source))];
        
        // Создаем таблицу для каждой source OIV
        sourceOIVs.forEach(sourceOIVId => {
            const sourceName = data.oiv.find(oiv => oiv.id === sourceOIVId)?.name || sourceOIVId;
            
            // Создаем заголовок для source OIV
            const sourceHeader = document.createElement('h4');
            sourceHeader.textContent = `Источник: ${sourceName}`;
            sourceHeader.style.color = '#4a6da7';
            sourceHeader.style.margin = '10px 0 5px 0';
            themeContent.appendChild(sourceHeader);

            // Создаем таблицу
            const table = document.createElement('table');
            table.className = 'dashboard-table';
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.marginBottom = '20px';
            
            // Создаем заголовок таблицы
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            headerRow.style.backgroundColor = '#4a6da7';
            headerRow.style.color = 'white';
            
            // Добавляем столбцы
            const numberHeader = document.createElement('th');
            numberHeader.textContent = '№';
            numberHeader.style.padding = '8px';
            numberHeader.style.border = '1px solid #555';
            numberHeader.style.width = '50px';
            headerRow.appendChild(numberHeader);
            
            const targetHeader = document.createElement('th');
            targetHeader.textContent = 'Целевой орган власти';
            targetHeader.style.padding = '8px';
            targetHeader.style.border = '1px solid #555';
            targetHeader.style.width = '300px';
            headerRow.appendChild(targetHeader);
            
            const detailsHeader = document.createElement('th');
            detailsHeader.textContent = 'Описание связи';
            detailsHeader.style.padding = '8px';
            detailsHeader.style.border = '1px solid #555';
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
                    row.style.backgroundColor = '#333';
                    row.style.borderBottom = '1px solid #555';
                    
                    // Добавляем ячейку с порядковым номером
                    const numberCell = document.createElement('td');
                    numberCell.textContent = rowNumber++;
                    numberCell.style.padding = '8px';
                    numberCell.style.border = '1px solid #555';
                    numberCell.style.color = '#cccccc';
                    row.appendChild(numberCell);
                    
                    // Ячейка с целевым органом власти
                    const targetCell = document.createElement('td');
                    targetCell.textContent = targetName;
                    targetCell.style.padding = '8px';
                    targetCell.style.border = '1px solid #555';
                    targetCell.style.color = '#cccccc';
                    row.appendChild(targetCell);
                    
                    // Ячейка с описанием связи
                    const detailsCell = document.createElement('td');
                    detailsCell.textContent = connection.label || connection.name || connection.description || 'Связь без названия';
                    detailsCell.style.padding = '8px';
                    detailsCell.style.border = '1px solid #555';
                    detailsCell.style.color = '#cccccc';
                    row.appendChild(detailsCell);
                                      
                    tbody.appendChild(row);
                });
            });
            
            table.appendChild(tbody);
            themeContent.appendChild(table);
        });
        
        themeContainer.appendChild(themeContent);
        
        // Обработчик для раскрытия/скрытия темы
        themeHeader.addEventListener('click', function() {
            if (themeContent.style.display === 'none') {
                themeContent.style.display = 'block';
                toggleIcon.textContent = '-';
            } else {
                themeContent.style.display = 'none';
                toggleIcon.textContent = '+';
            }
        });
        
        container.appendChild(themeContainer);
    });
}

function createObjectsTable(data, container) {
    if (!objectsData || objectsData.length === 0) {
        container.innerHTML = '<p>Нет данных для отображения</p>';
        return;
    }
    
    // Получаем сохраненные фильтры
    const savedFilters = JSON.parse(localStorage.getItem('dashboardFilters') || '{}');
    const selectedThemes = savedFilters.themes || [];
    const selectedOIVs = savedFilters.oivIds || [];
    
    // Применяем фильтры так же, как в разделе "темы"
    let filteredObjects = objectsData;
    
    // Фильтрация по темам
    if (selectedThemes.length > 0) {
        filteredObjects = filteredObjects.filter(obj => selectedThemes.includes(obj.theme));
    }
    
    // Фильтрация по органам власти
    if (selectedOIVs.length > 0) {
        filteredObjects = filteredObjects.filter(obj => selectedOIVs.includes(obj.oiv_id));
    }
    
    // Если после фильтрации нет объектов, показываем сообщение
    if (filteredObjects.length === 0) {
        container.innerHTML = '<p>Нет данных для отображения</p>';
        return;
    }
    
    // Получаем уникальные темы из отфильтрованных объектов
    let themes = [...new Set(filteredObjects.map(obj => obj.theme))];
    
    themes.forEach(theme => {
        // Фильтруем объекты по текущей теме
        const themeObjects = filteredObjects.filter(obj => obj.theme === theme);
        if (themeObjects.length === 0) return;
        
        // Создаем контейнер для таблицы объекта с возможностью раскрытия/скрытия
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
        themeContent.style.backgroundColor = '#2a2a2a';
        
        // Создаем таблицу
        const table = document.createElement('table');
        table.className = 'objects-table';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        
        // Создаем заголовок таблицы
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.style.backgroundColor = '#4a6da7';
        headerRow.style.color = 'white';
        
        // Добавляем столбцы
        const nameHeader = document.createElement('th');
        nameHeader.textContent = 'Наименование объекта управления';
        nameHeader.style.padding = '8px';
        nameHeader.style.border = '1px solid #555';
        nameHeader.style.width = '40%';
        headerRow.appendChild(nameHeader);
        
        const oivNameHeader = document.createElement('th');
        oivNameHeader.textContent = 'Орган власти';
        oivNameHeader.style.padding = '8px';
        oivNameHeader.style.border = '1px solid #555';
        oivNameHeader.style.width = '40%';
        headerRow.appendChild(oivNameHeader);
        
        const oivHeader = document.createElement('th');
        oivHeader.textContent = 'Данные ОИВ';
        oivHeader.style.padding = '8px';
        oivHeader.style.border = '1px solid #555';
        oivHeader.style.width = '10%';
        headerRow.appendChild(oivHeader);
        
        const aiHeader = document.createElement('th');
        aiHeader.textContent = 'Данные ИИ';
        aiHeader.style.padding = '8px';
        aiHeader.style.border = '1px solid #555';
        aiHeader.style.width = '10%';
        headerRow.appendChild(aiHeader);
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Создаем тело таблицы
        const tbody = document.createElement('tbody');
        
        // Получаем уникальные объекты по object_id и object_name
        const uniqueObjects = Array.from(new Set(themeObjects.map(obj => obj.object_id)))
            .map(id => {
                const obj = themeObjects.find(o => o.object_id === id);
                return {
                    id: obj.object_id,
                    name: obj.object_name,
                    ai_id: obj.AI_object_id,
                    info_type: obj.info_type,
                    oiv_id: obj.oiv_id
                };
            });
        
        uniqueObjects.forEach(obj => {
            const row = document.createElement('tr');
            row.style.backgroundColor = '#333';
            row.style.borderBottom = '1px solid #555';
            
            // Ячейка с названием объекта
            const nameCell = document.createElement('td');
            nameCell.textContent = obj.name;
            nameCell.style.padding = '8px';
            nameCell.style.border = '1px solid #555';
            nameCell.style.color = '#cccccc';
            row.appendChild(nameCell);
            
            // Ячейка с органом власти
            const oivNameCell = document.createElement('td');
            const oiv = data.oiv.find(o => o.id === obj.oiv_id);
            oivNameCell.textContent = oiv ? oiv.name : 'Неизвестный орган';
            oivNameCell.style.padding = '8px';
            oivNameCell.style.border = '1px solid #555';
            oivNameCell.style.color = '#cccccc';
            row.appendChild(oivNameCell);
            
            // Определяем наличие данных ОИВ
            let hasOIVData = false;
            // Определяем наличие данных ИИ
            let hasAIData = false;
            
            // 1. Если это объект ОИВ (info_type=1)
            if (obj.info_type === 1) {
                hasOIVData = true;
                
                // Если у него есть AI_object_id, значит есть данные ИИ
                if (obj.ai_id) {
                    hasAIData = true;
                }
            }
            // 2. Если это объект ИИ (info_type=2)
            else if (obj.info_type === 2) {
                hasAIData = true;
            }
            
            // Ячейка с данными ОИВ
            const oivCell = document.createElement('td');
            oivCell.style.textAlign = 'center';
            oivCell.style.padding = '8px';
            oivCell.style.border = '1px solid #555';
            oivCell.style.color = '#cccccc';
            oivCell.innerHTML = hasOIVData ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(oivCell);
            
            // Ячейка с данными ИИ
            const aiCell = document.createElement('td');
            aiCell.style.textAlign = 'center';
            aiCell.style.padding = '8px';
            aiCell.style.border = '1px solid #555';
            aiCell.style.color = '#cccccc';
            aiCell.innerHTML = hasAIData ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(aiCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        themeContent.appendChild(table);
        themeContainer.appendChild(themeContent);
        
        // Обработчик для раскрытия/скрытия темы
        themeHeader.addEventListener('click', function() {
            if (themeContent.style.display === 'none') {
                themeContent.style.display = 'block';
                toggleIcon.textContent = '-';
            } else {
                themeContent.style.display = 'none';
                toggleIcon.textContent = '+';
            }
        });
        
        container.appendChild(themeContainer);
    });
}

function createParametersTable(data, container) {
    if (!parametersData || parametersData.length === 0) {
        container.innerHTML = '<p>Нет данных для отображения</p>';
        return;
    }
    
    // Получаем сохраненные фильтры
    const savedFilters = JSON.parse(localStorage.getItem('dashboardFilters') || '{}');
    const selectedThemes = savedFilters.themes || [];
    const selectedOIVs = savedFilters.oivIds || [];
    
    // Применяем фильтры так же, как в разделе "темы"
    let filteredParameters = parametersData;
    
    // Фильтрация по темам
    if (selectedThemes.length > 0) {
        filteredParameters = filteredParameters.filter(param => selectedThemes.includes(param.theme));
    }
    
    // Фильтрация по органам власти (через объекты)
    if (selectedOIVs.length > 0) {
        // Сначала находим все object_id, которые принадлежат выбранным OIV
        const filteredObjectIds = objectsData
            .filter(obj => selectedOIVs.includes(obj.oiv_id))
            .map(obj => obj.object_id);
        
        // Затем фильтруем параметры по этим object_id
        filteredParameters = filteredParameters.filter(param => 
            filteredObjectIds.includes(param.object_id));
    }
    
    // Если после фильтрации нет параметров, показываем сообщение
    if (filteredParameters.length === 0) {
        container.innerHTML = '<p>Нет данных для отображения</p>';
        return;
    }
    
    // Получаем уникальные темы из отфильтрованных параметров
    let themes = [...new Set(filteredParameters.map(param => param.theme))];
    
    // Собираем все AI_object_id для фильтрации (если нужно)
    const aiObjectIds = new Set(
        objectsData
            .filter(obj => obj.AI_object_id)
            .map(obj => obj.AI_object_id)
    );
    
    themes.forEach(theme => {
        // Фильтруем параметры по текущей теме
        const themeParameters = filteredParameters.filter(param => param.theme === theme);
        if (themeParameters.length === 0) return;
        
        // Создаем контейнер для таблицы параметра с возможностью раскрытия/скрытия
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
        themeContent.style.backgroundColor = '#2a2a2a';
               
        // Создаем таблицу
        const table = document.createElement('table');
        table.className = 'parameters-table';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        
        // Создаем заголовок таблицы
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.style.backgroundColor = '#4a6da7';
        headerRow.style.color = 'white';
        
        // Добавляем столбцы
        const nameHeader = document.createElement('th');
        nameHeader.textContent = 'Наименование параметра';
        nameHeader.style.padding = '8px';
        nameHeader.style.border = '1px solid #555';
        headerRow.appendChild(nameHeader);
        
        const objectHeader = document.createElement('th');
        objectHeader.textContent = 'Объект управления';
        objectHeader.style.padding = '8px';
        objectHeader.style.border = '1px solid #555';
        headerRow.appendChild(objectHeader);
        
        const oivNameHeader = document.createElement('th');
        oivNameHeader.textContent = 'Орган власти';
        oivNameHeader.style.padding = '8px';
        oivNameHeader.style.border = '1px solid #555';
        headerRow.appendChild(oivNameHeader);
        
        const oivHeader = document.createElement('th');
        oivHeader.textContent = 'Данные ОИВ';
        oivHeader.style.padding = '8px';
        oivHeader.style.border = '1px solid #555';
        headerRow.appendChild(oivHeader);
        
        const aiHeader = document.createElement('th');
        aiHeader.textContent = 'Данные ИИ';
        aiHeader.style.padding = '8px';
        aiHeader.style.border = '1px solid #555';
        headerRow.appendChild(aiHeader);
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Создаем тело таблицы
        const tbody = document.createElement('tbody');
        
        // Собираем все AI_parameter_id для фильтрации
        const aiParameterIds = new Set(
            parametersData
                .filter(param => param.AI_parameter_id)
                .map(param => param.AI_parameter_id)
        );
        
        // Группируем параметры по названию и объекту
        const groupedParameters = {};
        themeParameters.forEach(param => {
            // Пропускаем параметры, которые являются AI-версиями других параметров
            if (aiParameterIds.has(param.parameter_id)) {
                return;
            }
            
            // Пропускаем параметры, чьи object_id есть в aiObjectIds (если нужно)
            // if (aiObjectIds.has(param.object_id)) {
            //     return;
            // }
            
            const key = `${param.parameter_name}_${param.object_id}`;
            if (!groupedParameters[key]) {
                groupedParameters[key] = {
                    parameter_name: param.parameter_name,
                    object_id: param.object_id,
                    hasOIVData: false,
                    hasAIData: false
                };
            }
            
            if (param.info_type === 1) {
                groupedParameters[key].hasOIVData = true;
                // Если у параметра с info_type=1 есть AI_parameter_id, отмечаем и hasAIData
                if (param.AI_parameter_id) {
                    groupedParameters[key].hasAIData = true;
                }
            }
            if (param.info_type === 2) {
                groupedParameters[key].hasAIData = true;
            }
        });
        
        // Добавляем строки в таблицу
        Object.values(groupedParameters).forEach(param => {
            const row = document.createElement('tr');
            row.style.backgroundColor = '#333';
            row.style.borderBottom = '1px solid #555';
            
            // Ячейка с названием параметра
            const nameCell = document.createElement('td');
            nameCell.textContent = param.parameter_name;
            nameCell.style.padding = '8px';
            nameCell.style.border = '1px solid #555';
            nameCell.style.color = '#cccccc';
            row.appendChild(nameCell);
            
            // Ячейка с объектом управления - находим объект по object_id в objectsData
            const objectCell = document.createElement('td');
            const object = objectsData.find(obj => obj.object_id === param.object_id);
            objectCell.textContent = object ? object.object_name : `Неизвестный объект (ID: ${param.object_id})`;
            objectCell.style.padding = '8px';
            objectCell.style.border = '1px solid #555';
            objectCell.style.color = '#cccccc';
            row.appendChild(objectCell);
            
            // Ячейка с органом власти
            const oivNameCell = document.createElement('td');
            const oiv = object ? data.oiv.find(o => o.id === object.oiv_id) : null;
            oivNameCell.textContent = oiv ? oiv.name : 'Неизвестный орган';
            oivNameCell.style.padding = '8px';
            oivNameCell.style.border = '1px solid #555';
            oivNameCell.style.color = '#cccccc';
            row.appendChild(oivNameCell);
            
            // Ячейка с данными ОИВ
            const oivCell = document.createElement('td');
            oivCell.style.textAlign = 'center';
            oivCell.style.padding = '8px';
            oivCell.style.border = '1px solid #555';
            oivCell.style.color = '#cccccc';
            oivCell.innerHTML = param.hasOIVData ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(oivCell);
            
            // Ячейка с данными ИИ
            const aiCell = document.createElement('td');
            aiCell.style.textAlign = 'center';
            aiCell.style.padding = '8px';
            aiCell.style.border = '1px solid #555';
            aiCell.style.color = '#cccccc';
            aiCell.innerHTML = param.hasAIData ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(aiCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        themeContent.appendChild(table);
        themeContainer.appendChild(themeContent);
        
        // Обработчик для раскрытия/скрытия темы
        themeHeader.addEventListener('click', function() {
            if (themeContent.style.display === 'none') {
                themeContent.style.display = 'block';
                toggleIcon.textContent = '-';
            } else {
                themeContent.style.display = 'none';
                toggleIcon.textContent = '+';
            }
        });
        
        container.appendChild(themeContainer);
    });
}

function createIndicatorsTable(data, container) {
    if (!indicatorsData || indicatorsData.length === 0) {
        container.innerHTML = '<p>Нет данных для отображения</p>';
        return;
    }
    
    // Получаем сохраненные фильтры
    const savedFilters = JSON.parse(localStorage.getItem('dashboardFilters') || '{}');
    const selectedThemes = savedFilters.themes || [];
    const selectedOIVs = savedFilters.oivIds || [];
    
    // Применяем фильтры так же, как в разделе "темы"
    let filteredIndicators = indicatorsData;
    
    // Фильтрация по темам
    if (selectedThemes.length > 0) {
        filteredIndicators = filteredIndicators.filter(ind => selectedThemes.includes(ind.theme));
    }
    
    // Фильтрация по органам власти
    if (selectedOIVs.length > 0) {
        filteredIndicators = filteredIndicators.filter(ind => selectedOIVs.includes(ind.oiv_id));
    }
    
    // Если после фильтрации нет показателей, показываем сообщение
    if (filteredIndicators.length === 0) {
        container.innerHTML = '<p>Нет данных для отображения</p>';
        return;
    }
    
    // Получаем уникальные темы из отфильтрованных показателей
    let themes = [...new Set(filteredIndicators.map(ind => ind.theme))];
    
    // Остальной код функции остается без изменений, но используем filteredIndicators вместо indicatorsData
    themes.forEach(theme => {
        // Фильтруем показатели по текущей теме
        const themeIndicators = filteredIndicators.filter(ind => ind.theme === theme);
        if (themeIndicators.length === 0) return;
        
        // Создаем контейнер для таблицы показателя с возможностью раскрытия/скрытия
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
        themeContent.style.backgroundColor = '#2a2a2a';
        
        // Создаем таблицу
        const table = document.createElement('table');
        table.className = 'indicators-table';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        
        // Создаем заголовок таблицы
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.style.backgroundColor = '#4a6da7';
        headerRow.style.color = 'white';
        
        // Добавляем столбцы
        const nameHeader = document.createElement('th');
        nameHeader.textContent = 'Наименование показателя';
        nameHeader.style.padding = '8px';
        nameHeader.style.border = '1px solid #555';
        nameHeader.style.width = '40%';
        headerRow.appendChild(nameHeader);
        
        const oivNameHeader = document.createElement('th');
        oivNameHeader.textContent = 'Орган власти';
        oivNameHeader.style.padding = '8px';
        oivNameHeader.style.border = '1px solid #555';
        oivNameHeader.style.width = '40%';
        headerRow.appendChild(oivNameHeader);
        
        const oivHeader = document.createElement('th');
        oivHeader.textContent = 'Данные ОИВ';
        oivHeader.style.padding = '8px';
        oivHeader.style.border = '1px solid #555';
        oivHeader.style.width = '10%';
        headerRow.appendChild(oivHeader);
        
        const aiHeader = document.createElement('th');
        aiHeader.textContent = 'Данные ИИ';
        aiHeader.style.padding = '8px';
        aiHeader.style.border = '1px solid #555';
        aiHeader.style.width = '10%';
        headerRow.appendChild(aiHeader);
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Создаем тело таблицы
        const tbody = document.createElement('tbody');
        
        // Группируем показатели по названию и AI_indicator_id
        const groupedIndicators = {};
        themeIndicators.forEach(ind => {
            const key = ind.AI_indicator_id ? ind.AI_indicator_id : ind.indicator_id;
            if (!groupedIndicators[key]) {
                groupedIndicators[key] = {
                    indicator_name: ind.indicator_name,
                    oiv_id: ind.oiv_id,
                    hasOIVData: false,
                    hasAIData: false
                };
            }
            
            if (ind.info_type === 1) {
                groupedIndicators[key].hasOIVData = true;
                // Если у показателя с info_type=1 есть AI_indicator_id, отмечаем и hasAIData
                if (ind.AI_indicator_id) {
                    groupedIndicators[key].hasAIData = true;
                }
            }
            if (ind.info_type === 2) {
                groupedIndicators[key].hasAIData = true;
            }
        });
        
        // Добавляем строки в таблицу
        Object.values(groupedIndicators).forEach(ind => {
            const row = document.createElement('tr');
            row.style.backgroundColor = '#333';
            row.style.borderBottom = '1px solid #555';
            
            // Ячейка с названием показателя
            const nameCell = document.createElement('td');
            nameCell.textContent = ind.indicator_name;
            nameCell.style.padding = '8px';
            nameCell.style.border = '1px solid #555';
            nameCell.style.color = '#cccccc';
            row.appendChild(nameCell);
            
            // Ячейка с органом власти
            const oivNameCell = document.createElement('td');
            const oiv = data.oiv.find(o => o.id === ind.oiv_id);
            oivNameCell.textContent = oiv ? oiv.name : 'Неизвестный орган';
            oivNameCell.style.padding = '8px';
            oivNameCell.style.border = '1px solid #555';
            oivNameCell.style.color = '#cccccc';
            row.appendChild(oivNameCell);
            
            // Ячейка с данными ОИВ
            const oivCell = document.createElement('td');
            oivCell.style.textAlign = 'center';
            oivCell.style.padding = '8px';
            oivCell.style.border = '1px solid #555';
            oivCell.style.color = '#cccccc';
            oivCell.innerHTML = ind.hasOIVData ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(oivCell);
            
            // Ячейка с данными ИИ
            const aiCell = document.createElement('td');
            aiCell.style.textAlign = 'center';
            aiCell.style.padding = '8px';
            aiCell.style.border = '1px solid #555';
            aiCell.style.color = '#cccccc';
            aiCell.innerHTML = ind.hasAIData ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(aiCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        themeContent.appendChild(table);
        themeContainer.appendChild(themeContent);
        
        // Обработчик для раскрытия/скрытия темы
        themeHeader.addEventListener('click', function() {
            if (themeContent.style.display === 'none') {
                themeContent.style.display = 'block';
                toggleIcon.textContent = '-';
            } else {
                themeContent.style.display = 'none';
                toggleIcon.textContent = '+';
            }
        });
        
        container.appendChild(themeContainer);
    });
}

function exportDashboardToExcel(data) {
    if (!data || !data.edges || data.edges.length === 0) {
        showError('Нет данных для экспорта');
        return;
    }
    
    try {
        // Получаем сохраненные фильтры
        const savedFilters = JSON.parse(localStorage.getItem('dashboardFilters') || '{}');
        const selectedThemes = savedFilters.themes || [];
        const selectedOIVs = savedFilters.oivIds || [];
        
        // Создаем новую книгу
        const wb = XLSX.utils.book_new();
        
        // Фильтруем данные связей
        let filteredEdges = data.edges;
        
        // Применяем фильтры тем
        if (selectedThemes.length > 0) {
            filteredEdges = filteredEdges.filter(edge => selectedThemes.includes(edge.theme));
        }
        
        // Применяем фильтры OIV
        if (selectedOIVs.length > 0) {
            filteredEdges = filteredEdges.filter(edge => 
                selectedOIVs.includes(edge.source) || selectedOIVs.includes(edge.target));
        }
        
        // Создаем лист для связей (только отфильтрованные)
        const edgesData = filteredEdges.map(edge => {
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
        
        // Фильтруем данные объектов
        let filteredObjects = objectsData || [];
        if (selectedThemes.length > 0) {
            filteredObjects = filteredObjects.filter(obj => selectedThemes.includes(obj.theme));
        }
        if (selectedOIVs.length > 0) {
            filteredObjects = filteredObjects.filter(obj => selectedOIVs.includes(obj.oiv_id));
        }
        
        // Добавляем лист для объектов управления (только отфильтрованные)
        if (filteredObjects.length > 0) {
            const objectsWS = XLSX.utils.json_to_sheet(filteredObjects.map(obj => {
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
        
        // Фильтруем данные параметров
        let filteredParameters = parametersData || [];
        if (selectedThemes.length > 0) {
            filteredParameters = filteredParameters.filter(param => selectedThemes.includes(param.theme));
        }
        if (selectedOIVs.length > 0) {
            // Фильтрация параметров через объекты
            const filteredObjectIds = objectsData
                .filter(obj => selectedOIVs.includes(obj.oiv_id))
                .map(obj => obj.object_id);
            
            filteredParameters = filteredParameters.filter(param => 
                filteredObjectIds.includes(param.object_id));
        }
        
        // Добавляем лист для параметров (только отфильтрованные)
        if (filteredParameters.length > 0) {
            const parametersWS = XLSX.utils.json_to_sheet(filteredParameters.map(param => {
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
        
        // Фильтруем данные показателей
        let filteredIndicators = indicatorsData || [];
        if (selectedThemes.length > 0) {
            filteredIndicators = filteredIndicators.filter(ind => selectedThemes.includes(ind.theme));
        }
        if (selectedOIVs.length > 0) {
            filteredIndicators = filteredIndicators.filter(ind => selectedOIVs.includes(ind.oiv_id));
        }
        
        // Добавляем лист для показателей (только отфильтрованные)
        if (filteredIndicators.length > 0) {
            const indicatorsWS = XLSX.utils.json_to_sheet(filteredIndicators.map(indicator => {
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