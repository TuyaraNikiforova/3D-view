let selectedFilters = {
    complexes: [],
    oiv: [],
    themes: [],
    strategies: [],
    programs: [],
    projects: [],
    commonFilters: [] 
};

let resetAllBtn = null;

function createFilterModal() {
    window.currentFilters = {
        complexes: [],
        oiv: [],
        themes: [],
        strategies: [],
        programs: [],
        projects: [],
        commonFilters: [] 
    };
    
	window.applyCascadeFilter = function(filterParams) {
		// Сбрасываем все текущие фильтры
		document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
			checkbox.checked = false;
		});
		
		window.currentFilters = {
			complexes: [],
			oiv: [],
			themes: [],
			strategies: [],
			programs: [],
			projects: [],
			commonFilters: [] 
		};
		
		// Применяем переданные фильтры
		const filterTypes = ['complexes', 'oiv', 'themes', 'strategies', 'programs', 'projects', 'commonFilters'];
		
		filterTypes.forEach(type => {
			if (filterParams[type] && filterParams[type].length > 0) {
				filterParams[type].forEach(value => {
					// Для комплексов и OIV ищем чекбоксы по значению
					if (type === 'complexes' || type === 'oiv') {
						const checkbox = document.querySelector(`input[data-type="${type.slice(0, -1)}"][value="${value}"]`);
						if (checkbox) {
							checkbox.checked = true;
							if (window.currentFilters[type]) {
								window.currentFilters[type].push(value);
							}
						}
					} 
					// Для тем, стратегий и программ ищем по тексту
					else {
						const checkboxes = document.querySelectorAll(`input[data-type="${type.slice(0, -1)}"]`);
						checkboxes.forEach(checkbox => {
							const label = checkbox.nextElementSibling;
							if (label && label.textContent.includes(value)) {
								checkbox.checked = true;
								if (window.currentFilters[type]) {
									window.currentFilters[type].push(checkbox.value);
								}
							}
						});
					}
				});
			}
		});
		
		// Обновляем счетчики
		filterTypes.forEach(type => {
			const containerId = `${type.slice(0, -1)}-filters`;
			if (document.getElementById(containerId)) {
				updateFilterCount(containerId, filterParams[type]?.length || 0);
			}
		});
		
		// Применяем все фильтры
		applyFilters();
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
        }
        
        .modal-section h4 {
            margin: 10px 0;
            color: #4a6da7;
            border-bottom: 1px solid #4a6da7;
            padding-bottom: 5px;
        }
        
        .open-common-modal-btn {
            background-color: #4a6da7;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .open-common-modal-btn:hover {
            background-color: #3a5a8f;
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
    
    // Обработчики событий для закрытия модального окна
    const closeModal = () => {
        modal.style.display = 'none';
        searchInput.value = '';
        modal.querySelectorAll('.modal-filter-item').forEach(item => item.classList.remove('hidden'));
    };
    
    modal.querySelector('.filter-modal-close').addEventListener('click', closeModal);
    
    // Обработчик для кнопки "Сбросить"
    modal.querySelector('.filter-modal-btn.reset').addEventListener('click', () => {
        resetAllFilters();
        closeModal();
    });
    
    // Обработчик для кнопки "Применить"
    modal.querySelector('.filter-modal-btn.apply').addEventListener('click', () => {
        if (modal.dataset.filterType === 'common') {
            // Собираем выбранные комплексы
            const complexCheckboxes = modal.querySelectorAll('input[data-type="complex"]:checked');
            selectedFilters.complexes = Array.from(complexCheckboxes).map(cb => cb.value);
            
            // Собираем выбранные ОИВ
            const oivCheckboxes = modal.querySelectorAll('input[data-type="oiv"]:checked');
            selectedFilters.oiv = Array.from(oivCheckboxes).map(cb => cb.value);
            
            // Обновляем оригинальные чекбоксы в фильтрах комплексов и ОИВ
            document.querySelectorAll('#complex-filters input[type="checkbox"]').forEach(cb => {
                cb.checked = selectedFilters.complexes.includes(cb.value);
            });
            
            document.querySelectorAll('#oiv-filters input[type="checkbox"]').forEach(cb => {
                cb.checked = selectedFilters.oiv.includes(cb.value);
            });
            
            // Обновляем счетчики
            updateFilterCount('complex-filters', selectedFilters.complexes.length);
            updateFilterCount('oiv-filters', selectedFilters.oiv.length);
            
            // Применяем фильтры
            applyFilters();
            closeModal();
        } else {        
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
        }
    });
    
    // Закрытие при клике вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    return modal; // Добавлено: возвращаем созданное модальное окно
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
    const commonFiltersContainer = document.getElementById('commonFilters');
    
    let currentData = {};
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
        
        // Создаем группу "Общий" только если есть контейнер для нее
		if (commonFiltersContainer) {
			commonFiltersContainer.innerHTML = '';
			
			const header = document.createElement('h3');
			header.textContent = 'Общий';
			
			const container = document.createElement('div');
			container.className = 'filter-container';
			container.id = 'commonFilters-container';
			
			const group = document.createElement('div');
			group.className = 'filter-group';
			group.appendChild(header);
			group.appendChild(container);
			
			// Добавляем кнопку для открытия модального окна
			const filterItem = document.createElement('div');
			filterItem.className = 'filter-item';
			filterItem.innerHTML = `
				<button class="open-common-modal-btn">Выбрать комплексы и ОИВ</button>
			`;
			container.appendChild(filterItem);
			
			// Добавляем отображение выбранных фильтров
			const selectedFiltersContainer = document.createElement('div');
			selectedFiltersContainer.id = 'selected-commonFilters';
			selectedFiltersContainer.style.marginTop = '10px';
			container.appendChild(selectedFiltersContainer);
			
			// Функция для обновления отображения выбранных фильтров
			const updateSelectedFiltersDisplay = () => {
				selectedFiltersContainer.innerHTML = '';
				
				if (selectedFilters.complexes.length > 0) {
					const complexTitle = document.createElement('div');
					complexTitle.textContent = 'Комплексы:';
					complexTitle.style.fontWeight = 'bold';
					complexTitle.style.marginTop = '5px';
					selectedFiltersContainer.appendChild(complexTitle);
					
					selectedFilters.complexes.forEach(complexId => {
						const complex = data.complexes.find(c => c.id === complexId);
						if (complex) {
							const complexItem = document.createElement('div');
							complexItem.innerHTML = `
								<span class="filter-color" style="background-color: ${complex.color};"></span>
								${complex.name}
							`;
							complexItem.style.display = 'flex';
							complexItem.style.alignItems = 'center';
							complexItem.style.marginLeft = '10px';
							selectedFiltersContainer.appendChild(complexItem);
						}
					});
				}
				
				if (selectedFilters.oiv.length > 0) {
					const oivTitle = document.createElement('div');
					oivTitle.textContent = 'Органы власти:';
					oivTitle.style.fontWeight = 'bold';
					oivTitle.style.marginTop = '5px';
					selectedFiltersContainer.appendChild(oivTitle);
					
					selectedFilters.oiv.forEach(oivId => {
						const oiv = data.oiv.find(o => o.id === oivId);
						if (oiv) {
							const oivItem = document.createElement('div');
							oivItem.textContent = oiv.name;
							oivItem.style.marginLeft = '10px';
							selectedFiltersContainer.appendChild(oivItem);
						}
					});
				}
			};
			
			// Инициализируем отображение
			updateSelectedFiltersDisplay();
			
			// Обработчик для кнопки
			filterItem.querySelector('.open-common-modal-btn').addEventListener('click', function() {
				let modal = document.querySelector('.filter-modal');
				if (!modal) {
					modal = createFilterModal();
				}
				modal.querySelector('#modal-title').textContent = 'Общий фильтр: комплексы и ОИВ';
				modal.dataset.filterType = 'common';
				
				const filterContainer = modal.querySelector('#modal-filter-container');
				filterContainer.innerHTML = '';
				
				// Секция комплексов
				const complexesSection = document.createElement('div');
				complexesSection.className = 'modal-section';
				complexesSection.innerHTML = '<h4>Комплексы</h4>';
				filterContainer.appendChild(complexesSection);
				
				data.complexes.forEach(complex => {
					const checkbox = document.createElement('input');
					checkbox.type = 'checkbox';
					checkbox.id = `modal-common-complex-${complex.id}`;
					checkbox.value = complex.id;
					checkbox.dataset.type = 'complex';
					checkbox.checked = selectedFilters.complexes.includes(complex.id);
					
					const label = document.createElement('label');
					label.htmlFor = `modal-common-complex-${complex.id}`;
					label.innerHTML = `
						<span class="filter-color" style="background-color: ${complex.color};"></span>
						${complex.name}
					`;
					
					const item = document.createElement('div');
					item.className = 'modal-filter-item';
					item.appendChild(checkbox);
					item.appendChild(label);
					complexesSection.appendChild(item);
				});
				
				// Секция ОИВ
				const oivSection = document.createElement('div');
				oivSection.className = 'modal-section';
				oivSection.innerHTML = '<h4>Органы власти</h4>';
				filterContainer.appendChild(oivSection);
				
				const sortedOIV = [...data.oiv].sort((a, b) => a.name.localeCompare(b.name));
				sortedOIV.forEach(oiv => {
					const checkbox = document.createElement('input');
					checkbox.type = 'checkbox';
					checkbox.id = `modal-common-oiv-${oiv.id}`;
					checkbox.value = oiv.id;
					checkbox.dataset.type = 'oiv';
					checkbox.checked = selectedFilters.oiv.includes(oiv.id);
					
					const label = document.createElement('label');
					label.htmlFor = `modal-common-oiv-${oiv.id}`;
					label.textContent = oiv.name;
					
					const item = document.createElement('div');
					item.className = 'modal-filter-item';
					item.appendChild(checkbox);
					item.appendChild(label);
					oivSection.appendChild(item);
				});
				
				modal.style.display = 'flex';
				
				// Обновляем отображение при закрытии модального окна
				const originalCloseHandler = modal.querySelector('.filter-modal-btn.apply').onclick;
				modal.querySelector('.filter-modal-btn.apply').onclick = function() {
					originalCloseHandler.call(this);
					updateSelectedFiltersDisplay();
				};
			});
			
			// Добавляем группу в DOM
			commonFiltersContainer.appendChild(group);
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
        
        // Обработчики событий для фильтров
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
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change'));
                    }
                });
            }
        });
    }
    
    function resetFilterGroup(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        const filterType = containerId.replace('-filters', '');
        
        if (window.currentFilters && window.currentFilters[filterType]) {
            window.currentFilters[filterType] = [];
        }
        
        updateFilterCount(containerId, 0);
        applyFilters();
        
        if (filterType === 'complex' && window.resetSelection) {
            window.resetSelection();
        } else if (filterType === 'oiv' && window.selectOIV) {
            window.selectOIV([]);
        } else if (filterType === 'theme' && window.selectTheme) {
            window.selectTheme([]);
        }
    }
    
    function applyFilters() {
        const formData = new FormData(filterForm);
        const filters = {
            complexes: formData.getAll('complexes'),
            oiv: formData.getAll('oiv'),
            themes: formData.getAll('themes'),
            strategies: formData.getAll('strategies'),
            programs: formData.getAll('programs'),
            projects: formData.getAll('projects'),
			commonFilters: formData.getAll('commonFilters'),
            showOnlyConnections: showOnlyConnections
        };
        
        // Проверяем, есть ли активные фильтры
        const hasActiveFilters = Object.values(filters).some(
            filter => Array.isArray(filter) && filter.length > 0
        ) || filters.showOnlyConnections;

        // Обновляем состояние кнопки сброса
        const resetAllBtn = document.getElementById('reset-all-filters');
        if (resetAllBtn) {
            resetAllBtn.disabled = !hasActiveFilters;
            resetAllBtn.classList.toggle('disabled', !hasActiveFilters);
        }	
        
        selectedFilters = {...filters};
        window.currentFilters = {...filters};
        
        const filtered = JSON.parse(JSON.stringify(currentData));
    
        
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
            
            // Обновляем панель информации с полными данными
            if (window.updateInfoPanelData) {
                const selectedOIVData = filtered.oiv.filter(oiv => filters.oiv.includes(oiv.id));
                window.updateInfoPanelData(filtered, { 
                    oiv: selectedOIVData,
                    oivIds: filters.oiv
                });
            }
        }
        
        // Фильтрация по темам
        if (filters.themes.length > 0) {
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
            
            const filteredComplexes = new Set(filtered.oiv.map(oiv => oiv.complex));
            filtered.complexes = filtered.complexes.filter(complex => 
                filteredComplexes.has(complex.id));
        }
        
        // Фильтрация по госпрограммам		
        if (filters.programs.length > 0) {
            filtered.oiv = filtered.oiv.filter(oiv => {
                if (!oiv.programs) return false;
                return oiv.programs.some(program => filters.programs.includes(program));
            });
            
            const filteredComplexes = new Set(filtered.oiv.map(oiv => oiv.complex));
            filtered.complexes = filtered.complexes.filter(complex => 
                filteredComplexes.has(complex.id));
            
            // Фильтрация связей по выбранным ОИВ
            const filteredOIVs = filtered.oiv.map(oiv => oiv.id);
            filtered.edges = filtered.edges.filter(edge => 
                filteredOIVs.includes(edge.source) && filteredOIVs.includes(edge.target));
        }	
       
        // Фильтрация по стратегиям, программам и проектам
        // ... (остальная логика фильтрации остается без изменений)
        
        // Новая фильтрация - показывать только связи между выбранными элементами
        if (filters.showOnlyConnections) {
            const selectedOIVs = filters.oiv.length > 0 ? filters.oiv : filtered.oiv.map(o => o.id);
            filtered.edges = filtered.edges.filter(edge => 
                selectedOIVs.includes(edge.source) && selectedOIVs.includes(edge.target));
        }
        
        updateViews(filtered, filters);

        if (window.updateInfoPanelData) {
            window.updateInfoPanelData(filtered, filters);
        }	
        
        // Обновляем кнопку "Назад"
        if (resetFiltersBtn) {
            resetFiltersBtn.textContent = 'Сбросить фильтры';
            resetFiltersBtn.addEventListener('click', function() {
                filterForm.reset();
                applyFilters();
                if (window.resetSelection) window.resetSelection();
                if (window.resetCameraPosition) window.resetCameraPosition();
            });
        }
    }
    
    function resetAllFilters() {
        // Сбрасываем форму фильтров
        filterForm.reset();
        
        // Сбрасываем состояние в 3D сцене
        if (window.resetSelection) window.resetSelection();
        if (window.resetCameraPosition) window.resetCameraPosition();
        
        // Обновляем счетчики фильтров для всех групп
        const filterGroups = document.querySelectorAll('.filter-group');
        filterGroups.forEach(group => {
            const containerId = group.querySelector('.filter-container')?.id;
            if (containerId) {
                updateFilterCount(containerId, 0);
            }
        });
        
        // Сбрасываем текущие фильтры
        window.currentFilters = {
            complexes: [],
            oiv: [],
            themes: [],
            strategies: [],
            programs: [],
            projects: [],
			commonFilters: []
        };
        
        // Обновляем состояние кнопки сброса
        const resetAllBtn = document.getElementById('reset-all-filters');
        if (resetAllBtn) {
            resetAllBtn.classList.add('disabled');
            resetAllBtn.disabled = true;
        }
        
        // Применяем изменения
        applyFilters();
    }

    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', resetAllFilters);
    }	
    
    function updateViews(data, filters) {
        if (window.update3DScene) window.update3DScene(data, filters);
        if (window.updateTableView) window.updateTableView(data);
        if (window.updateDashboard) window.updateDashboard(data);
    }
    
    // Глобальный поиск
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        
        if (searchTerm.length < 2) {
            updateViews(currentData, {});
            return;
        }
        
        const filtered = JSON.parse(JSON.stringify(currentData));
        
        filtered.complexes = filtered.complexes.filter(complex => 
            complex.name.toLowerCase().includes(searchTerm));
        
        filtered.oiv = filtered.oiv.filter(oiv => 
            oiv.name.toLowerCase().includes(searchTerm));
        
        filtered.edges = filtered.edges.filter(edge => 
            edge.theme.toLowerCase().includes(searchTerm) || 
            edge.label.toLowerCase().includes(searchTerm));
        
        filtered.strategies = filtered.strategies.filter(strategy => 
            strategy.name.toLowerCase().includes(searchTerm));
        
        filtered.programs = filtered.programs.filter(program => 
            program.name.toLowerCase().includes(searchTerm));
        
        filtered.projects = filtered.projects.filter(project => 
            project.name.toLowerCase().includes(searchTerm));
        
        updateViews(filtered, {});
    });
    
    // Загрузка данных при старте
    loadData();
    
    // Экспорт функций для использования в других модулях
    window.applyFilters = applyFilters;
    window.updateViews = updateViews;
    window.selectTheme = (theme) => window.selectTheme && window.selectTheme(theme);
    window.selectComplex = (complexId) => window.selectComplex && window.selectComplex(complexId);
    window.currentFilters = {...selectedFilters};
});

