let selectedFilters = {
    complexes: [],
    oiv: [],
    themes: [],
    strategies: [],
    programs: [],
    projects: [],
    extended: {}
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
        extended: {}
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
            projects: []
        };
        
        // Применяем переданные фильтры
        const filterTypes = ['complexes', 'oiv', 'themes', 'strategies', 'programs', 'projects'];
        filterTypes.forEach(type => {
            if (filterParams[type]) {
                filterParams[type].forEach(value => {
                    const checkbox = document.querySelector(`input[data-type="${type.slice(0, -1)}"][value="${value}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                        if (window.currentFilters[type]) {
                            window.currentFilters[type].push(value);
                        }
                    }
                });
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
		const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
		const filterType = modal.dataset.filterType;
		const containerId = modal.dataset.containerId;
		
		// Обновляем текущие фильтры
		if (filterType && window.currentFilters) {
			window.currentFilters[`${filterType}s`] = Array.from(checkboxes).map(cb => cb.value);
		}
		
		// Находим все чекбоксы в основном контейнере и сбрасываем их
		const mainContainer = document.getElementById(containerId);
		if (mainContainer) {
			mainContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
				cb.checked = false;
			});
			
			// Устанавливаем состояние чекбоксов из модального окна
			checkboxes.forEach(cb => {
				const originalCheckbox = mainContainer.querySelector(`input[value="${cb.value}"]`);
				if (originalCheckbox) {
					originalCheckbox.checked = true;
					originalCheckbox.dispatchEvent(new Event('change'));
				}
			});
		}
		
		// Обновляем счетчик выбранных фильтров
		updateFilterCount(containerId, checkboxes.length);
		
		// Применяем фильтры
		applyFilters();
		closeModal();
	});

    function createExtendedFilterModal() {
        const modal = document.createElement('div');
        modal.className = 'filter-modal extended-filter-modal';
        modal.innerHTML = `
            <div class="filter-modal-content">
                <div class="filter-modal-header">
                    <div class="filter-modal-title">
                        <span class="filter-group-icon"></span>
                        <span id="modal-title">Расширенный фильтр</span>
                    </div>
                    <button class="filter-modal-close">&times;</button>
                </div>
                <div class="filter-modal-search-container">
                    <input type="text" id="extended-search-input" placeholder="Поиск..." class="filter-modal-search">
                </div>
                <div class="filter-modal-body" id="extended-filter-container">
                    <div class="extended-filter-section">
                        <h4>Комплексы</h4>
                        <div id="extended-complex-filters" class="extended-filter-group"></div>
                    </div>
                    <div class="extended-filter-section">
                        <h4>Органы власти</h4>
                        <div id="extended-oiv-filters" class="extended-filter-group"></div>
                    </div>
                    <div class="extended-filter-section">
                        <h4>Темы</h4>
                        <div id="extended-theme-filters" class="extended-filter-group"></div>
                    </div>
                    <div class="extended-filter-section">
                        <h4>Стратегии</h4>
                        <div id="extended-strategy-filters" class="extended-filter-group"></div>
                    </div>
                    <div class="extended-filter-section">
                        <h4>Гос. программы</h4>
                        <div id="extended-program-filters" class="extended-filter-group"></div>
                    </div>
                    <div class="extended-filter-section">
                        <h4>Проекты</h4>
                        <div id="extended-project-filters" class="extended-filter-group"></div>
                    </div>
                </div>
                <div class="filter-modal-footer">
                    <button class="filter-modal-btn reset">Сбросить</button>
                    <button class="filter-modal-btn apply">Применить</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Стили для расширенного фильтра
        const style = document.createElement('style');
        style.textContent = `
            .extended-filter-modal .filter-modal-content {
                width: 80%;
                max-width: 900px;
            }
            
            .extended-filter-section {
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #444;
            }
            
            .extended-filter-section h4 {
                margin: 0 0 10px 0;
                color: #4a6da7;
                font-size: 16px;
            }
            
            .extended-filter-group {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 8px;
                max-height: 200px;
                overflow-y: auto;
                padding: 5px;
            }
            
            .extended-filter-item {
                display: flex;
                align-items: center;
                padding: 5px;
            }
            
            .extended-filter-item label {
                margin-left: 5px;
                cursor: pointer;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        `;
        document.head.appendChild(style);
        
        return modal;
    }

    
    // Закрытие при клике вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    return modal;
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
    const resetFiltersBtn = document.getElementById('back-btn');
    const showOnlyConnectionsCheckbox = document.getElementById('show-only-connections');
    
    const complexFiltersContainer = document.getElementById('complex-filters');
    const oivFiltersContainer = document.getElementById('oiv-filters');
    const themeFiltersContainer = document.getElementById('theme-filters');
    const strategyFiltersContainer = document.getElementById('strategy-filters');
    const programFiltersContainer = document.getElementById('program-filters');
    const projectFiltersContainer = document.getElementById('project-filters');
    const filterGroups = document.querySelectorAll('.filter-group');
    
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
            //  fetch('/data/objects.json').then(res => res.json()),
            //  fetch('/data/parameters.json').then(res => res.json()),
            //  fetch('/data/indicators.json').then(res => res.json())
            ]);
            
            currentData = {
                ...responses[0], // data.json
                strategies: responses[1],
                programs: responses[2].filter(p => p.program_type === 0.0) // Фильтруем только program_type: 0.0
            //  objects: responses[3],
            //  parameters: responses[4],
            //  indicators: responses[5]
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
        
        filterGroups.forEach(group => {
            const header = group.querySelector('h3');
            if (header) {
                // Удаляем старый код создания кнопки сброса
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
					// Останавливаем всплытие события, чтобы оно не срабатывало на родительских элементах
					e.stopPropagation();
					
					const filterType = this.nextElementSibling.id.replace('-filters', '');
					const modal = document.querySelector('.filter-modal') || createFilterModal();
					
					modal.querySelector('#modal-title').textContent = this.textContent.trim();
					modal.dataset.filterType = filterType;
					modal.dataset.containerId = this.nextElementSibling.id;
					
					const filterContainer = modal.querySelector('#modal-filter-container');
					filterContainer.innerHTML = '';
					
					// Получаем все элементы фильтра из соответствующего контейнера
					const filters = document.querySelectorAll(`#${this.nextElementSibling.id} .filter-item`);
					
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
							
							// Добавляем обработчик клика для элемента в модальном окне
							modalItem.addEventListener('click', function(e) {
								e.stopPropagation();
								newCheckbox.checked = !newCheckbox.checked;
								newCheckbox.dispatchEvent(new Event('change'));
							});
							
							modalItem.appendChild(newCheckbox);
							modalItem.appendChild(newLabel);
							filterContainer.appendChild(modalItem);
						}
					});
					
					modal.style.display = 'flex';
				});
                
                header.nextElementSibling.style.display = 'none';
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
    
        const filterForm = document.getElementById('filter-form');
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
            
            complexFiltersContainer.appendChild(div);
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
                
                oivFiltersContainer.appendChild(div);
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
            
            themeFiltersContainer.appendChild(div);
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
                
                strategyFiltersContainer.appendChild(div);
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
                
                programFiltersContainer.appendChild(div);
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
        
        const extendedFilterBtn = document.createElement('button');
        extendedFilterBtn.className = 'extended-filter-btn';
        extendedFilterBtn.textContent = 'Расширенный фильтр';
        extendedFilterBtn.style.marginTop = '20px';
        extendedFilterBtn.style.padding = '8px 16px';
        extendedFilterBtn.style.backgroundColor = '#4a6da7';
        extendedFilterBtn.style.color = 'white';
        extendedFilterBtn.style.border = 'none';
        extendedFilterBtn.style.borderRadius = '4px';
        extendedFilterBtn.style.cursor = 'pointer';              
        extendedFilterBtn.style.width = '100%'; // Добавляем ширину 100%
        extendedFilterBtn.style.fontSize = '14px'; // Добавляем размер шрифта как у других кнопок
        extendedFilterBtn.style.transition = 'all 0.3s ease'; // Добавляем анимацию

        extendedFilterBtn.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#3a5a8f';
        });

        extendedFilterBtn.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '#4a6da7';
        });

		extendedFilterBtn.addEventListener('click', function() {
			// Проверяем, существует ли уже модальное окно
			let modal = document.querySelector('.extended-filter-modal');
			if (!modal) {
				modal = createExtendedFilterModal();
			}
			
			// Заполняем фильтры данными
			fillExtendedFilters(modal, data);
			
			// Показываем модальное окно
			modal.style.display = 'flex';
			
			// Обработчик поиска
			const searchInput = modal.querySelector('#extended-search-input');
			if (searchInput) {
				searchInput.value = '';
				searchInput.addEventListener('input', function() {
					const searchTerm = this.value.toLowerCase();
					const filterItems = modal.querySelectorAll('.extended-filter-item');
					
					filterItems.forEach(item => {
						const label = item.querySelector('label');
						if (label) {
							const text = label.textContent.toLowerCase();
							item.classList.toggle('hidden', !text.includes(searchTerm));
						}
					});
				});
			}
			
			// Обработчики событий для кнопок
			const closeBtn = modal.querySelector('.filter-modal-close');
			if (closeBtn) {
				closeBtn.onclick = () => {
					modal.style.display = 'none';
					if (searchInput) searchInput.value = '';
					modal.querySelectorAll('.extended-filter-item').forEach(item => item.classList.remove('hidden'));
				};
			}
			
			const resetBtn = modal.querySelector('.filter-modal-btn.reset');
			if (resetBtn) {
				resetBtn.onclick = () => {
					modal.querySelectorAll('.extended-filter-group input[type="checkbox"]').forEach(checkbox => {
						checkbox.checked = false;
					});
				};
			}
			
			const applyBtn = modal.querySelector('.filter-modal-btn.apply');
			if (applyBtn) {
				applyBtn.onclick = () => {
					const extendedFilters = {
						complexes: [],
						oiv: [],
						themes: [],
						strategies: [],
						programs: [],
						projects: []
					};
					
					// Собираем выбранные фильтры
					modal.querySelectorAll('.extended-filter-group input[type="checkbox"]:checked').forEach(checkbox => {
						const type = checkbox.dataset.type;
						if (type && extendedFilters[`${type}s`]) {
							extendedFilters[`${type}s`].push(checkbox.value);
						}
					});
					
					// Применяем расширенный фильтр
					applyExtendedFilters(extendedFilters);
					modal.style.display = 'none';
					if (searchInput) searchInput.value = '';
				};
			}
			
			// Закрытие при клике вне модального окна
			modal.addEventListener('click', function(e) {
				if (e.target === modal) {
					modal.style.display = 'none';
					if (searchInput) searchInput.value = '';
				}
			});
		});
        
        // Добавляем кнопку в форму фильтров
        if (filterForm) {
            filterForm.appendChild(extendedFilterBtn);
        }
        
    }

    function fillExtendedFilters(modal, data) {
        // Комплексы
        const complexFilters = modal.querySelector('#extended-complex-filters');
        complexFilters.innerHTML = '';
        data.complexes.forEach(complex => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `ext-complex-${complex.id}`;
            checkbox.value = complex.id;
            checkbox.dataset.type = 'complex';
            
            const label = document.createElement('label');
            label.htmlFor = `ext-complex-${complex.id}`;
            label.innerHTML = `
                <span class="filter-color" style="background-color: ${complex.color};"></span>
                ${complex.name}
            `;
            
            const div = document.createElement('div');
            div.className = 'extended-filter-item';
            div.appendChild(checkbox);
            div.appendChild(label);
            
            complexFilters.appendChild(div);
        });
        
        // Органы власти
        const oivFilters = modal.querySelector('#extended-oiv-filters');
        oivFilters.innerHTML = '';
        data.oiv.forEach(oiv => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `ext-oiv-${oiv.id}`;
            checkbox.value = oiv.id;
            checkbox.dataset.type = 'oiv';
            
            const label = document.createElement('label');
            label.htmlFor = `ext-oiv-${oiv.id}`;
            label.textContent = oiv.name;
            
            const div = document.createElement('div');
            div.className = 'extended-filter-item';
            div.appendChild(checkbox);
            div.appendChild(label);
            
            oivFilters.appendChild(div);
        });
        
        // Темы
        const themeFilters = modal.querySelector('#extended-theme-filters');
        themeFilters.innerHTML = '';
        const themes = [...new Set(data.edges.map(edge => edge.theme))];
        themes.forEach(theme => {
            const themeObj = data.themes.find(t => t.id === theme);
            const color = themeObj ? themeObj.color : '#999999';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `ext-theme-${theme.replace(/\s+/g, '-')}`;
            checkbox.value = theme;
            checkbox.dataset.type = 'theme';
            
            const label = document.createElement('label');
            label.htmlFor = `ext-theme-${theme.replace(/\s+/g, '-')}`;
            label.innerHTML = `
                <span class="filter-color" style="background-color: ${color};"></span>
                ${theme}
            `;
            
            const div = document.createElement('div');
            div.className = 'extended-filter-item';
            div.appendChild(checkbox);
            div.appendChild(label);
            
            themeFilters.appendChild(div);
        });
        
        // Стратегии
        const strategyFilters = modal.querySelector('#extended-strategy-filters');
        strategyFilters.innerHTML = '';
        if (data.strategies && Array.isArray(data.strategies)) {
            data.strategies.forEach(strategy => {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `ext-strategy-${strategy.id}`;
                checkbox.value = strategy.id;
                checkbox.dataset.type = 'strategy';
                
                const label = document.createElement('label');
                label.htmlFor = `ext-strategy-${strategy.id}`;
                label.textContent = strategy.name;
                
                const div = document.createElement('div');
                div.className = 'extended-filter-item';
                div.appendChild(checkbox);
                div.appendChild(label);
                
                strategyFilters.appendChild(div);
            });
        }
        
        // Гос. программы
        const programFilters = modal.querySelector('#extended-program-filters');
        programFilters.innerHTML = '';
        if (data.programs && Array.isArray(data.programs)) {
            data.programs.forEach(program => {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `ext-program-${program.id}`;
                checkbox.value = program.id;
                checkbox.dataset.type = 'program';
                
                const label = document.createElement('label');
                label.htmlFor = `ext-program-${program.id}`;
                label.textContent = program.name;
                
                const div = document.createElement('div');
                div.className = 'extended-filter-item';
                div.appendChild(checkbox);
                div.appendChild(label);
                
                programFilters.appendChild(div);
            });
        }
        
        // Проекты
        const projectFilters = modal.querySelector('#extended-project-filters');
        projectFilters.innerHTML = '';
        if (data.projects && Array.isArray(data.projects)) {
            data.projects.forEach(project => {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `ext-project-${project.id}`;
                checkbox.value = project.id;
                checkbox.dataset.type = 'project';
                
                const label = document.createElement('label');
                label.htmlFor = `ext-project-${project.id}`;
                label.textContent = project.name;
                
                const div = document.createElement('div');
                div.className = 'extended-filter-item';
                div.appendChild(checkbox);
                div.appendChild(label);
                
                projectFilters.appendChild(div);
            });
        }
    }

    function applyExtendedFilters(filters) {
        // Сохраняем выбранные фильтры
        selectedFilters.extended = {...filters};
        
        // Сбрасываем основные фильтры
        document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Фильтруем данные
        const filtered = JSON.parse(JSON.stringify(currentData));
        
        // Применяем фильтры
        if (filters.complexes.length > 0) {
            filtered.complexes = filtered.complexes.filter(complex => 
                filters.complexes.includes(complex.id));
            
            filtered.oiv = filtered.oiv.filter(oiv => 
                filters.complexes.includes(oiv.complex));
        }
        
        if (filters.oiv.length > 0) {
            filtered.oiv = filtered.oiv.filter(oiv => 
                filters.oiv.includes(oiv.id));
        }
        
        if (filters.themes.length > 0) {
            filtered.edges = filtered.edges.filter(edge => 
                filters.themes.includes(edge.theme));
        }
        
        if (filters.strategies.length > 0) {
            filtered.strategies = filtered.strategies.filter(strategy => 
                filters.strategies.includes(strategy.id));
        }
        
        if (filters.programs.length > 0) {
            filtered.programs = filtered.programs.filter(program => 
                filters.programs.includes(program.id));
        }
        
        if (filters.projects.length > 0) {
            filtered.projects = filtered.projects.filter(project => 
                filters.projects.includes(project.id));
        }
        
        // Обновляем представления
        updateViews(filtered, {extended: filters});
        
        // Обновляем кнопку сброса
        const resetAllBtn = document.getElementById('reset-all-filters');
        if (resetAllBtn) {
            resetAllBtn.disabled = false;
            resetAllBtn.classList.remove('disabled');
        }
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
            projects: []
        };

        selectedFilters.extended = {};          
        
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
        if (window.update3DScene) {
            if (filters.extended) {
                // Передаем только extended фильтры для 3D сцены
                window.update3DScene(data, {extended: filters.extended});
            } else {
                window.update3DScene(data, filters);
            }
        }
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
    //window.applyCascadeFilter = applyCascadeFilter;
    window.currentFilters = {...selectedFilters};
});