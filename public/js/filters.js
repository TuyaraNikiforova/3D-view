let selectedFilters = {
    complexes: [],
    oiv: [],
    themes: [],
    strategies: [],
    programs: [],
    projects: [],
    allData: []
};

let resetAllBtn = null;
let applyFilters; 
let filterModal = null; 
let currentData = {};
let showOnlyConnections = false;

function createFilterModal() {
    window.currentFilters = {
        complexes: [],
        oiv: [],
        themes: [],
        strategies: [],
        programs: [],
        projects: [],
        allData: []		
    };
    
	window.applyCascadeFilter = function(filterParams) {
		if (!filterParams) return;
		
		// Сбрасываем текущие фильтры только если функция resetSelection доступна
		if (window.resetSelection) {
			window.resetSelection();
		}
		
		// Обновляем selectedFilters
		selectedFilters = {
			complexes: filterParams.complexes || [],
			oiv: filterParams.oiv || [],
			themes: filterParams.themes || [],
			strategies: filterParams.strategies || [],
			programs: filterParams.programs || [],
			projects: filterParams.projects || [],
			allData: []
		};
		
		// Если нет фильтров, показываем все
		if (Object.values(filterParams).every(filter => 
			Array.isArray(filter) ? filter.length === 0 : !filter
		) && window.resetSelection) {
			window.resetSelection();
			return;
		}
		
		// Собираем все выбранные фильтры для применения
		const filtersToApply = {
			complexes: selectedFilters.complexes,
			oiv: selectedFilters.oiv,
			themes: selectedFilters.themes,
			strategies: selectedFilters.strategies,
			programs: selectedFilters.programs,
			showOnlyConnections: filterParams.showOnlyConnections || false
		};
		
		// Применяем все фильтры через единую функцию
		if (window.applyFilter) {
			window.applyFilter(filtersToApply);
		}
		
		// Обновляем UI фильтров
		if (window.updateFilterUI) {
			window.updateFilterUI();
		}
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
    
    const style = document.createElement('style');
    style.textContent = `
        .modal-section {
            margin-bottom: 20px;
            position: relative;
        }
        
        .modal-section h4 {
            margin: 10px 0;
            color: #4a6da7;
            border-bottom: 1px solid #4a6da7;
            padding-bottom: 5px;
        }
        
        .section-search-container {
            margin-bottom: 10px;
        }
        
        .section-search {
            width: 100%;
            padding: 0.5rem;
            border-radius: 4px;
            border: 1px solid #444;
            background: rgba(60, 60, 60, 0.9);
            color: #e0e0e0;
            font-size: 12px;
            outline: none;
        }
        
        .section-search:focus {
            border-color: #4a6da7;
            box-shadow: 0 0 3px rgba(74, 109, 167, 0.7);
        }
        
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
                item.classList.toggle('hidden', !text.includes(searchTerm));
            }
        });
    });
    
    // Функция для закрытия модального окна (делаем ее доступной)
    const closeModal = () => {
        modal.style.display = 'none';
        searchInput.value = '';
        modal.querySelectorAll('.modal-filter-item').forEach(item => item.classList.remove('hidden'));
    };
    
    // Сохраняем функцию в объекте modal для доступа извне
    modal.closeModal = closeModal;
    
    // Обработчики событий для закрытия модального окна
    modal.querySelector('.filter-modal-close').addEventListener('click', closeModal);
    
    // Обработчик для кнопки "Сбросить"
	modal.querySelector('.filter-modal-btn.reset').addEventListener('click', () => {
		// Сбрасываем все чекбоксы в модальном окне
		modal.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
			checkbox.checked = false;
		});
	});
   
    // Обработчик для кнопки "Применить"
	const applyButton = modal.querySelector('.filter-modal-btn.apply');	
	applyButton.addEventListener('click', () => {
		if (modal.dataset.filterType === 'allData') {
			// Код для расширенного фильтра (оставляем без изменений)
			const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
			selectedFilters.allData = Array.from(checkboxes).map(cb => cb.value);
			
			updateSelectedFiltersDisplay();
			applyFilters();
			closeModal();
			return;
		}		
		
		// ЗАКОММЕНТИРОВАТЬ ЭТУ СТРОКУ - НЕ СБРАСЫВАТЬ РАСШИРЕННЫЙ ФИЛЬТР
		// selectedFilters.allData = [];
		// updateSelectedFiltersDisplay();
		
		const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
		const filterType = modal.dataset.filterType;
		const containerId = modal.dataset.containerId;
		
		// Обновляем текущие фильтры
		window.currentFilters[filterType] = Array.from(checkboxes).map(cb => cb.value);
		
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
		} else if (filterType === 'strategy') {
			const selectedStrategies = Array.from(checkboxes).map(cb => cb.value);
			if (window.selectStrategy) {
				window.selectStrategy(selectedStrategies);
			}
		} else if (filterType === 'program') {
			const selectedPrograms = Array.from(checkboxes).map(cb => cb.value);
			if (window.selectProgram) {
				window.selectProgram(selectedPrograms);
			}
		}
	});
    
    // Закрытие при клике вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Сохраняем ссылку на модальное окно в глобальной переменной
    filterModal = modal;
    
    return modal;
}

function syncFilterStates() {
    const hasRegularFilters = selectedFilters.complexes.length > 0 || 
                             selectedFilters.oiv.length > 0 || 
                             selectedFilters.themes.length > 0 || 
                             selectedFilters.strategies.length > 0 || 
                             selectedFilters.programs.length > 0;
    
    const hasExtendedFilter = selectedFilters.allData.length > 0;
    
    // Обновляем счетчик расширенного фильтра
    updateExtendedFilterCounter();
    
    if (hasRegularFilters && hasExtendedFilter) {
        selectedFilters.allData = [];
        updateSelectedFiltersDisplay();
        updateExtendedFilterCounter();
        console.log('Filter conflict detected - resetting extended filter');
    }
    
    // Синхронизируем счетчики в зависимости от активного типа фильтра
    if (hasExtendedFilter) {
        // При активном расширенном фильтре показываем ВСЕ счетчики
        syncFilterCountersForExtendedFilter();
        
    } else if (hasRegularFilters) {
        let activeFilterType = null;
        if (selectedFilters.strategies.length > 0) activeFilterType = 'strategy';
        else if (selectedFilters.programs.length > 0) activeFilterType = 'program';
        else if (selectedFilters.themes.length > 0) activeFilterType = 'theme';
        else if (selectedFilters.oiv.length > 0) activeFilterType = 'oiv';
        else if (selectedFilters.complexes.length > 0) activeFilterType = 'complex';
        
        syncFilterCounters(activeFilterType);
        
    } else {
        // Нет активных фильтров - скрываем все счетчики
        document.querySelectorAll('.filter-counter').forEach(counter => {
            counter.style.display = 'none';
        });
    }
    
    const hasActiveFilters = hasRegularFilters || hasExtendedFilter;
    const resetAllBtn = document.getElementById('reset-all-filters');
    if (resetAllBtn) {
        resetAllBtn.disabled = !hasActiveFilters;
        resetAllBtn.classList.toggle('disabled', !hasActiveFilters);
    }
}

function createSectionWithSearch(title, type, items, selectedValues) {
    const section = document.createElement('div');
    section.className = 'modal-section';
    section.style.flex = '1';
    section.style.minWidth = '200px';
    
    const header = document.createElement('h4');
    header.textContent = title;
    section.appendChild(header);
    
    // Добавляем строку поиска для этой секции
    const searchContainer = document.createElement('div');
    searchContainer.className = 'section-search-container';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'section-search';
    searchInput.placeholder = `Поиск в ${title.toLowerCase()}...`;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const itemsInSection = section.querySelectorAll('.modal-filter-item');
        
        itemsInSection.forEach(item => {
            const label = item.querySelector('label');
            if (label) {
                const text = label.textContent.toLowerCase();
                item.classList.toggle('hidden', !text.includes(searchTerm));
            }
        });
    });
    
    searchContainer.appendChild(searchInput);
    section.appendChild(searchContainer);
    
    // Добавляем элементы
    items.forEach(item => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `modal-all-${type}-${item.id || item.replace(/\s+/g, '-')}`;
        checkbox.value = `${type}:${item.id || item}`;
        checkbox.checked = selectedValues && selectedValues.includes(`${type}:${item.id || item}`);
        
        const label = document.createElement('label');
        label.htmlFor = `modal-all-${type}-${item.id || item.replace(/\s+/g, '-')}`;
        
        if (item.color) {
            label.innerHTML = `
                <span class="filter-color" style="background-color: ${item.color};"></span>
                ${item.name || item}
            `;
        } else {
            label.textContent = item.name || item;
        }
        
        const itemElement = document.createElement('div');
        itemElement.className = 'modal-filter-item';
        itemElement.appendChild(checkbox);
        itemElement.appendChild(label);
        section.appendChild(itemElement);
    });
    
    return section;
}

function updateFilterCount(containerId, count) {
    const filterGroup = document.querySelector(`#${containerId}`)?.closest('.filter-group');
    if (filterGroup) {
        const header = filterGroup.querySelector('h3');
        if (header) {
            const oldCounter = header.querySelector('.filter-counter');
            if (oldCounter) oldCounter.remove();
            
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

function syncFilterCounters(activeFilterType = null) {
    // Скрываем все счетчики сначала
    document.querySelectorAll('.filter-counter').forEach(counter => {
        counter.style.display = 'none';
    });
    
    // Если указан активный тип фильтра, показываем только его счетчик
    if (activeFilterType) {
        const activeContainerId = `${activeFilterType}-filters`;
        const activeCounter = document.querySelector(`#${activeContainerId}`)?.closest('.filter-group')?.querySelector('.filter-counter');
        if (activeCounter) {
            activeCounter.style.display = 'inline';
        }
    } else {
        // Показываем все счетчики, если нет активного типа
        document.querySelectorAll('.filter-counter').forEach(counter => {
            counter.style.display = 'inline';
        });
    }
}

function updateExtendedFilterCounter() {
    const extendedFilterHeader = document.querySelector('.filter-group h3');
    if (!extendedFilterHeader) return;
    
    const oldCounter = extendedFilterHeader.querySelector('.filter-counter');
    if (oldCounter) oldCounter.remove();
    
    const count = selectedFilters.allData.length;
    if (count > 0) {
        const counter = document.createElement('span');
        counter.className = 'filter-counter';
        counter.textContent = ` (${count})`;
        counter.style.marginLeft = '8px';
        counter.style.color = '#4a6da7';
        extendedFilterHeader.appendChild(counter);
    }
}

function syncFilterCountersForExtendedFilter() {
    // Показываем ВСЕ счетчики при активном расширенном фильтре
    document.querySelectorAll('.filter-counter').forEach(counter => {
        counter.style.display = 'inline';
    });
    
    // Особенно убедимся, что счетчик расширенного фильтра виден
    const extendedCounter = document.querySelector('.filter-group h3')?.querySelector('.filter-counter');
    if (extendedCounter) {
        extendedCounter.style.display = 'inline';
    }
}

function updateSelectedFiltersDisplay() {
    const selectedFiltersContainer = document.getElementById('selected-all-data-filters');
    if (!selectedFiltersContainer) return;
    
    selectedFiltersContainer.innerHTML = '';
    
    // Проверяем, что currentData загружен
    if (selectedFilters.allData && selectedFilters.allData.length > 0 && currentData) {
        const selectedItems = selectedFilters.allData.map(item => {
            const [type, id] = item.split(':');
            let name = '';
            let displayName = '';
            
            switch(type) {
                case 'complex':
                    const complex = currentData.complexes?.find(c => c.id === id);
                    name = complex ? complex.name : id;
                    displayName = name;
                    break;
                case 'oiv':
                    const oiv = currentData.oiv?.find(o => o.id === id);
                    name = oiv ? oiv.name : id;
                    displayName = name;
                    break;
                case 'theme':
                    name = id;
                    const themeObj = currentData.themes?.find(t => t.id === id);
                    displayName = themeObj ? themeObj.name || id : id;
                    break;
                case 'strategy':
                    name = id;
                    displayName = id; // Стратегии обычно имеют текстовые названия
                    break;
                case 'program':
                    name = id;
                    displayName = id; // Программы обычно имеют текстовые названия
                    break;
                default:
                    name = id;
                    displayName = id;
            }
            
            return { type, id, name, displayName };
        }).filter(item => item.name); // Фильтруем элементы с пустыми именами
        
        // Группируем по типам
        const grouped = {};
        selectedItems.forEach(item => {
            if (!grouped[item.type]) grouped[item.type] = [];
            grouped[item.type].push(item);
        });
        
        Object.keys(grouped).forEach(type => {
            const typeTitle = document.createElement('div');
            typeTitle.textContent = getTypeLabel(type) + ':';
            typeTitle.style.fontWeight = 'bold';
            typeTitle.style.marginTop = '10px';
            typeTitle.style.color = '#4a6da7';
            selectedFiltersContainer.appendChild(typeTitle);
            
            grouped[type].forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.textContent = item.displayName;
                itemElement.style.marginLeft = '15px';
                itemElement.style.padding = '2px 0';
                itemElement.style.color = '#e0e0e0';
                selectedFiltersContainer.appendChild(itemElement);
            });
        });
    } else {
        selectedFiltersContainer.innerHTML = '<div style="color: #999; font-style: italic;">Фильтры не выбраны</div>';
    }
}
function updateResetButtonState() {
    const hasActiveFilters = selectedFilters.allData.length > 0 || 
        selectedFilters.complexes.length > 0 || 
        selectedFilters.oiv.length > 0 || 
        selectedFilters.themes.length > 0 || 
        selectedFilters.strategies.length > 0 || 
        selectedFilters.programs.length > 0;
    
    const resetAllBtn = document.getElementById('reset-all-filters');
    if (resetAllBtn) {
        resetAllBtn.disabled = !hasActiveFilters;
        resetAllBtn.classList.toggle('disabled', !hasActiveFilters);
    }
}

function groupExtendedFilterItems(selectedItems) {
    const grouped = {
        complexes: [],
        oiv: [],
        themes: [],
        strategies: [],
        programs: []
    };
    
    selectedItems.forEach(item => {
        if (item.includes(':')) {
            const [type, id] = item.split(':');
            if (grouped[type]) {
                grouped[type].push(id);
            }
        } else {
            if (currentData.complexes?.find(c => c.id === item)) grouped.complexes.push(item);
            else if (currentData.oiv?.find(o => o.id === item)) grouped.oiv.push(item);
            else if (currentData.themes?.find(t => t.id === item)) grouped.themes.push(item);
            else if (currentData.strategies?.includes(item)) grouped.strategies.push(item);
            else if (currentData.programs?.includes(item)) grouped.programs.push(item);
        }
    });
    
    return grouped;
}

window.resetAllFilters = function() {
    // Сбрасываем все чекбоксы
    document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Сбрасываем расширенный фильтр
    selectedFilters.allData = [];
    selectedFilters.complexes = [];
    selectedFilters.oiv = [];
    selectedFilters.themes = [];
    selectedFilters.strategies = [];
    selectedFilters.programs = [];
    
    updateSelectedFiltersDisplay();
    updateExtendedFilterCounter(); // ОБНОВИТЬ СЧЕТЧИК
    
    // Сбрасываем поиск
    const searchInput = document.getElementById('global-search');
    if (searchInput) searchInput.value = '';
    
    // Сбрасываем состояние в 3D сцене
    if (window.resetSelection) window.resetSelection();
    if (window.resetCameraPosition) window.resetCameraPosition();
    
    // Обновляем счетчики фильтров
    document.querySelectorAll('.filter-group').forEach(group => {
        const containerId = group.querySelector('.filter-container')?.id;
        if (containerId) {
            updateFilterCount(containerId, 0);
        }
    });
    
    // ОБНОВЛЯЕМ СОСТОЯНИЕ КНОПКИ СБРОСА
    updateResetButtonState();
    
    // Применяем изменения
    if (window.applyFilters) {
        window.applyFilters();
    }
};

function getTypeLabel(type) {
    const labels = {
        'complex': 'Комплексы',
        'oiv': 'Органы власти',
        'theme': 'Темы',
        'strategy': 'Стратегии',
        'program': 'Программы'
    };
    return labels[type] || type;
}

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('global-search');
    const filterForm = document.getElementById('filter-form');
    const resetFiltersBtn = document.getElementById('back-btn');
    const showOnlyConnectionsCheckbox = document.getElementById('show-only-connections');
    
    const complexFiltersContainer = document.getElementById('complex-filters');
    const oivFiltersContainer = document.getElementById('oiv-filters');
    const themeFiltersContainer = document.getElementById('theme-filters');
    const strategyFiltersContainer = document.getElementById('strategy-filters');
    const programFiltersContainer = document.getElementById('program-filters');
    const projectFiltersContainer = document.getElementById('project-filters');
    const filterGroups = document.querySelectorAll('.filter-group');
    const allDataContainer = document.getElementById('all-data-filters');
	
    let showOnlyConnections = false;
    
    if (showOnlyConnectionsCheckbox) {
        showOnlyConnectionsCheckbox.addEventListener('change', function() {
            showOnlyConnections = this.checked;
            applyFilters();
        });
    }
    
    async function loadData() {
        try {
            const responses = await Promise.all([
                fetch('/data/data.json').then(res => res.json()),
                fetch('/data/strategies.json').then(res => res.json()),
                fetch('/data/programs.json').then(res => res.json())
            ]);
            
            currentData = {
                ...responses[0], // data.json
                strategies: responses[1],
                programs: responses[2].filter(p => p.program_type === 0.0) // Фильтруем только program_type: 0.0
            };
            
            window.currentData = currentData; // Сохраняем для использования в других функциям
            initFilters(currentData);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    function initFilters(data) {
        if (complexFiltersContainer) complexFiltersContainer.innerHTML = '';
        if (oivFiltersContainer) oivFiltersContainer.innerHTML = '';
        if (themeFiltersContainer) themeFiltersContainer.innerHTML = '';
        if (strategyFiltersContainer) strategyFiltersContainer.innerHTML = '';
        if (programFiltersContainer) programFiltersContainer.innerHTML = '';
        if (projectFiltersContainer) projectFiltersContainer.innerHTML = '';     
		if (allDataContainer) allDataContainer.innerHTML = ''; 		

        // Создаем контейнер для группы "Все данные"
        const allDataGroup = document.createElement('div');
        allDataGroup.className = 'filter-group';
        
        const header = document.createElement('h3');
        header.textContent = 'Расширенный фильтр';
        header.style.cursor = 'pointer';
        
        const container = document.createElement('div');
        container.className = 'filter-container';
        container.id = 'all-data-container';
        container.style.display = 'none';
        
        // Добавляем отображение выбранных фильтров
        const selectedFiltersContainer = document.createElement('div');
        selectedFiltersContainer.id = 'selected-all-data-filters';
        selectedFiltersContainer.style.marginTop = '10px';
        container.appendChild(selectedFiltersContainer);
        
        // Добавляем элементы в группу
        allDataGroup.appendChild(header);
        allDataGroup.appendChild(container);
        
        // Добавляем группу "Все данные" в DOM после других фильтров
        const lastFilterGroup = document.querySelector('.filter-group:last-child');
        if (lastFilterGroup && lastFilterGroup.parentNode) {
            lastFilterGroup.parentNode.insertBefore(allDataGroup, lastFilterGroup.nextSibling);
        } else {
            // Fallback: если не нашли другие группы, добавляем в конец контейнера
            const filterForm = document.getElementById('filter-form');
            if (filterForm) {
                filterForm.appendChild(allDataGroup);
            }
        }

		function resetExtendedFilter() {
			selectedFilters.allData = [];
			updateSelectedFiltersDisplay();
			
			// Также сбрасываем обычные фильтры при сбросе расширенного
			document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
				checkbox.checked = false;
			});
			
			// Сбрасываем поиск
			const searchInput = document.getElementById('global-search');
			if (searchInput) searchInput.value = '';
			
			// Обновляем счетчики
			updateFilterCount('complex-filters', 0);
			updateFilterCount('oiv-filters', 0);
			updateFilterCount('theme-filters', 0);
			updateFilterCount('strategy-filters', 0);
			updateFilterCount('program-filters', 0);
			
			// Применяем сброс в 3D сцене
			if (window.resetSelection) window.resetSelection();
		}
		// Обработчик для заголовка "Расширенный фильтр"
		header.addEventListener('click', function(e) {
			let modal = document.querySelector('.filter-modal');
			if (!modal) {
				modal = createFilterModal();
			}
			modal.querySelector('#modal-title').textContent = 'Расширенный фильтр';
			modal.dataset.filterType = 'allData';
			
			const filterContainer = modal.querySelector('#modal-filter-container');
			filterContainer.innerHTML = '';
			
			// Создаем контейнер для горизонтального расположения
			const horizontalContainer = document.createElement('div');
			horizontalContainer.style.display = 'flex';
			horizontalContainer.style.flexWrap = 'wrap';
			horizontalContainer.style.gap = '20px';
			filterContainer.appendChild(horizontalContainer);
			
			// Секция комплексов с поиском
			const complexesSection = createSectionWithSearch(
				'Комплексы', 
				'complex', 
				data.complexes, 
				selectedFilters.allData
			);
			horizontalContainer.appendChild(complexesSection);
			
			// Секция ОИВ с поиском
			const sortedOIV = [...data.oiv].sort((a, b) => a.name.localeCompare(b.name));
			const oivSection = createSectionWithSearch(
				'Органы власти', 
				'oiv', 
				sortedOIV, 
				selectedFilters.allData
			);
			horizontalContainer.appendChild(oivSection);
			
			// Секция тем с поиском
			const themes = [...new Set(data.edges.map(edge => edge.theme))];
			const themeObjects = themes.map(theme => {
				const themeObj = data.themes.find(t => t.id === theme);
				return {
					id: theme,
					name: theme,
					color: themeObj ? themeObj.color : '#999999'
				};
			});
			
			const themesSection = createSectionWithSearch(
				'Темы', 
				'theme', 
				themeObjects, 
				selectedFilters.allData
			);
			horizontalContainer.appendChild(themesSection);
			
			// Секция стратегий с поиском
			if (data.strategies && Array.isArray(data.strategies)) {
				const strategyCounts = {};
				data.oiv.forEach(oiv => {
					if (oiv.strategies) {
						oiv.strategies.forEach(strategy => {
							strategyCounts[strategy] = (strategyCounts[strategy] || 0) + 1;
						});
					}
				});
				
				const strategyObjects = Object.keys(strategyCounts).sort().map(strategy => ({
					id: strategy,
					name: `${strategy} (${strategyCounts[strategy] || 0})`
				}));
				
				const strategiesSection = createSectionWithSearch(
					'Стратегии', 
					'strategy', 
					strategyObjects, 
					selectedFilters.allData
				);
				horizontalContainer.appendChild(strategiesSection);
			}
			
			// Секция программ с поиском
			if (data.programs && Array.isArray(data.programs)) {
				const programCounts = {};
				data.oiv.forEach(oiv => {
					if (oiv.programs) {
						oiv.programs.forEach(program => {
							programCounts[program] = (programCounts[program] || 0) + 1;
						});
					}
				});
				
				const programObjects = Object.keys(programCounts).sort().map(program => ({
					id: program,
					name: `${program} (${programCounts[program] || 0})`
				}));
				
				const programsSection = createSectionWithSearch(
					'Программы', 
					'program', 
					programObjects, 
					selectedFilters.allData
				);
				horizontalContainer.appendChild(programsSection);
			}
			
			modal.style.display = 'flex';
			
			// Убираем старый обработчик и добавляем новый
			const applyButton = modal.querySelector('.filter-modal-btn.apply');
			
			// Удаляем все предыдущие обработчики
			const newApplyButton = applyButton.cloneNode(true);
			applyButton.parentNode.replaceChild(newApplyButton, applyButton);

			// Обработчик для кнопки "Применить" в расширенном фильтре
			newApplyButton.addEventListener('click', function() {
				const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
				const selectedItems = Array.from(checkboxes).map(cb => cb.value);
				
				// Сохраняем выбранные элементы
				selectedFilters.allData = selectedItems;
				
				// Сбрасываем обычные фильтры при применении расширенного
				clearRegularFilters();
				
				console.log('Extended filter selected items:', selectedItems);
				
				// Применяем расширенный фильтр
				applyExtendedFilter(selectedItems);
				
				// Обновляем отображение выбранных фильтров
				updateSelectedFiltersDisplay();
				
				// ОБНОВЛЯЕМ ВСЕ СЧЕТЧИКИ
				const groupedFilters = groupExtendedFilterItems(selectedItems);
				updateFilterCount('complex-filters', groupedFilters.complexes.length);
				updateFilterCount('oiv-filters', groupedFilters.oiv.length);
				updateFilterCount('theme-filters', groupedFilters.themes.length);
				updateFilterCount('strategy-filters', groupedFilters.strategies.length);
				updateFilterCount('program-filters', groupedFilters.programs.length);
				
				// Обновляем кнопку сброса
				updateResetButtonState();
				
				// Закрываем модальное окно
				if (modal.closeModal) {
					modal.closeModal();
				}
			});
			
			updateExtendedFilterCounter();
		});
			
        // Вспомогательная функция для создания секции
        function createSection(title, type) {
            const section = document.createElement('div');
            section.className = 'modal-section';
            section.style.flex = '1';
            section.style.minWidth = '200px';
            
            const header = document.createElement('h4');
            header.textContent = title;
            section.appendChild(header);
            
            return section;
        }
       
        filterGroups.forEach(group => {
            const header = group.querySelector('h3');
            if (header) {
                const headerContainer = document.createElement('div');
                headerContainer.className = 'filter-group-header';
                
                const titleContainer = document.createElement('div');
                titleContainer.className = 'filter-group-title';
                while (header.firstChild) {
                    titleContainer.appendChild(header.firstChild);
                }
                
                headerContainer.appendChild(titleContainer);
                header.appendChild(headerContainer);
                
                header.style.cursor = 'pointer';
                
				header.addEventListener('click', function(e) {	
					const container = this.nextElementSibling;
					if (!container) return;
					
					const filterType = container.id.replace('-filters', '');
					let modal = document.querySelector('.filter-modal');
					if (!modal) {
						modal = createFilterModal();
					}
					
					modal.querySelector('#modal-title').textContent = this.textContent.trim();
					modal.dataset.filterType = filterType;
					modal.dataset.containerId = container.id;

					// ЗАКОММЕНТИРОВАТЬ ЭТУ СТРОКУ - НЕ СБРАСЫВАТЬ РАСШИРЕННЫЙ ФИЛЬТР ПРИ ОТКРЫТИИ МОДАЛЬНОГО ОКНА
					// selectedFilters.allData = [];
					// updateSelectedFiltersDisplay();
					
					const filterContainer = modal.querySelector('#modal-filter-container');
					filterContainer.innerHTML = '';
					
					// Получаем все элементы фильтра из соответствующего контейнера
					const filters = document.querySelectorAll(`#${container.id} .filter-item`);
					
					filters.forEach(filter => {
						const checkbox = filter.querySelector('input[type="checkbox"]');
						const label = filter.querySelector('label');
						
						if (checkbox && label) {
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
					});
					
					modal.style.display = 'flex';
				});
                
                if (header.nextElementSibling) {
                    header.nextElementSibling.style.display = 'none';
                }
            }
        });
    
        resetAllBtn = document.createElement('button');
        resetAllBtn.id = 'reset-all-filters';
        resetAllBtn.className = 'filter-reset-btn disabled';
        resetAllBtn.textContent = 'Сбросить все фильтры';
        resetAllBtn.title = 'Сбросить все примененные фильтры';
        resetAllBtn.disabled = true;

        resetAllBtn.addEventListener('click', function() {
            // Сбрасываем все фильтры
            document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            
            // Сбрасываем состояние в 3D сцене
            if (window.resetSelection) window.resetSelection();
            if (window.resetCameraPosition) window.resetCameraPosition();
            
            // Обновляем счетчики фильтров
            filterGroups.forEach(group => {
                const containerId = group.querySelector('.filter-container')?.id;
                if (containerId) {
                    updateFilterCount(containerId, 0);
                }
            });
            
            // Делаем кнопку неактивной
            this.classList.add('disabled');
            this.disabled = true;
            
            // Применяем изменения
            applyFilters();
        });

        if (filterForm) {
            filterForm.insertBefore(resetAllBtn, filterForm.firstChild);
        }

        const style = document.createElement('style');
        style.textContent = `
            #reset-all-filters {
                margin-bottom: 15px;
                padding: 8px 16px;
                background-color: #4a6da7;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
            }
            
            #reset-all-filters:hover:not(.disabled) {
                background-color: #3a5a8f;
            }
            
            #reset-all-filters.disabled {
                background-color: #cccccc;
                cursor: not-allowed;
                opacity: 0.7;
            }
        `;
        document.head.appendChild(style);	
        
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
            
            if (complexFiltersContainer) {
                complexFiltersContainer.appendChild(div);
            }
        });
        
        // Фильтры по ОИВ
        if (data.oiv && Array.isArray(data.oiv)) {
            const sortedOIV = [...data.oiv].sort((a, b) => a.name.localeCompare(b.name));
            
            sortedOIV.forEach(oiv => {
                if (!oiv.id || !oiv.name) return;
                
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
                
                if (oivFiltersContainer) {
                    oivFiltersContainer.appendChild(div);
                }
            });
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
            
            if (themeFiltersContainer) {
                themeFiltersContainer.appendChild(div);
            }
        });
        
        // Фильтры по стратегиям
        if (data.strategies && Array.isArray(data.strategies)) {
            const strategyCounts = {};
            data.oiv.forEach(oiv => {
                if (oiv.strategies) {
                    oiv.strategies.forEach(strategy => {
                        strategyCounts[strategy] = (strategyCounts[strategy] || 0) + 1;
                    });
                }
            });

            const uniqueStrategies = Object.keys(strategyCounts).sort();
            
            uniqueStrategies.forEach(strategy => {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `strategy-${strategy.replace(/\s+/g, '-')}`;
                checkbox.name = 'strategies';
                checkbox.value = strategy;
                checkbox.dataset.type = 'strategy';
                
                const label = document.createElement('label');
                label.htmlFor = `strategy-${strategy.replace(/\s+/g, '-')}`;
                label.textContent = `${strategy} (${strategyCounts[strategy] || 0})`;
                
                const div = document.createElement('div');
                div.className = 'filter-item';
                div.appendChild(checkbox);
                div.appendChild(label);
                
                if (strategyFiltersContainer) {
                    strategyFiltersContainer.appendChild(div);
                }
            });
        }
        
        // Фильтры по госпрограммам		
        if (data.programs && Array.isArray(data.programs)) {
            const programCounts = {};
            data.oiv.forEach(oiv => {
                if (oiv.programs) {
                    oiv.programs.forEach(program => {
                        programCounts[program] = (programCounts[program] || 0) + 1;
                    });
                }
            });

            const uniquePrograms = Object.keys(programCounts).sort();
            
            uniquePrograms.forEach(program => {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `program-${program.replace(/\s+/g, '-')}`;
                checkbox.name = 'programs';
                checkbox.value = program;
                checkbox.dataset.type = 'program';
                
                const label = document.createElement('label');
                label.htmlFor = `program-${program.replace(/\s+/g, '-')}`;
                label.textContent = `${program} (${programCounts[program] || 0})`;
                
                const div = document.createElement('div');
                div.className = 'filter-item';
                div.appendChild(checkbox);
                div.appendChild(label);
                
                if (programFiltersContainer) {
                    programFiltersContainer.appendChild(div);
                }
            });
        }  
        
        // Обработчики событий для фильтры
        document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', function(e) {
                e.stopPropagation();
                document.dispatchEvent(new CustomEvent('filterChange', {
                    detail: {
                        type: this.dataset.type,
                        id: this.value,
                        checked: this.checked
                    }
                }));
                applyFilters();
            });
            
            const parentItem = checkbox.closest('.filter-item');
            if (parentItem) {
                parentItem.style.cursor = 'pointer';
                parentItem.addEventListener('click', function(e) {
                    if (e.target.tagName !== 'INPUT') {
                        const checkbox = this.querySelector('input[type="checkbox"]');
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change'));
                    }
                });
            }
        });
        
        // Обработчик для поиска
        if (searchInput) {
            searchInput.addEventListener('input', debounce(function() {
                applyFilters();
            }, 300));
        }
        
        // Обработчик для сброса фильтров
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', function() {
                document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = false;
                });
                
                if (searchInput) searchInput.value = '';
                
                if (window.resetSelection) window.resetSelection();
                if (window.resetCameraPosition) window.resetCameraPosition();
                
                applyFilters();
            });
        }
    }
    

    // Функция для применения фильтров
	applyFilters = function() {
		if (!window.currentData) return;
		
		const searchInput = document.getElementById('global-search');
		const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
		
		const selectedComplexes = Array.from(document.querySelectorAll('#complex-filters input[type="checkbox"]:checked')).map(cb => cb.value);
		const selectedOIV = Array.from(document.querySelectorAll('#oiv-filters input[type="checkbox"]:checked')).map(cb => cb.value);
		const selectedThemes = Array.from(document.querySelectorAll('#theme-filters input[type="checkbox"]:checked')).map(cb => cb.value);
		const selectedStrategies = Array.from(document.querySelectorAll('#strategy-filters input[type="checkbox"]:checked')).map(cb => cb.value);
		const selectedPrograms = Array.from(document.querySelectorAll('#program-filters input[type="checkbox"]:checked')).map(cb => cb.value);
		
		// Обновляем счетчик расширенного фильтра
		updateExtendedFilterCounter();
		
		// Определяем активный тип фильтра для отображения счетчика
		let activeFilterType = null;
		if (selectedStrategies.length > 0) activeFilterType = 'strategy';
		else if (selectedPrograms.length > 0) activeFilterType = 'program';
		else if (selectedThemes.length > 0) activeFilterType = 'theme';
		else if (selectedOIV.length > 0) activeFilterType = 'oiv';
		else if (selectedComplexes.length > 0) activeFilterType = 'complex';
		
		// Синхронизируем счетчики
		syncFilterCounters(activeFilterType);
		
		// Остальной код функции без изменений...
		selectedFilters.complexes = selectedComplexes;
		selectedFilters.oiv = selectedOIV;
		selectedFilters.themes = selectedThemes;
		selectedFilters.strategies = selectedStrategies;
		selectedFilters.programs = selectedPrograms;
		
		// Проверяем, есть ли активные обычные фильтры
		const hasActiveRegularFilters = selectedComplexes.length > 0 || selectedOIV.length > 0 || 
									   selectedThemes.length > 0 || selectedStrategies.length > 0 || 
									   selectedPrograms.length > 0 || searchTerm.length > 0;
		
		if (hasActiveRegularFilters) {
			selectedFilters.allData = [];
			updateSelectedFiltersDisplay();
			updateExtendedFilterCounter();
			
			applyRegularFilters({
				complexes: selectedComplexes,
				oiv: selectedOIV,
				themes: selectedThemes,
				strategies: selectedStrategies,
				programs: selectedPrograms,
				showOnlyConnections: showOnlyConnections
			});
		} 
		else if (selectedFilters.allData.length > 0) {
			applyExtendedFilter(selectedFilters.allData);
		} else {
			if (window.resetSelection) window.resetSelection();
		}
		
		updateResetButtonState();
		
		// Обновляем счетчики обычных фильтров только если активны обычные фильтры
		if (hasActiveRegularFilters) {
			updateFilterCount('complex-filters', selectedComplexes.length);
			updateFilterCount('oiv-filters', selectedOIV.length);
			updateFilterCount('theme-filters', selectedThemes.length);
			updateFilterCount('strategy-filters', selectedStrategies.length);
			updateFilterCount('program-filters', selectedPrograms.length);
		}
		
		syncFilterStates();
	};

	// Отдельная функция для применения обычных фильтров
	function applyRegularFilters(filterParams) {
		if (!filterParams) return;
		
		console.log('Applying regular filter:', filterParams);
		
		// Применяем фильтры к 3D сцене через соответствующую функцию
		if (window.applyCascadeFilter3D) {
			window.applyCascadeFilter3D({
				complexes: filterParams.complexes || [],
				oiv: filterParams.oiv || [],
				themes: filterParams.themes || [],
				strategies: filterParams.strategies || [],
				programs: filterParams.programs || [],
				showOnlyConnections: filterParams.showOnlyConnections || false
			});
		}
	}

	// Отдельная функция для применения расширенного фильтра
	function applyExtendedFilter(selectedItems) {
		console.log('Applying extended filter with items:', selectedItems);
		
		const groupedFilters = {
			complexes: [],
			oiv: [],
			themes: [],
			strategies: [],
			programs: []
		};
		
		// Правильная группировка для расширенного фильтра
		selectedItems.forEach(item => {
			if (item.includes(':')) {
				const [type, id] = item.split(':');
				
				switch(type) {
					case 'complex':
						groupedFilters.complexes.push(id);
						break;
					case 'oiv':
						groupedFilters.oiv.push(id);
						break;
					case 'theme':
						groupedFilters.themes.push(id);
						break;
					case 'strategy':
						groupedFilters.strategies.push(id);
						break;
					case 'program':
						groupedFilters.programs.push(id);
						break;
				}
			} else {
				// Новый формат: просто ID
				if (currentData.complexes?.find(c => c.id === item)) {
					groupedFilters.complexes.push(item);
				} else if (currentData.oiv?.find(o => o.id === item)) {
					groupedFilters.oiv.push(item);
				} else if (currentData.themes?.find(t => t.id === item)) {
					groupedFilters.themes.push(item);
				} else if (currentData.strategies?.includes(item)) {
					groupedFilters.strategies.push(item);
				} else if (currentData.programs?.includes(item)) {
					groupedFilters.programs.push(item);
				}
			}
		});
		
		console.log('Extended filter grouped:', groupedFilters);
		
		// ВАЖНОЕ ИСПРАВЛЕНИЕ: Обновляем счетчики для ВСЕХ типов фильтров
		updateFilterCount('complex-filters', groupedFilters.complexes.length);
		updateFilterCount('oiv-filters', groupedFilters.oiv.length);
		updateFilterCount('theme-filters', groupedFilters.themes.length);
		updateFilterCount('strategy-filters', groupedFilters.strategies.length);
		updateFilterCount('program-filters', groupedFilters.programs.length);
		
		// Обновляем счетчик расширенного фильтра
		updateExtendedFilterCounter();
		
		// Синхронизируем состояние счетчиков - показываем все счетчики для расширенного фильтра
		syncFilterCountersForExtendedFilter();
		
		// Применяем фильтры к 3D сцене
		if (window.applyCascadeFilter3D) {
			window.applyCascadeFilter3D({
				...groupedFilters,
				showOnlyConnections: showOnlyConnections
			});
		}
	}
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    function resetAllFilters() {
        // Сбрасываем все чекбоксы
        document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Сбрасываем расширенный фильтр
        selectedFilters.allData = [];
        updateSelectedFiltersDisplay();
        
        // Сбрасываем поиск
        if (searchInput) searchInput.value = '';
        
        // Сбрасываем состояние в 3D сцене
        if (window.resetSelection) window.resetSelection();
        if (window.resetCameraPosition) window.resetCameraPosition();
        
        // Обновляем счетчики фильтров
        filterGroups.forEach(group => {
            const containerId = group.querySelector('.filter-container')?.id;
            if (containerId) {
                updateFilterCount(containerId, 0);
            }
        });
        
        // Делаем кнопку сброса неактивной
        if (resetAllBtn) {
            resetAllBtn.classList.add('disabled');
            resetAllBtn.disabled = true;
        }
        
        // Применяем изменения
        applyFilters();
    }
    
    loadData();
});