window.getCurrentFilters = function() {
    return {
        complexes: selectedFilters.complexes,
        oiv: selectedFilters.oiv,
        themes: selectedFilters.themes,
        strategies: selectedFilters.strategies,
        programs: selectedFilters.programs,
        projects: selectedFilters.projects,
        commonFilters: selectedFilters.commonFilters,
        showOnlyConnections: selectedFilters.showOnlyConnections
    };
};

// Функция для применения фильтров из другого представления
window.applyCascadeFilter = function(filterParams) {
    if (!filterParams) return;
    
    // Сбрасываем все текущие фильтры
    document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Обновляем selectedFilters
    selectedFilters = {
        complexes: filterParams.complexes || [],
        oiv: filterParams.oiv || [],
        themes: filterParams.themes || [],
        strategies: filterParams.strategies || [],
        programs: filterParams.programs || [],
        projects: filterParams.projects || [],
        commonFilters: filterParams.commonFilters || [],
        showOnlyConnections: filterParams.showOnlyConnections || false
    };
    
    // Применяем переданные фильтры
    const filterTypes = ['complexes', 'oiv', 'themes', 'strategies', 'programs', 'projects', 'commonFilters'];
    
    filterTypes.forEach(type => {
        if (selectedFilters[type] && selectedFilters[type].length > 0) {
            selectedFilters[type].forEach(value => {
                // Для комплексов и OIV ищем чекбоксы по значению
                if (type === 'complexes' || type === 'oiv') {
                    const checkbox = document.querySelector(`input[data-type="${type.slice(0, -1)}"][value="${value}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                } 
                // Для тем, стратегий и программ ищем по тексту
                else {
                    const checkboxes = document.querySelectorAll(`input[data-type="${type.slice(0, -1)}"]`);
                    checkboxes.forEach(checkbox => {
                        const label = checkbox.nextElementSibling;
                        if (label && label.textContent.includes(value)) {
                            checkbox.checked = true;
                        }
                    });
                }
            });
        }
    });
    
    // Обновляем счетчики
    filterTypes.forEach(type => {
        const containerId = `${type.slice(0, -1)}-filters`;
        if (document.getElementById(containerId)) {
            updateFilterCount(containerId, selectedFilters[type]?.length || 0);
        }
    });
    
    // Обновляем чекбокс "Показывать только связи"
    const connectionsCheckbox = document.getElementById('show-only-connections');
    if (connectionsCheckbox) {
        connectionsCheckbox.checked = selectedFilters.showOnlyConnections || false;
    }
    
    // Применяем все фильтры
    applyFilters();
};

window.getCurrentFormFilters = function() {
    const formData = new FormData(document.getElementById('filter-form'));
    const showOnlyConnectionsCheckbox = document.getElementById('show-only-connections');
    
    return {
        complexes: formData.getAll('complexes'),
        oiv: formData.getAll('oiv'),
        themes: formData.getAll('themes'),
        strategies: formData.getAll('strategies'),
        programs: formData.getAll('programs'),
        projects: formData.getAll('projects'),
        commonFilters: formData.getAll('commonFilters'),
        showOnlyConnections: showOnlyConnectionsCheckbox ? showOnlyConnectionsCheckbox.checked : false
    };
};