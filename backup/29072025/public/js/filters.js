function createFilterModal() {
    window.currentFilters = {
        complexes: [],
        oiv: [],
        themes: [],
        strategies: [],
        programs: [],
        projects: []
    };
    
    const modal = document.createElement('div');
    modal.className = 'filter-modal';
    modal.innerHTML = `
        <div class="filter-modal-content">
            <div class="filter-modal-header">
                <div class="filter-modal-title">
                    <span class="filter-group-icon"></span>
                    <span id="modal-title">Фильтры</span>
                </div>
                <button class="filter-modal-close">&times;</button>
            </div>
            <div class="filter-modal-search-container">
                <input type="text" id="modal-search-input" placeholder="Поиск..." class="filter-modal-search">
            </div>
            <div class="filter-modal-body" id="modal-filter-container"></div>
            <div class="filter-modal-footer">
                <button class="filter-modal-btn reset">Сбросить</button>
                <button class="filter-modal-btn apply">Применить</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Добавим стили для поиска в CSS (можно добавить в style.css)
    const style = document.createElement('style');
    style.textContent = `
        .filter-modal-search-container {
            padding: 0.5rem 1.5rem;
            background-color: rgba(40, 40, 40, 0.9);
            position: sticky;
            top: 0;
            z-index: 10;
        }
        
        .filter-modal-search {
            width: 100%;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            border: none;
            background: rgba(60, 60, 60, 0.9);
            color: #e0e0e0;
            font-size: 14px;
            outline: none;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        
        .filter-modal-search:focus {
            box-shadow: 0 1px 5px rgba(74, 109, 167, 0.7);
        }
        
        .modal-filter-item.hidden {
            display: none;
        }
    `;
    document.head.appendChild(style);
    
    // Обработчик поиска
    const searchInput = modal.querySelector('#modal-search-input');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const filterItems = modal.querySelectorAll('.modal-filter-item');
        
        filterItems.forEach(item => {
            const label = item.querySelector('label');
            if (label) {
                const text = label.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            }
        });
        
        // Пересчитываем высоту контейнера для корректного отображения скролла
        const container = modal.querySelector('#modal-filter-container');
        container.style.height = 'auto';
        container.style.height = container.scrollHeight + 'px';
    });
    
    // Функция для сброса поиска
    const resetSearch = () => {
        searchInput.value = '';
        const filterItems = modal.querySelectorAll('.modal-filter-item');
        filterItems.forEach(item => item.classList.remove('hidden'));
    };
    
    // Обработчики событий для закрытия модального окна
    const closeModal = () => {
        modal.style.display = 'none';
        resetSearch(); // Сбрасываем поиск при закрытии
    };
    
    modal.querySelector('.filter-modal-close').addEventListener('click', closeModal);
    
    // Обработчик для кнопки "Сбросить"
	modal.querySelector('.filter-modal-btn.reset').addEventListener('click', () => {
		// Сбрасываем все чекбоксы в модальном окне
		modal.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
			checkbox.checked = false;
		});
		
		// Сбрасываем текущие фильтры для этого типа
		const filterType = modal.dataset.filterType;
		if (window.currentFilters && window.currentFilters[filterType]) {
			window.currentFilters[filterType] = [];
		}
		
		// Обновляем счетчик
		updateFilterCount(modal.dataset.containerId, 0);
		
		// Вызываем соответствующие функции сброса в 3D сцене
		if (filterType === 'complex' && window.resetSelection) {
			window.resetSelection();
		} else if (filterType === 'oiv' && window.selectOIV) {
			window.selectOIV([]);
		} else if (filterType === 'theme' && window.selectTheme) {
			window.selectTheme([]);
		}
	});
    
    // Обработчик для кнопки "Применить"
    modal.querySelector('.filter-modal-btn.apply').addEventListener('click', () => {
        // Сохраняем выбранные фильтры
        const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
        const filterType = modal.dataset.filterType;
        const containerId = modal.dataset.containerId;
        
        // Обновляем текущие фильтры
        currentFilters[filterType] = Array.from(checkboxes).map(cb => cb.value);
        
        // Сначала снимаем все выделения в этой группе
        document.querySelectorAll(`#${containerId} input[type="checkbox"]`).forEach(cb => {
            cb.checked = false;
        });
        
        // Затем отмечаем выбранные в модальном окне
        checkboxes.forEach(cb => {
            const originalCheckbox = document.querySelector(`#${containerId} input[value="${cb.value}"]`);
            if (originalCheckbox) {
                originalCheckbox.checked = true;
            }
        });
        
        // Обновляем счетчик выбранных фильтров
        updateFilterCount(containerId, checkboxes.length);
        
        // Применяем фильтры
        applyFilters();
        closeModal();
        
        // Явно вызываем соответствующие функции выделения
        if (filterType === 'complex') {
            const selectedComplexes = Array.from(checkboxes).map(cb => cb.value);
            if (window.updateSelectedComplexes) {
                window.updateSelectedComplexes(selectedComplexes);
            }
        } else if (filterType === 'oiv') {
            const selectedOIV = Array.from(checkboxes).map(cb => cb.value);
            if (window.selectOIV) {
                window.selectOIV(selectedOIV);
            }
        } else if (filterType === 'theme') {
            const selectedThemes = Array.from(checkboxes).map(cb => cb.value);
            if (window.selectTheme) {
                window.selectTheme(selectedThemes);
            }
        }
    });
    
    // Закрытие при клике вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    return modal;
}