function clearRegularFilters() {
    // Сбрасываем все чекбоксы обычных фильтров
    document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Сбрасываем поиск
    const searchInput = document.getElementById('global-search');
    if (searchInput) searchInput.value = '';
    
    // Сбрасываем глобальные фильтры (кроме allData)
    selectedFilters.complexes = [];
    selectedFilters.oiv = [];
    selectedFilters.themes = [];
    selectedFilters.strategies = [];
    selectedFilters.programs = [];
    
    // Обновляем счетчики
    updateFilterCount('complex-filters', 0);
    updateFilterCount('oiv-filters', 0);
    updateFilterCount('theme-filters', 0);
    updateFilterCount('strategy-filters', 0);
    updateFilterCount('program-filters', 0);
    
    // ОБНОВЛЯЕМ СЧЕТЧИК РАСШИРЕННОГО ФИЛЬТРА
    updateExtendedFilterCounter();
}

window.applyFilter = function(filterParams) {
    if (!filterParams) return;
    
    console.log('Applying regular filter:', filterParams);
    
    // Применяем фильтры к 3D сцене
    if (window.applyCascadeFilter3D) {
        window.applyCascadeFilter3D({
            complexes: filterParams.complexes || [],
            oiv: filterParams.oiv || [],
            themes: filterParams.themes || [],
            strategies: filterParams.strategies || [],
            programs: filterParams.programs || [],
            showOnlyConnections: filterParams.showOnlyConnections || false
        });
    }
};