// Функция для обновления счетчика выбранных фильтров
function updateFilterCount(containerId, count) {
    const filterGroup = document.querySelector(`#${containerId}`).closest('.filter-group');
    if (filterGroup) {
        const header = filterGroup.querySelector('h3');
        if (header) {
            // Удаляем старый счетчик, если он есть
            const oldCounter = header.querySelector('.filter-counter');
            if (oldCounter) {
                oldCounter.remove();
            }
            
            // Добавляем новый счетчик, если есть выбранные фильтры
            if (count > 0) {
                const counter = document.createElement('span');
                counter.className = 'filter-counter';
                counter.textContent = ` (${count})`;
                counter.style.marginLeft = '8px';
                counter.style.color = '#4a6da7';
                header.appendChild(counter);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Элементы фильтров
    const searchInput = document.getElementById('global-search');
    const filterForm = document.getElementById('filter-form');
    const resetFiltersBtn = document.getElementById('back-btn');
    const showOnlyConnectionsCheckbox = document.getElementById('show-only-connections'); // Новый чекбокс
    
    // Контейнеры для фильтров
    const complexFiltersContainer = document.getElementById('complex-filters');
    const oivFiltersContainer = document.getElementById('oiv-filters');
    const themeFiltersContainer = document.getElementById('theme-filters');
    const strategyFiltersContainer = document.getElementById('strategy-filters');
    const programFiltersContainer = document.getElementById('program-filters');
    const projectFiltersContainer = document.getElementById('project-filters');
    const filterGroups = document.querySelectorAll('.filter-group');
    
    let currentData = {};
    let showOnlyConnections = false; // Флаг для новой фильтрации
    
    // Обработчик изменения чекбокса
    if (showOnlyConnectionsCheckbox) {
        showOnlyConnectionsCheckbox.addEventListener('change', function() {
            showOnlyConnections = this.checked;
            applyFilters();
        });
    }
    
    // Загрузка данных
    async function loadData() {
        const response = await fetch('/data/data.json');
        currentData = await response.json();
        initFilters(currentData);
    }
    
    // Инициализация фильтров
    function initFilters(data) {
        // Очищаем контейнеры
        complexFiltersContainer.innerHTML = '';
        oivFiltersContainer.innerHTML = '';
        themeFiltersContainer.innerHTML = '';
        strategyFiltersContainer.innerHTML = '';
        programFiltersContainer.innerHTML = '';
        projectFiltersContainer.innerHTML = '';        
        
        filterGroups.forEach(group => {
            const header = group.querySelector('h3');
            if (header) {
                // Создаем контейнер для заголовка и кнопки
                const headerContainer = document.createElement('div');
                headerContainer.className = 'filter-group-header';
                
                // Переносим содержимое заголовка в новый контейнер
                const titleContainer = document.createElement('div');
                titleContainer.className = 'filter-group-title';
                while (header.firstChild) {
                    titleContainer.appendChild(header.firstChild);
                }
                
                // Создаем кнопку сброса
                const resetBtn = document.createElement('button');
                resetBtn.className = 'filter-reset-btn';
                resetBtn.title = 'Сбросить фильтры этой группы';
                resetBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                `;
                
                // Добавляем обработчик сброса
                resetBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const containerId = header.nextElementSibling.id;
                    resetFilterGroup(containerId);
                });
                
                // Собираем новый заголовок
                headerContainer.appendChild(titleContainer);
                headerContainer.appendChild(resetBtn);
                header.appendChild(headerContainer);
                
                header.style.cursor = 'pointer';
                
                // Остальной код обработчика клика по заголовку остается без изменений
                header.addEventListener('click', function(e) {
                    // Проверяем, был ли клик по кнопке сброса
                    if (e.target.closest('.filter-reset-btn')) {
                        return;
                    }

                    const filterType = this.nextElementSibling.id.replace('-filters', '');
                    const modal = document.querySelector('.filter-modal') || createFilterModal();
                    
                    // Устанавливаем заголовок модального окна
                    modal.querySelector('#modal-title').textContent = this.textContent.trim();
                    modal.dataset.filterType = filterType;
                    modal.dataset.containerId = this.nextElementSibling.id;
                    
                    // Заполняем модальное окно фильтрами с учетом текущих фильтров
                    const filterContainer = modal.querySelector('#modal-filter-container');
                    filterContainer.innerHTML = '';
                    
                    // Получаем отфильтрованные данные на основе текущих фильтров
                    // Переносим currentFilters в глобальную область видимости
                    const filteredData = getFilteredData(currentData, window.currentFilters || {
                        complexes: [],
                        oiv: [],
                        themes: [],
                        strategies: [],
                        programs: [],
                        projects: []
                    }, filterType);
                    
                    // Копируем фильтры из основной панели в модальное окно
                    const filters = group.querySelectorAll('.filter-item');
                    filters.forEach(filter => {
                        const checkbox = filter.querySelector('input[type="checkbox"]');
                        const label = filter.querySelector('label');
                        
                        if (checkbox && label) {
                            // Проверяем, должен ли этот элемент быть видимым с учетом текущих фильтров
                            const shouldShow = shouldDisplayFilterItem(checkbox, filteredData, filterType);
                            
                            if (shouldShow) {
                                const modalItem = document.createElement('div');
                                modalItem.className = 'modal-filter-item';
                                
                                const newCheckbox = document.createElement('input');
                                newCheckbox.type = 'checkbox';
                                newCheckbox.id = `modal-${checkbox.id}`;
                                newCheckbox.value = checkbox.value;
                                newCheckbox.dataset.type = checkbox.dataset.type;
                                newCheckbox.checked = checkbox.checked;
                                
                                const newLabel = document.createElement('label');
                                newLabel.htmlFor = newCheckbox.id;
                                newLabel.innerHTML = label.innerHTML;
                                
                                modalItem.appendChild(newCheckbox);
                                modalItem.appendChild(newLabel);
                                filterContainer.appendChild(modalItem);
                            }
                        }
                    });
                    
                    modal.style.display = 'flex';
                });
                
                // Скрываем содержимое группы по умолчанию
                header.nextElementSibling.style.display = 'none';
            }
        });
    
        // Фильтры по комплексам
        data.complexes.forEach(complex => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `complex-${complex.id}`;
            checkbox.name = 'complexes';
            checkbox.value = complex.id;
            checkbox.dataset.type = 'complex';
            
            const label = document.createElement('label');
            label.htmlFor = `complex-${complex.id}`;
            label.innerHTML = `
                <span class="filter-color" style="background-color: ${complex.color};"></span>
                ${complex.name}
            `;
            
            const div = document.createElement('div');
            div.className = 'filter-item';
            div.appendChild(checkbox);
            div.appendChild(label);
            
            complexFiltersContainer.appendChild(div);
        });
        
        // Фильтры по ОИВ (органам власти)
        if (data.oiv && Array.isArray(data.oiv)) {
            console.log('Total OIV in data:', data.oiv.length); // Логируем количество ОИВ
            
            const sortedOIV = [...data.oiv].sort((a, b) => a.name.localeCompare(b.name));
            console.log('Sorted OIV to display:', sortedOIV); // Логируем ОИВ перед созданием фильтров
            
            sortedOIV.forEach(oiv => {
                if (!oiv.id || !oiv.name) {
                    console.warn('Invalid OIV data:', oiv);
                    return;
                }
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `oiv-${oiv.id}`;
                checkbox.name = 'oiv';
                checkbox.value = oiv.id;
                checkbox.dataset.type = 'oiv';
                
                const label = document.createElement('label');
                label.htmlFor = `oiv-${oiv.id}`;
                label.textContent = oiv.name;
                
                const div = document.createElement('div');
                div.className = 'filter-item';
                div.appendChild(checkbox);
                div.appendChild(label);
                
                oivFiltersContainer.appendChild(div);
            });
            
            console.log('Created OIV filters:', oivFiltersContainer.children.length); // Логируем количество созданных фильтров
        } else {
            console.error('Invalid OIV data structure:', data.oiv);
        }        
        
        // Фильтры по темам
        const themes = [...new Set(data.edges.map(edge => edge.theme))];
        const themeCounts = {};
        data.edges.forEach(edge => {
            themeCounts[edge.theme] = (themeCounts[edge.theme] || 0) + 1;
        });
        
        themes.forEach(theme => {
            const themeObj = data.themes.find(t => t.id === theme);
            const color = themeObj ? themeObj.color : '#999999';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `theme-${theme.replace(/\s+/g, '-')}`;
            checkbox.name = 'themes';
            checkbox.value = theme;
            checkbox.dataset.type = 'theme';
            
            const label = document.createElement('label');
            label.htmlFor = `theme-${theme.replace(/\s+/g, '-')}`;
            label.innerHTML = `
                <span class="filter-color" style="background-color: ${color};"></span>
                ${theme} <span class="count">(${themeCounts[theme] || 0})</span>
            `;
            
            const div = document.createElement('div');
            div.className = 'filter-item';
            div.appendChild(checkbox);
            div.appendChild(label);
            
            themeFiltersContainer.appendChild(div);
        });
        
        // Фильтры по стратегиям
        data.strategies.forEach(strategy => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `strategy-${strategy.id}`;
            checkbox.name = 'strategies';
            checkbox.value = strategy.id;
            checkbox.dataset.type = 'strategy';
            
            const label = document.createElement('label');
            label.htmlFor = `strategy-${strategy.id}`;
            label.innerHTML = `
                <span class="filter-color" style="background-color: ${strategy.color};"></span>
                ${strategy.name}
            `;
            
            const div = document.createElement('div');
            div.className = 'filter-item';
            div.appendChild(checkbox);
            div.appendChild(label);
            
            strategyFiltersContainer.appendChild(div);
        });
        
        // Фильтры по программам
        data.programs.forEach(program => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `program-${program.id}`;
            checkbox.name = 'programs';
            checkbox.value = program.id;
            checkbox.dataset.type = 'program';
            
            const label = document.createElement('label');
            label.htmlFor = `program-${program.id}`;
            label.innerHTML = `
                <span class="filter-color" style="background-color: ${program.color};"></span>
                ${program.name}
            `;
            
            const div = document.createElement('div');
            div.className = 'filter-item';
            div.appendChild(checkbox);
            div.appendChild(label);
            
            programFiltersContainer.appendChild(div);
        });
        
        // Фильтры по проектам
        data.projects.forEach(project => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `project-${project.id}`;
            checkbox.name = 'projects';
            checkbox.value = project.id;
            checkbox.dataset.type = 'project';
            
            const label = document.createElement('label');
            label.htmlFor = `project-${project.id}`;
            label.innerHTML = `
                <span class="filter-color" style="background-color: ${project.color};"></span>
                ${project.name}
            `;
            
            const div = document.createElement('div');
            div.className = 'filter-item';
            div.appendChild(checkbox);
            div.appendChild(label);
            
            projectFiltersContainer.appendChild(div);
        });
        
        // Обработчики событий для фильтров
        document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', function(e) {
                e.stopPropagation();
                dispatchFilterChange(this);
                applyFilters();
            });
            
            // Удаляем обработчик клика на родительском элементе, чтобы избежать дублирования
            const parentItem = checkbox.closest('.filter-item');
            if (parentItem) {
                parentItem.style.cursor = 'pointer';
                parentItem.addEventListener('click', function(e) {
                    // Игнорируем клики по самому чекбоксу
                    if (e.target.tagName !== 'INPUT') {
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change'));
                    }
                });
            }
        });
        
        document.querySelectorAll('.filter-item input[name="complexes"]').forEach(checkbox => {
            checkbox.addEventListener('change', function(e) {
                e.stopPropagation();
                dispatchFilterChange(this);
                applyFilters();
                
                // Передаем все выбранные комплексы в 3D сцену
                const formData = new FormData(filterForm);
                const selectedComplexes = formData.getAll('complexes');
                if (window.updateSelectedComplexes) {
                    window.updateSelectedComplexes(selectedComplexes);
                }
            });
        });

        document.querySelectorAll('.filter-item input[name="oiv"]').forEach(checkbox => {
            checkbox.addEventListener('change', function(e) {
                e.stopPropagation();
                dispatchFilterChange(this);
                applyFilters();
                
                // Передаем все выбранные OIV в 3D сцену
                const formData = new FormData(filterForm);
                const selectedOIV = formData.getAll('oiv');
                if (window.selectOIV) {
                    window.selectOIV(selectedOIV);
                }
            });
        });
        
        document.querySelectorAll('.filter-item input[name="themes"]').forEach(checkbox => {
            checkbox.addEventListener('change', function(e) {
                e.stopPropagation();
                dispatchFilterChange(this);
                applyFilters();
                
                // Передаем все выбранные темы в 3D сцену
                const formData = new FormData(filterForm);
                const selectedThemes = formData.getAll('themes');
                if (window.selectTheme) {
                    window.selectTheme(selectedThemes);
                }
            });
        });
    }
    
    function getFilteredData(data, filters, currentFilterType) {
        // Создаем копию данных для фильтрации
        const filtered = JSON.parse(JSON.stringify(data));
        
        // Применяем все фильтры, кроме текущего
        Object.keys(filters).forEach(type => {
            if (type !== currentFilterType && filters[type].length > 0) {
                if (type === 'complexes') {
                    filtered.complexes = filtered.complexes.filter(complex => 
                        filters.complexes.includes(complex.id));
                    
                    filtered.oiv = filtered.oiv.filter(oiv => 
                        filters.complexes.includes(oiv.complex));
                } else if (type === 'oiv') {
                    filtered.oiv = filtered.oiv.filter(oiv => 
                        filters.oiv.includes(oiv.id));
                } else if (type === 'themes') {
                    filtered.edges = filtered.edges.filter(edge => 
                        filters.themes.includes(edge.theme));
                    
                    const themeOIVs = new Set();
                    filtered.edges.forEach(edge => {
                        themeOIVs.add(edge.source);
                        themeOIVs.add(edge.target);
                    });
                    
                    filtered.oiv = filtered.oiv.filter(oiv => 
                        themeOIVs.has(oiv.id) || 
                        (filters.complexes.length > 0 && filters.complexes.includes(oiv.complex)));
                }
                // Аналогично для других типов фильтров
            }
        });
        
        return filtered;
    }

    function shouldDisplayFilterItem(checkbox, filteredData, currentFilterType) {
        const value = checkbox.value;
        const type = checkbox.dataset.type;
        
        // Для текущего типа фильтра показываем все элементы
        if (type === currentFilterType) return true;
        
        // Для других типов проверяем наличие в отфильтрованных данных
        switch(type) {
            case 'complex':
                return filteredData.complexes.some(c => c.id === value);
            case 'oiv':
                return filteredData.oiv.some(o => o.id === value);
            case 'theme':
                return filteredData.edges.some(e => e.theme === value);
            case 'strategy':
                return filteredData.strategies.some(s => s.id === value);
            case 'program':
                return filteredData.programs.some(p => p.id === value);
            case 'project':
                return filteredData.projects.some(p => p.id === value);
            default:
                return true;
        }
    }
    
	function resetFilterGroup(containerId) {
		const container = document.getElementById(containerId);
		if (!container) return;
		
		// Сбрасываем все чекбоксы в этой группе
		container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
			checkbox.checked = false;
		});
		
		// Определяем тип фильтра по ID контейнера
		const filterType = containerId.replace('-filters', '');
		
		// Сбрасываем текущие фильтры только для этой группы
		if (window.currentFilters && window.currentFilters[filterType]) {
			window.currentFilters[filterType] = [];
		}
		
		// Обновляем счетчик
		updateFilterCount(containerId, 0);
		
		// Применяем фильтры
		applyFilters();
		
		// Вызываем соответствующие функции сброса в 3D сцене
		if (filterType === 'complex' && window.resetSelection) {
			window.resetSelection();
		} else if (filterType === 'oiv' && window.selectOIV) {
			window.selectOIV([]);
		} else if (filterType === 'theme' && window.selectTheme) {
			window.selectTheme([]);
		}
	}  
        
    // Отправка события изменения фильтра
    function dispatchFilterChange(checkbox) {
        const event = new CustomEvent('filterChange', {
            detail: {
                type: checkbox.dataset.type,
                id: checkbox.value,
                checked: checkbox.checked
            }
        });
        document.dispatchEvent(event);
    }
    
    // Применение фильтров
    function applyFilters() {
        const formData = new FormData(filterForm);
        const filters = {
            complexes: formData.getAll('complexes'),
            oiv: formData.getAll('oiv'),
            themes: formData.getAll('themes'),
            strategies: formData.getAll('strategies'),
            programs: formData.getAll('programs'),
            projects: formData.getAll('projects'),
            showOnlyConnections: showOnlyConnections
        };
        
        // Сохраняем выбранные комплексы в глобальную переменную
        window.selectedComplexIds = filters.complexes;
        
        const filteredData = filterData(currentData, filters);
        updateViews(filteredData, filters);
        
        // Обновляем кнопку "Назад"
        const resetFiltersBtn = document.getElementById('back-btn');
        if (resetFiltersBtn) {
            resetFiltersBtn.textContent = 'Сбросить фильтры';
            resetFiltersBtn.addEventListener('click', function() {
                filterForm.reset();
                // Сбрасываем все счетчики
                document.querySelectorAll('.filter-counter').forEach(counter => {
                    counter.remove();
                });
                applyFilters();
                // Сбрасываем выделение в 3D сцене
                if (window.resetSelection) {
                    window.resetSelection();
                }
                // Возвращаем камеру в исходное положение
                if (window.resetCameraPosition) {
                    window.resetCameraPosition();
                }
            });
        }
        
        // Явно вызываем функции выделения
        if (filters.oiv && filters.oiv.length > 0 && window.selectOIV) {
            window.selectOIV(filters.oiv);
        } else if (filters.themes && filters.themes.length > 0 && window.selectTheme) {
            window.selectTheme(filters.themes);
        } else if (filters.complexes && filters.complexes.length > 0 && window.updateSelectedComplexes) {
            window.updateSelectedComplexes(filters.complexes);
        } else {
            if (window.resetSelection) {
                window.resetSelection();
            }
        }
    }
    
    // Функция фильтрации данных
    function filterData(data, filters) {
        const filtered = JSON.parse(JSON.stringify(data));
        
        // Фильтрация по комплексам
        if (filters.complexes.length > 0) {
            filtered.complexes = filtered.complexes.filter(complex => 
                filters.complexes.includes(complex.id));
            
            filtered.oiv = filtered.oiv.filter(oiv => 
                filters.complexes.includes(oiv.complex));
        }
        
        // Фильтрация по ОИВ
        if (filters.oiv.length > 0) {
            filtered.oiv = filtered.oiv.filter(oiv => 
                filters.oiv.includes(oiv.id));
        }
        
        // Фильтрация по темам - обновленная логика
        if (filters.themes.length > 0) {
            filtered.edges = filtered.edges.filter(edge => 
                filters.themes.includes(edge.theme));
            
            // Находим все OIV, участвующие в связях с выбранными темами
            const themeOIVs = new Set();
            filtered.edges.forEach(edge => {
                themeOIVs.add(edge.source);
                themeOIVs.add(edge.target);
            });
            
            // Фильтруем OIV, оставляем только те, что участвуют в связях с выбранными темами
            filtered.oiv = filtered.oiv.filter(oiv => 
                themeOIVs.has(oiv.id) || 
                (filters.complexes.length > 0 && filters.complexes.includes(oiv.complex)));
            
            // Фильтруем комплексы, оставляем только те, к которым принадлежат отфильтрованные OIV
            const filteredComplexes = new Set(filtered.oiv.map(oiv => oiv.complex));
            filtered.complexes = filtered.complexes.filter(complex => 
                filteredComplexes.has(complex.id));
        }
        
        // Фильтрация по стратегиям
        if (filters.strategies.length > 0) {
            const strategyNames = filters.strategies.map(id => 
                data.strategies.find(s => s.id === id)?.name).filter(Boolean);
            
            filtered.oiv = filtered.oiv.filter(oiv => 
                oiv.strategies.some(strategy => strategyNames.includes(strategy)));
        }
        
        // Фильтрация по программам
        if (filters.programs.length > 0) {
            const programNames = filters.programs.map(id => 
                data.programs.find(p => p.id === id)?.name).filter(Boolean);
            
            filtered.oiv = filtered.oiv.filter(oiv => 
                oiv.programs.some(program => programNames.includes(program)));
        }
        
        // Фильтрация по проектам
        if (filters.projects.length > 0) {
            const projectNames = filters.projects.map(id => 
                data.projects.find(p => p.id === id)?.name).filter(Boolean);
            
            filtered.oiv = filtered.oiv.filter(oiv => 
                oiv.projects.some(project => projectNames.includes(project)));
        }
        
        // Новая фильтрация - показывать только связи между выбранными элементами
        if (filters.showOnlyConnections) {
            const selectedOIVs = filters.oiv.length > 0 ? filters.oiv : filtered.oiv.map(o => o.id);
            
            // Фильтруем связи, оставляем только те, где оба узла выбраны
            filtered.edges = filtered.edges.filter(edge => 
                selectedOIVs.includes(edge.source) && selectedOIVs.includes(edge.target));
        }
        
        return filtered;
    }
    
    // Обновление представлений
    function updateViews(data, filters) {
        if (window.update3DScene) {
            // Передаем как данные, так и фильтры
            window.update3DScene(data, filters);
        }
        if (window.updateTableView) {
            window.updateTableView(data);
        }
        if (window.updateDashboard) {
            window.updateDashboard(data);
        }
    }
    
    // Глобальный поиск
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        
        if (searchTerm.length < 2) {
            updateViews(currentData, {});
            return;
        }
        
        // Фильтрация данных
        const filteredData = filterDataBySearch(currentData, searchTerm);
        updateViews(filteredData, {});
    });
    
    // Функция фильтрации данных по поисковому запросу
    function filterDataBySearch(data, searchTerm) {
        if (!searchTerm) return data;
        
        const filtered = JSON.parse(JSON.stringify(data));
        
        // Фильтрация комплексов
        filtered.complexes = filtered.complexes.filter(complex => 
            complex.name.toLowerCase().includes(searchTerm));
        
        // Фильтрация ОИВ
        filtered.oiv = filtered.oiv.filter(oiv => 
            oiv.name.toLowerCase().includes(searchTerm));
        
        // Фильтрация тем
        filtered.edges = filtered.edges.filter(edge => 
            edge.theme.toLowerCase().includes(searchTerm) || 
            edge.label.toLowerCase().includes(searchTerm));
        
        // Фильтрация стратегий
        filtered.strategies = filtered.strategies.filter(strategy => 
            strategy.name.toLowerCase().includes(searchTerm));
        
        // Фильтрация программ
        filtered.programs = filtered.programs.filter(program => 
            program.name.toLowerCase().includes(searchTerm));
        
        // Фильтрация проектов
        filtered.projects = filtered.projects.filter(project => 
            project.name.toLowerCase().includes(searchTerm));
        
        return filtered;
    }
    
    // Обработчик кнопки "Назад"
    resetFiltersBtn.addEventListener('click', function() {
        filterForm.reset();
        applyFilters();
        // Сбрасываем выделение в 3D сцене
        if (window.resetSelection) {
            window.resetSelection();
        }
        // Возвращаем камеру в исходное положение
        if (window.resetCameraPosition) {
            window.resetCameraPosition();
        }
    });
    
    // Событие изменения размера окна
    window.addEventListener('resize', function() {
        if (window.onWindowResize) {
            window.onWindowResize();
        }
    });
    
    // Загрузка данных при старте
    loadData();
    
    function selectTheme(theme) {
        if (window.selectTheme) {
            window.selectTheme(theme);
        }
    }
    
    function selectComplex(complexId) {
        if (window.selectComplex) {
            window.selectComplex(complexId);
        }
    }
    
    // Экспорт функций для использования в других модулях
    window.applyFilters = applyFilters;
    window.filterData = filterData;
    window.updateViews = updateViews;
    window.selectTheme = selectTheme;
    window.selectComplex = selectComplex;
});