document.addEventListener('DOMContentLoaded', function() {
    // Глобальные переменные
    window.currentTableData = null;
    window.currentFilteredData = null;
    window.currentPage = 1;
    window.rowsPerPage = 25;
    window.currentComplexFilter = null;
    window.currentSearchTerm = '';
    window.currentColumnFilters = {};
    window.currentSortColumn = null;
    window.currentSortDirection = 'asc';
    window.currentSortColumns = []; // Многоуровневая сортировка
    window.originalColumnOrder = ['Комплекс', 'ОИВ комплекса', 'Связанный ОИВ', 'Связь', 'Тема', 'НПА связи', 'Стратегия', 'Гос.программы', 'Подпрограммы', 'Проект'];
    window.savedColumnOrder = null;
    
    function sortData(data, sortColumns) {
        if (!sortColumns || sortColumns.length === 0) return data;
        
        const edges = [...data.edges];
        
        edges.sort((a, b) => {
            const sourceOIVA = data.oiv.find(o => o.id === a.source);
            const targetOIVA = data.oiv.find(o => o.id === a.target);
            const complexA = data.complexes.find(c => c.id === (sourceOIVA?.complex || targetOIVA?.complex));
            
            const sourceOIVB = data.oiv.find(o => o.id === b.source);
            const targetOIVB = data.oiv.find(o => o.id === b.target);
            const complexB = data.complexes.find(c => c.id === (sourceOIVB?.complex || targetOIVB?.complex));
            
            // Проходим по всем столбцам сортировки, пока не найдем различие
            for (let i = 0; i < sortColumns.length; i++) {
                const {columnName, direction} = sortColumns[i];
                let valueA, valueB;
                
                switch(columnName) {
                    case 'Комплекс':
                        valueA = complexA?.name || '';
                        valueB = complexB?.name || '';
                        break;
                    case 'ОИВ комплекса':
                        valueA = sourceOIVA?.name || '';
                        valueB = sourceOIVB?.name || '';
                        break;
                    case 'Связанный ОИВ':
                        valueA = targetOIVA?.name || '';
                        valueB = targetOIVB?.name || '';
                        break;
                    case 'Связь':
                        valueA = a.label || '';
                        valueB = b.label || '';
                        break;
                    case 'Тема':
                        valueA = a.theme || '';
                        valueB = b.theme || '';
                        break;
                    case 'НПА связи':
                        valueA = a.edge_doc || '';
                        valueB = b.edge_doc || '';
                        break;
                    case 'Стратегия':
                        const strategyA = sourceOIVA?.strategies?.[0] ? 
                            (data.strategies?.find(s => s.id === sourceOIVA.strategies[0]) || 
                             window.additionalStrategies?.find(s => s.id === sourceOIVA.strategies[0])) : null;
                        const strategyB = sourceOIVB?.strategies?.[0] ? 
                            (data.strategies?.find(s => s.id === sourceOIVB.strategies[0]) || 
                             window.additionalStrategies?.find(s => s.id === sourceOIVB.strategies[0])) : null;
                        valueA = strategyA?.name || '';
                        valueB = strategyB?.name || '';
                        break;
                    case 'Гос.программы':
                        const programA = sourceOIVA?.programs?.find(pid => {
                            const p = data.programs?.find(p => p.id === pid && p.program_type === 0.0);
                            return p;
                        }) ? data.programs?.find(p => p.id === sourceOIVA.programs.find(pid => {
                            const p = data.programs?.find(pp => pp.id === pid && pp.program_type === 0.0);
                            return p;
                        })) : null;
                        const programB = sourceOIVB?.programs?.find(pid => {
                            const p = data.programs?.find(p => p.id === pid && p.program_type === 0.0);
                            return p;
                        }) ? data.programs?.find(p => p.id === sourceOIVB.programs.find(pid => {
                            const p = data.programs?.find(pp => pp.id === pid && pp.program_type === 0.0);
                            return p;
                        })) : null;
                        valueA = programA?.name || '';
                        valueB = programB?.name || '';
                        break;
                    case 'Подпрограммы':
                        const subprogramA = sourceOIVA?.programs?.find(pid => {
                            const p = data.programs?.find(p => p.id === pid && p.program_type === 1.0);
                            return p;
                        }) ? data.programs?.find(p => p.id === sourceOIVA.programs.find(pid => {
                            const p = data.programs?.find(pp => pp.id === pid && pp.program_type === 1.0);
                            return p;
                        })) : null;
                        const subprogramB = sourceOIVB?.programs?.find(pid => {
                            const p = data.programs?.find(p => p.id === pid && p.program_type === 1.0);
                            return p;
                        }) ? data.programs?.find(p => p.id === sourceOIVB.programs.find(pid => {
                            const p = data.programs?.find(pp => pp.id === pid && pp.program_type === 1.0);
                            return p;
                        })) : null;
                        valueA = subprogramA?.name || '';
                        valueB = subprogramB?.name || '';
                        break;
                    case 'Проект':
                        const projectA = sourceOIVA?.projects?.[0] ? data.projects?.find(p => p.id === sourceOIVA.projects[0]) : null;
                        const projectB = sourceOIVB?.projects?.[0] ? data.projects?.find(p => p.id === sourceOIVB.projects[0]) : null;
                        valueA = projectA?.name || '';
                        valueB = projectB?.name || '';
                        break;
                    default:
                        continue;
                }
                
                // Приводим к строке для сравнения
                valueA = String(valueA).toLowerCase();
                valueB = String(valueB).toLowerCase();
                
                if (valueA < valueB) return direction === 'asc' ? -1 : 1;
                if (valueA > valueB) return direction === 'asc' ? 1 : -1;
                // Если значения равны, переходим к следующему столбцу сортировки
            }
            
            return 0;
        });
        
        return { ...data, edges };
    }

    function setupColumnSorting() {
        const headers = document.querySelectorAll('#data-table thead th:not(.filter-cell)');
        
        headers.forEach(header => {
            const columnName = header.textContent.trim();
            
            // Создаем контейнер для заголовка и кнопок
            const headerContainer = document.createElement('div');
            headerContainer.className = 'header-container';
            
            // Текст заголовка
            const headerText = document.createElement('span');
            headerText.textContent = columnName;
            headerText.className = 'header-text';
            
            // Контейнер для кнопок
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'header-buttons';
            
            // Кнопка сортировки - увеличенный размер
            const sortBtn = document.createElement('button');
            sortBtn.className = 'sort-btn';
            sortBtn.innerHTML = '↑↓';
            sortBtn.title = 'Сортировка. Для множественной сортировки удерживайте Ctrl и кликайте по столбцам';
            sortBtn.style.cssText = 'color: white; font-size: 14px; padding: 4px 6px; margin: 0 2px;';
            
            // Кнопка фильтра - увеличенный размер
            const filterBtn = document.createElement('button');
            filterBtn.className = 'filter-btn';
            filterBtn.innerHTML = '⚙';
            filterBtn.title = 'Фильтр';
            filterBtn.style.cssText = 'color: white; font-size: 14px; padding: 4px 6px; margin: 0 2px;';
            
            buttonsContainer.appendChild(sortBtn);
            buttonsContainer.appendChild(filterBtn);
            
            headerContainer.appendChild(headerText);
            headerContainer.appendChild(buttonsContainer);
            
            // Очищаем заголовок и добавляем наш контейнер
            header.innerHTML = '';
            header.appendChild(headerContainer);
            
            // Обработчик клика для сортировки
            sortBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const isCtrlPressed = e.ctrlKey || e.metaKey;
                
                // Находим индекс столбца в текущей сортировке
                const existingSortIndex = window.currentSortColumns.findIndex(s => s.columnName === columnName);
                
                if (isCtrlPressed) {
                    // Множественная сортировка - добавляем/изменяем столбец
                    if (existingSortIndex >= 0) {
                        // Меняем направление существующего столбца
                        window.currentSortColumns[existingSortIndex].direction = 
                            window.currentSortColumns[existingSortIndex].direction === 'asc' ? 'desc' : 'asc';
                    } else {
                        // Добавляем новый столбец сортировки
                        window.currentSortColumns.push({
                            columnName: columnName,
                            direction: 'asc'
                        });
                    }
                } else {
                    // Одиночная сортировка - сбрасываем предыдущие и устанавливаем новый
                    window.currentSortColumns = [{
                        columnName: columnName,
                        direction: existingSortIndex >= 0 && 
                                   window.currentSortColumns[existingSortIndex].direction === 'asc' ? 'desc' : 'asc'
                    }];
                }
                
                // Обновляем визуальное отображение сортировки
                updateSortIndicators();
                
                // Обновляем таблицу
                if (window.currentTableData) {
                    renderTable();
                    updatePaginationControls();
                    updateURL();
                }
            });
            
            // Обработчик клика для фильтра
            filterBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                showFilterDropdown(columnName, filterBtn);
            });
            
            // Обработчик клика по всему заголовку (для перетаскивания)
            header.style.cursor = 'pointer';
            header.addEventListener('click', function(e) {
                if (e.target === sortBtn || e.target === filterBtn) return;
                
                const isCtrlPressed = e.ctrlKey || e.metaKey;
                const existingSortIndex = window.currentSortColumns.findIndex(s => s.columnName === columnName);
                
                if (isCtrlPressed) {
                    if (existingSortIndex >= 0) {
                        window.currentSortColumns[existingSortIndex].direction = 
                            window.currentSortColumns[existingSortIndex].direction === 'asc' ? 'desc' : 'asc';
                    } else {
                        window.currentSortColumns.push({
                            columnName: columnName,
                            direction: 'asc'
                        });
                    }
                } else {
                    window.currentSortColumns = [{
                        columnName: columnName,
                        direction: existingSortIndex >= 0 && 
                                 window.currentSortColumns[existingSortIndex].direction === 'asc' ? 'desc' : 'asc'
                    }];
                }
                
                updateSortIndicators();
                
                if (window.currentTableData) {
                    renderTable();
                    updatePaginationControls();
                    updateURL();
                }
            });
        });
        
        // Восстанавливаем состояние сортировки при загрузке
        updateSortIndicators();
    }
	
	

    function showFilterDropdown(columnName, buttonElement) {
        // Удаляем существующее выпадающее меню, если есть
        const existingDropdown = document.getElementById('filter-dropdown');
        if (existingDropdown && existingDropdown.parentNode) {
            document.body.removeChild(existingDropdown);
            // Если это повторный клик по той же кнопке, просто закрываем меню
            if (existingDropdown.dataset.column === columnName) {
                return;
            }
        }
        
        // Создаем выпадающее меню
        const dropdown = document.createElement('div');
        dropdown.className = 'filter-dropdown';
        dropdown.id = 'filter-dropdown';
        dropdown.dataset.column = columnName;
        
        // Позиционируем относительно кнопки
        const buttonRect = buttonElement.getBoundingClientRect();
        dropdown.style.position = 'absolute';
        dropdown.style.top = `${buttonRect.bottom + window.scrollY}px`;
        dropdown.style.left = `${buttonRect.left + window.scrollX}px`;
        dropdown.style.zIndex = '1000';
        dropdown.style.backgroundColor = 'white';
        dropdown.style.border = '1px solid #ccc';
        dropdown.style.borderRadius = '4px';
        dropdown.style.padding = '10px';
        dropdown.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        dropdown.style.maxHeight = '300px';
        dropdown.style.overflowY = 'auto';
        dropdown.style.width = '250px';
        
        // Поле поиска
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Поиск...';
        searchInput.className = 'filter-search-input';
        searchInput.style.cssText = 'width: 100%; padding: 6px; margin-bottom: 8px; border: 1px solid #ddd; border-radius: 3px;';
        
        // Контейнер для чекбоксов
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'filter-options-container';
        optionsContainer.style.maxHeight = '200px';
        optionsContainer.style.overflowY = 'auto';
        
        // Кнопки действий
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'filter-actions';
        actionsContainer.style.cssText = 'display: flex; justify-content: space-between; margin-top: 10px;';
        
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Применить';
        applyBtn.className = 'filter-apply-btn';
        applyBtn.style.cssText = 'padding: 6px 12px; background-color: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer;';
        
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Сбросить';
        resetBtn.className = 'filter-reset-btn';
        resetBtn.style.cssText = 'padding: 6px 12px; background-color: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer;';
        
        actionsContainer.appendChild(applyBtn);
        actionsContainer.appendChild(resetBtn);
        
        // Получаем уникальные значения для столбца
        const uniqueValues = getUniqueValuesForColumn(columnName);
        
        // Создаем чекбоксы для каждого уникального значения
        uniqueValues.forEach(value => {
            const optionContainer = document.createElement('div');
            optionContainer.className = 'filter-option';
            optionContainer.style.cssText = 'display: flex; align-items: center; margin: 4px 0;';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `filter-${columnName}-${value}`;
            checkbox.value = value;
            checkbox.style.cssText = 'margin-right: 8px;';
            
            // Проверяем, применен ли уже этот фильтр
            if (window.currentColumnFilters[columnName] && 
                window.currentColumnFilters[columnName].includes(value)) {
                checkbox.checked = true;
            }
            
            const label = document.createElement('label');
            label.htmlFor = `filter-${columnName}-${value}`;
            label.textContent = value;
            label.style.cssText = 'cursor: pointer; font-size: 13px;';
            
            optionContainer.appendChild(checkbox);
            optionContainer.appendChild(label);
            optionsContainer.appendChild(optionContainer);
        });
        
        // Добавляем элементы в выпадающее меню
        dropdown.appendChild(searchInput);
        dropdown.appendChild(optionsContainer);
        dropdown.appendChild(actionsContainer);
        
        // Добавляем на страницу
        document.body.appendChild(dropdown);
        
        // Обработчик поиска
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const options = optionsContainer.querySelectorAll('.filter-option');
            
            options.forEach(option => {
                const label = option.querySelector('label');
                const text = label.textContent.toLowerCase();
                option.style.display = text.includes(searchTerm) ? 'flex' : 'none';
            });
        });
        
        // Обработчик применения фильтра
        applyBtn.addEventListener('click', function() {
            const checkedOptions = optionsContainer.querySelectorAll('input[type="checkbox"]:checked');
            const selectedValues = Array.from(checkedOptions).map(option => option.value);
            
            if (selectedValues.length > 0) {
                window.currentColumnFilters[columnName] = selectedValues;
            } else {
                delete window.currentColumnFilters[columnName];
            }
            
            if (window.currentTableData) {
                window.currentPage = 1;
                renderTable();
                updatePaginationControls();
                updateURL();
            }
            
            if (dropdown.parentNode) {
                document.body.removeChild(dropdown);
            }
        });
        
        // Обработчик сброса фильтра
        resetBtn.addEventListener('click', function() {
            delete window.currentColumnFilters[columnName];
            
            if (window.currentTableData) {
                window.currentPage = 1;
                renderTable();
                updatePaginationControls();
                updateURL();
            }
            
            if (dropdown.parentNode) {
                document.body.removeChild(dropdown);
            }
        });
        
        // Закрытие при клике вне выпадающего меню
        const closeDropdown = function(e) {
            if (!dropdown.contains(e.target) && e.target !== buttonElement) {
                if (dropdown.parentNode) {
                    document.body.removeChild(dropdown);
                }
                document.removeEventListener('click', closeDropdown);
            }
        };
        
        document.addEventListener('click', closeDropdown);
    }
    
	function getUniqueValuesForColumn(columnName) {
		if (!window.currentTableData) return [];
		
		const uniqueValues = new Set();
		
		window.currentTableData.edges.forEach(edge => {
			const sourceOIV = window.currentTableData.oiv.find(o => o.id === edge.source);
			const targetOIV = window.currentTableData.oiv.find(o => o.id === edge.target);
			const complex = window.currentTableData.complexes.find(c => c.id === (sourceOIV?.complex || targetOIV?.complex));
			
			if (!sourceOIV || !targetOIV || !complex) return;
			
			let value;
			
			switch(columnName) {
				case 'Комплекс':
					value = complex.name;
					break;
				case 'ОИВ комплекса':
					value = sourceOIV.name;
					break;
				case 'Связанный ОИВ':
					value = targetOIV.name;
					break;
				case 'Связь':
					value = edge.label;
					break;
				case 'Тема':
					value = edge.theme;
					break;
				case 'НПА связи':
					value = edge.edge_doc || '';
					break;
				case 'Стратегия':
					// Получаем все стратегии для sourceOIV
					(sourceOIV.strategies || []).forEach(strategyId => {
						if (strategyId === "В разработке") {
							uniqueValues.add("В разработке");
							return;
						}
						
						let strategy = window.currentTableData.strategies?.find(s => s.id === strategyId) || 
									  window.additionalStrategies?.find(s => s.id === strategyId);
						if (strategy) {
							uniqueValues.add(strategy.name);
						}
					});
					// Также проверяем дополнительные стратегии для edge
					const edgeStrategies = window.additionalStrategies?.filter(s => s.oiv_id === edge.source) || [];
					edgeStrategies.forEach(strategy => {
						uniqueValues.add(strategy.name);
					});
					return Array.from(uniqueValues).sort();
				case 'Гос.программы':
					// Получаем все гос. программы для sourceOIV
					(sourceOIV.programs || []).forEach(programId => {
						const program = window.currentTableData.programs?.find(p => p.id === programId && p.program_type === 0.0);
						if (program) {
							uniqueValues.add(program.name);
						}
					});
					// Также проверяем дополнительные программы
					const govPrograms = window.programsData?.filter(p => p.oiv_id === sourceOIV.id && p.program_type === 0.0) || [];
					govPrograms.forEach(program => {
						uniqueValues.add(program.name);
					});
					return Array.from(uniqueValues).sort();
				case 'Подпрограммы':
					// Получаем все подпрограммы для sourceOIV
					(sourceOIV.programs || []).forEach(programId => {
						const program = window.currentTableData.programs?.find(p => p.id === programId && p.program_type === 1.0);
						if (program) {
							uniqueValues.add(program.name);
						}
					});
					// Также проверяем дополнительные подпрограммы
					const subPrograms = window.programsData?.filter(p => p.oiv_id === sourceOIV.id && p.program_type === 1.0) || [];
					subPrograms.forEach(program => {
						uniqueValues.add(program.name);
					});
					return Array.from(uniqueValues).sort();
				case 'Проект':
					(sourceOIV.projects || []).forEach(projectId => {
						const project = window.currentTableData.projects?.find(p => p.id === projectId);
						if (project) {
							uniqueValues.add(project.name);
						}
					});
					return Array.from(uniqueValues).sort();
				default:
					return;
			}
			
			if (value !== undefined && value !== '') {
				uniqueValues.add(value);
			}
		});
		
		return Array.from(uniqueValues).sort();
	}

    function addResetSortButton() {
        const paginationContainer = document.querySelector('.pagination-controls');
        if (!paginationContainer) return;
        
        // Проверяем, не добавлена ли уже кнопка
        if (document.getElementById('reset-sort-btn')) return;
        
        const resetSortBtn = document.createElement('button');
        resetSortBtn.id = 'reset-sort-btn';
        resetSortBtn.className = 'reset-sort-btn';
        resetSortBtn.textContent = 'Сбросить сортировку';
        resetSortBtn.title = 'Сбросить все настройки сортировки';
        resetSortBtn.style.cssText = 'margin-left: 15px; padding: 6px 12px; background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;';
        
        resetSortBtn.addEventListener('click', function() {
            window.currentSortColumns = [];
            updateSortIndicators();
            
            if (window.currentTableData) {
                renderTable();
                updatePaginationControls();
                updateURL();
            }
        });
        
        paginationContainer.appendChild(resetSortBtn);
    }

    function updateSortIndicators() {
        const headers = document.querySelectorAll('#data-table thead th:not(.filter-cell)');
        
        // Удаляем все индикаторы сортировки
        headers.forEach(h => {
            const headerContainer = h.querySelector('.header-container');
            if (headerContainer) {
                headerContainer.classList.remove('sorted-asc', 'sorted-desc', 'sorted-multi');
                const sortBtn = headerContainer.querySelector('.sort-btn');
                if (sortBtn) {
                    sortBtn.innerHTML = '↑↓';
                    sortBtn.removeAttribute('title');
                }
            }
        });
        
        // Добавляем индикаторы для текущих столбцов сортировки
        window.currentSortColumns.forEach((sort, index) => {
            const header = Array.from(headers).find(h => {
                const headerText = h.querySelector('.header-text');
                return headerText && headerText.textContent.trim() === sort.columnName;
            });
            
            if (header) {
                const headerContainer = header.querySelector('.header-container');
                if (headerContainer) {
                    headerContainer.classList.add(`sorted-${sort.direction}`);
                    
                    // Для множественной сортировки добавляем номер приоритета
                    if (window.currentSortColumns.length > 1) {
                        headerContainer.classList.add('sorted-multi');
                        const sortBtn = headerContainer.querySelector('.sort-btn');
                        if (sortBtn) {
                            sortBtn.innerHTML = sort.direction === 'asc' ? `↑${index + 1}` : `↓${index + 1}`;
                            sortBtn.setAttribute('title', `Уровень сортировки: ${index + 1}`);
                        }
                    } else {
                        const sortBtn = headerContainer.querySelector('.sort-btn');
                        if (sortBtn) {
                            sortBtn.innerHTML = sort.direction === 'asc' ? '↑' : '↓';
                            sortBtn.setAttribute('title', 'Сортировка. Для множественной сортировки удерживайте Ctrl и кликайте по столбцам');
                        }
                    }
                }
            }
        });
        
        // Добавляем/обновляем кнопку сброса сортировки
        addResetSortButton();
    }

    function updateURL() {
        const params = new URLSearchParams();
        
        if (window.currentComplexFilter) {
            params.set('complex', window.currentComplexFilter);
        }
        
        if (window.currentSearchTerm) {
            params.set('search', window.currentSearchTerm);
        }
        
        // Сохраняем параметры сортировки
        window.currentSortColumns.forEach((sort, index) => {
            params.set(`sort_${index}`, sort.columnName);
            params.set(`dir_${index}`, sort.direction);
        });
        
        Object.keys(window.currentColumnFilters).forEach(column => {
            params.set(`filter_${encodeURIComponent(column)}`, JSON.stringify(window.currentColumnFilters[column]));
        });
        
        params.set('page', window.currentPage);
        
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState(null, '', newUrl);
    }


    function parseURL() {
        const params = new URLSearchParams(window.location.search);
        
        if (params.has('complex')) {
            window.currentComplexFilter = params.get('complex');
        }
        
        if (params.has('search')) {
            window.currentSearchTerm = params.get('search');
            document.getElementById('global-search').value = window.currentSearchTerm;
        }
        
        // Сбрасываем текущие фильтры столбцов
        window.currentColumnFilters = {};
        
        params.forEach((value, key) => {
            if (key.startsWith('filter_')) {
                const columnName = decodeURIComponent(key.substring(7));
                try {
                    window.currentColumnFilters[columnName] = JSON.parse(value);
                } catch (e) {
                    window.currentColumnFilters[columnName] = [value];
                }
            }
        });
        
        if (params.has('page')) {
            window.currentPage = parseInt(params.get('page')) || 1;
        }

        // Восстанавливаем параметры сортировки
        window.currentSortColumns = [];
        let index = 0;
        while (params.has(`sort_${index}`)) {
            const columnName = params.get(`sort_${index}`);
            const direction = params.get(`dir_${index}`) || 'asc';
            window.currentSortColumns.push({ columnName, direction });
            index++;
        }
    }
    
    // Функция для получения текущих отфильтрованных данных
    window.getCurrentTableData = function() {
        return window.currentFilteredData || window.currentTableData;
    };
    
    // Функция для обновления таблицы с пагинацией
    window.updateTableView = function(data) {
        window.currentFilteredData = data;
        window.currentPage = 1;
        renderTable();
        updatePaginationControls();
        updateURL();
    };
    
    // Функция для рендеринга таблицы
    function renderTable() {
        const tableBody = document.getElementById('table-body');
        if (!tableBody) return;

        const currentFilters = {
            complex: window.currentComplexFilter,
            search: window.currentSearchTerm,
            columnFilters: {...window.currentColumnFilters},
            sortColumns: [...window.currentSortColumns],
            page: window.currentPage
        };        
        
        tableBody.innerHTML = '';
        
        const data = window.getCurrentTableData();
        if (!data || !data.edges || data.edges.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = document.querySelectorAll('#data-table thead th').length;
            cell.textContent = 'Нет данных для отображения';
            cell.className = 'no-data';
            row.appendChild(cell);
            tableBody.appendChild(row);
            return;
        }
        
        let filteredEdges = applyAllFilters(data.edges, data);
        
        const startIndex = (window.currentPage - 1) * window.rowsPerPage;
        const endIndex = startIndex + window.rowsPerPage;
        const paginatedEdges = filteredEdges.slice(startIndex, endIndex);
        
        // Получаем текущий порядок столбцов из DOM
        const headers = Array.from(document.querySelectorAll('#data-table thead th:not(.filter-cell)'));
        const columnOrder = headers.map(header => {
            const headerText = header.querySelector('.header-text');
            return headerText ? headerText.textContent.trim() : header.textContent.trim();
        });
        
        paginatedEdges.forEach(edge => {
            const sourceOIV = data.oiv.find(o => o.id === edge.source);
            const targetOIV = data.oiv.find(o => o.id === edge.target);
            const complex = data.complexes.find(c => c.id === (sourceOIV?.complex || targetOIV?.complex));
            
            if (!sourceOIV || !targetOIV || !complex) return;
            
            const row = document.createElement('tr');
            
            // Создаем ячейки в соответствии с текущим порядком столбцов
            columnOrder.forEach(columnName => {
                const cell = document.createElement('td');
                
                switch(columnName) {
                    case 'Комплекс':
                        cell.textContent = complex.name;
                        break;
                    case 'ОИВ комплекса':
                        cell.innerHTML = `<div>${sourceOIV.name}</div>`;
                        break;
                    case 'Связанный ОИВ':
                        cell.innerHTML = `<div>${targetOIV.name}</div>`;
                        break;
                    case 'Связь':
                        cell.textContent = edge.label;
                        break;
                    case 'Тема':
                        cell.textContent = edge.theme;
                        break;
                    case 'НПА связи':
                        cell.textContent = edge.edge_doc || '';
                        break;
                    case 'Стратегия':
                        const edgeStrategies = window.additionalStrategies?.filter(s => s.oiv_id === edge.source) || [];
                        let strategyContent = '';
                        (sourceOIV.strategies || []).forEach(strategyId => {
                            let strategy = data.strategies?.find(s => s.id === strategyId) || 
                                          window.additionalStrategies?.find(s => s.id === strategyId);
                            if (strategy) {
                                strategyContent += `${strategy.name}<br>`;
                            }                
                        });
                        edgeStrategies.forEach(strategy => {
                            strategyContent += `${strategy.name}<br>`;
                        });
                        cell.innerHTML = strategyContent;
                        break;
                    case 'Гос.программы':
                        const programsContent = (window.programsData || [])
                            .filter(program => program.oiv_id === sourceOIV.id && program.program_type === 0.0)
                            .map(program => program.name)
                            .join('<br>');
                        cell.innerHTML = programsContent;
                        break;
                    case 'Подпрограммы':
                        const subprogramsContent = (window.programsData || [])
                            .filter(program => program.oiv_id === sourceOIV.id && program.program_type === 1.0)
                            .map(program => program.name)
                            .join('<br>');
                        cell.innerHTML = subprogramsContent;
                        break;
                    case 'Проект':
                        const projectsContent = (sourceOIV.projects || [])
                            .map(projectId => {
                                const project = data.projects?.find(p => p.id === projectId);
                                return project ? project.name : '';
                            })
                            .filter(name => name)
                            .join('<br>');
                        cell.innerHTML = projectsContent;
                        break;
                    default:
                        cell.textContent = '';
                }
                
                row.appendChild(cell);
            });
            
            tableBody.appendChild(row);
        });
        
        updatePaginationInfo(filteredEdges.length);
        
        window.currentComplexFilter = currentFilters.complex;
        window.currentSearchTerm = currentFilters.search;
        window.currentColumnFilters = currentFilters.columnFilters;
        window.currentSortColumns = currentFilters.sortColumns;
        window.currentPage = currentFilters.page;        
    }
    
    // Функция для обновления информации о пагинации
    function updatePaginationInfo(totalRows) {
        const totalPages = Math.ceil(totalRows / window.rowsPerPage);
        const paginationInfo = document.getElementById('pagination-info');
        
        if (paginationInfo) {
            const startItem = ((window.currentPage - 1) * window.rowsPerPage) + 1;
            const endItem = Math.min(window.currentPage * window.rowsPerPage, totalRows);
            
            paginationInfo.textContent = `Показано ${startItem}-${endItem} из ${totalRows} записей`;
        }
    }
    
    // Функция для обновления элементов управления пагинацией
    function updatePaginationControls() {
        const data = window.getCurrentTableData();
        if (!data || !data.edges) return;
        
        let filteredEdges = applyAllFilters(data.edges, data);
        const totalRows = filteredEdges.length;
        const totalPages = Math.ceil(totalRows / window.rowsPerPage);
        
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pageNumbersContainer = document.getElementById('page-numbers');
        
        if (prevBtn) prevBtn.disabled = window.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = window.currentPage >= totalPages;
        
        if (pageNumbersContainer) {
            pageNumbersContainer.innerHTML = '';
            
            const maxVisiblePages = 5;
            let startPage = Math.max(1, window.currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            
            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
            
            if (startPage > 1) {
                const firstPageBtn = document.createElement('button');
                firstPageBtn.className = 'page-number';
                firstPageBtn.textContent = '1';
                firstPageBtn.addEventListener('click', () => goToPage(1));
                pageNumbersContainer.appendChild(firstPageBtn);
                
                if (startPage > 2) {
                    const ellipsis = document.createElement('span');
                    ellipsis.textContent = '...';
                    pageNumbersContainer.appendChild(ellipsis);
                }
            }
            
            for (let i = startPage; i <= endPage; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.className = `page-number ${i === window.currentPage ? 'active' : ''}`;
                pageBtn.textContent = i;
                pageBtn.addEventListener('click', () => goToPage(i));
                pageNumbersContainer.appendChild(pageBtn);
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    const ellipsis = document.createElement('span');
                    ellipsis.textContent = '...';
                    pageNumbersContainer.appendChild(ellipsis);
                }
                
                const lastPageBtn = document.createElement('button');
                lastPageBtn.className = 'page-number';
                lastPageBtn.textContent = totalPages;
                lastPageBtn.addEventListener('click', () => goToPage(totalPages));
                pageNumbersContainer.appendChild(lastPageBtn);
            }
        }
    }
    
    // Функция для перехода на конкретную страницу
    function goToPage(page) {
        const data = window.getCurrentTableData();
        if (!data || !data.edges) return;
        
        let filteredEdges = applyAllFilters(data.edges, data);
        const totalPages = Math.ceil(filteredEdges.length / window.rowsPerPage);
        page = Math.max(1, Math.min(page, totalPages));
        
        if (page !== window.currentPage) {
            window.currentPage = page;
            renderTable();
            updatePaginationControls();
            updateURL();
        }
    }
    
    // Функция для применения всех фильтров
    function applyAllFilters(edges, data) {
        let filteredEdges = [...edges];
        
        if (window.currentComplexFilter) {
            filteredEdges = filteredEdges.filter(edge => {
                const sourceOIV = data.oiv.find(o => o.id === edge.source);
                const targetOIV = data.oiv.find(o => o.id === edge.target);
                const complex = data.complexes.find(c => c.id === (sourceOIV?.complex || targetOIV?.complex));
                return complex && complex.id === window.currentComplexFilter;
            });
        }
        
        if (window.currentSearchTerm) {
            const searchTerm = window.currentSearchTerm.toLowerCase();
            filteredEdges = filteredEdges.filter(edge => {
                const sourceOIV = data.oiv.find(o => o.id === edge.source);
                const targetOIV = data.oiv.find(o => o.id === edge.target);
                const complex = data.complexes.find(c => c.id === (sourceOIV?.complex || targetOIV?.complex));
                
                if (!sourceOIV || !targetOIV || !complex) return false;
                
                return (
                    complex.name.toLowerCase().includes(searchTerm) ||
                    sourceOIV.name.toLowerCase().includes(searchTerm) ||
                    targetOIV.name.toLowerCase().includes(searchTerm) ||
                    edge.label.toLowerCase().includes(searchTerm) ||
                    edge.theme.toLowerCase().includes(searchTerm) ||
                    edge.edge_doc && edge.edge_doc.toLowerCase().includes(searchTerm) ||
                    (sourceOIV.strategies || []).some(strategyId => {
                        // Проверяем, является ли значение ID или строкой "В разработке"
                        if (strategyId === "В разработке") {
                            return "в разработке".includes(searchTerm);
                        }
                        
                        // Ищем стратегию сначала в основном data.json
                        let strategy = data.strategies?.find(s => s.id === strategyId);
                        
                        // Если не найдено в основном файле, ищем в additionalStrategies
                        if (!strategy && window.additionalStrategies) {
                            strategy = window.additionalStrategies.find(s => s.id === strategyId);
                        }
                        
                        return strategy && strategy.name.toLowerCase().includes(searchTerm);
                    }) ||
                    (sourceOIV.programs || []).some(programId => {
                        const program = data.programs?.find(p => p.id === programId);
                        return program && program.name.toLowerCase().includes(searchTerm);
                    }) ||
                    (sourceOIV.projects || []).some(projectId => {
                        const project = data.projects?.find(p => p.id === projectId);
                        return project && project.name.toLowerCase().includes(searchTerm);
                    })
                );
            });
        }
        
		Object.keys(window.currentColumnFilters).forEach(columnName => {
			const filterValues = window.currentColumnFilters[columnName].map(v => v.toLowerCase());
			if (filterValues.length === 0) return;
			
			filteredEdges = filteredEdges.filter(edge => {
				const sourceOIV = data.oiv.find(o => o.id === edge.source);
				const targetOIV = data.oiv.find(o => o.id === edge.target);
				const complex = data.complexes.find(c => c.id === (sourceOIV?.complex || targetOIV?.complex));
				
				if (!sourceOIV || !targetOIV || !complex) return false;
				
				switch(columnName) {
					case 'Комплекс':
						return filterValues.includes(complex.name.toLowerCase());
					case 'ОИВ комплекса':
						return filterValues.includes(sourceOIV.name.toLowerCase());
					case 'Связанный ОИВ':
						return filterValues.includes(targetOIV.name.toLowerCase());
					case 'Связь':
						return filterValues.includes(edge.label.toLowerCase());
					case 'Тема':
						return filterValues.includes(edge.theme.toLowerCase());
					case 'НПА связи':
						return edge.edge_doc && filterValues.includes(edge.edge_doc.toLowerCase());                
					case 'Стратегия':
						// Проверяем основные стратегии
						const hasMainStrategy = (sourceOIV.strategies || []).some(strategyId => {
							if (strategyId === "В разработке") {
								return filterValues.includes("в разработке");
							}
							
							let strategy = data.strategies?.find(s => s.id === strategyId);
							if (!strategy && window.additionalStrategies) {
								strategy = window.additionalStrategies.find(s => s.id === strategyId);
							}
							return strategy && filterValues.includes(strategy.name.toLowerCase());
						});
						
						// Проверяем дополнительные стратегии
						const hasAdditionalStrategy = (window.additionalStrategies || [])
							.filter(s => s.oiv_id === sourceOIV.id)
							.some(strategy => filterValues.includes(strategy.name.toLowerCase()));
						
						return hasMainStrategy || hasAdditionalStrategy;
					case 'Гос.программы':
						// Проверяем основные программы
						const hasMainProgram = (sourceOIV.programs || []).some(programId => {
							const program = data.programs?.find(p => p.id === programId && p.program_type === 0.0);
							return program && filterValues.includes(program.name.toLowerCase());
						});
						
						// Проверяем дополнительные программы
						const hasAdditionalProgram = (window.programsData || [])
							.filter(p => p.oiv_id === sourceOIV.id && p.program_type === 0.0)
							.some(program => filterValues.includes(program.name.toLowerCase()));
						
						return hasMainProgram || hasAdditionalProgram;
					case 'Подпрограммы':
						// Проверяем основные подпрограммы
						const hasMainSubprogram = (sourceOIV.programs || []).some(programId => {
							const program = data.programs?.find(p => p.id === programId && p.program_type === 1.0);
							return program && filterValues.includes(program.name.toLowerCase());
						});
						
						// Проверяем дополнительные подпрограммы
						const hasAdditionalSubprogram = (window.programsData || [])
							.filter(p => p.oiv_id === sourceOIV.id && p.program_type === 1.0)
							.some(program => filterValues.includes(program.name.toLowerCase()));
						
						return hasMainSubprogram || hasAdditionalSubprogram;
					case 'Проект':
						return (sourceOIV.projects || []).some(projectId => {
							const project = data.projects?.find(p => p.id === projectId);
							return project && filterValues.includes(project.name.toLowerCase());
						});
					default:
						return true;
				}
			});
		});

        if (window.currentSortColumns.length > 0) {
            const sortedData = sortData({ ...data, edges: filteredEdges }, window.currentSortColumns);
            filteredEdges = sortedData.edges;
        }
            
        return filteredEdges;
    }
    
    // Обработчики кнопок пагинации
    document.getElementById('prev-page')?.addEventListener('click', () => goToPage(window.currentPage - 1));
    document.getElementById('next-page')?.addEventListener('click', () => goToPage(window.currentPage + 1));
    
    // Инициализация таблицы при загрузке
    Promise.all([
        fetch('/data/data.json').then(res => res.json()),
        fetch('/data/strategies.json').then(res => res.json()),
        fetch('/data/programs.json').then(res => res.json())
    ]).then(([tableData, strategiesData, programsData]) => {
        window.currentTableData = tableData;
        window.additionalStrategies = strategiesData;
        window.programsData = programsData;
        
        // Парсим URL при загрузке
        parseURL();
        
        renderTable();
        updatePaginationControls();
        setupColumnSorting();
        
        // Инициализируем перетаскивание после рендеринга таблицы
        initializeColumnDragging();
        
        // Если есть параметры в URL, обновляем URL для корректного отображения
        if (window.location.search) {
            updateURL();
        }
        
        // Добавляем кнопку сброса сортировки
        addResetSortButton();
    });
    
    // Управление видимостью столбцов
    const columnToggleBtn = document.getElementById('column-toggle');
    const columnModal = document.getElementById('column-selector-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const applyColumnsBtn = document.getElementById('apply-columns');
    const cancelColumnsBtn = document.getElementById('cancel-columns');
    const selectAllBtn = document.getElementById('select-all-columns');
    const deselectAllBtn = document.getElementById('deselect-all-columns');
    
    // Загрузка сохраненных столбцов из localStorage
    const savedColumns = localStorage.getItem('selectedColumns');
    const selectedColumns = savedColumns ? JSON.parse(savedColumns) : null;
    
    if (columnToggleBtn && columnModal) {
        columnToggleBtn.addEventListener('click', function() {
            const headers = Array.from(document.querySelectorAll('#data-table thead th'));
            const columnSelectorBody = document.getElementById('column-selector-body');
            columnSelectorBody.innerHTML = '';
            
            headers.forEach((header, index) => {
                if (header.classList.contains('filter-cell')) return;
                
                const headerText = header.querySelector('.header-text');
                const columnName = headerText ? (headerText.textContent ? headerText.textContent.trim() : header.textContent.trim()) : header.textContent.trim();                
                const checkboxId = `column-${index}`;
                
                const checkboxContainer = document.createElement('div');
                checkboxContainer.className = 'column-checkbox';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = checkboxId;
                checkbox.dataset.columnIndex = index;
                
                // Проверяем, скрыт ли столбец
                const isHidden = header.style.display === 'none';
                checkbox.checked = !isHidden;
                
                const label = document.createElement('label');
                label.htmlFor = checkboxId;
                label.textContent = columnName;
                
                checkboxContainer.appendChild(checkbox);
                checkboxContainer.appendChild(label);
                columnSelectorBody.appendChild(checkboxContainer);
            });
            
            columnModal.style.display = 'block';
        });
        
        closeModalBtn.addEventListener('click', function() {
            columnModal.style.display = 'none';
        });
        
        cancelColumnsBtn.addEventListener('click', function() {
            columnModal.style.display = 'none';
        });
        
        window.addEventListener('click', function(event) {
            if (event.target === columnModal) {
                columnModal.style.display = 'none';
            }
        });
        
        applyColumnsBtn.addEventListener('click', function() {
            const checkboxes = document.querySelectorAll('#column-selector-body input[type="checkbox"]');
            const columnsToShow = [];
            
            checkboxes.forEach(checkbox => {
                const columnIndex = parseInt(checkbox.dataset.columnIndex);
                const header = document.querySelectorAll('#data-table thead th')[columnIndex];
                const filterCell = document.querySelectorAll('#data-table thead .filter-cell')[columnIndex];
                const cells = document.querySelectorAll(`#data-table tbody td:nth-child(${columnIndex + 1})`);
                
                if (checkbox.checked) {
                    if (header) header.style.display = '';
                    if (filterCell) filterCell.style.display = '';
                    cells.forEach(cell => cell.style.display = '');
                    
                    const headerText = header.querySelector('.header-text');
                    const columnName = headerText ? headerText.textContent.trim() : header.textContent.trim();
                    columnsToShow.push(columnName);
                } else {
                    if (header) header.style.display = 'none';
                    if (filterCell) filterCell.style.display = 'none';
                    cells.forEach(cell => cell.style.display = 'none');
                }
            });
            
            // Сохраняем выбранные столбцы в localStorage
            localStorage.setItem('selectedColumns', JSON.stringify(columnsToShow));
            
            columnModal.style.display = 'none';
        });
        
        selectAllBtn.addEventListener('click', function() {
            const checkboxes = document.querySelectorAll('#column-selector-body input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
        });
        
        deselectAllBtn.addEventListener('click', function() {
            const checkboxes = document.querySelectorAll('#column-selector-body input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        });
    }
    
    // Применяем сохраненные настройки столбцов при загрузке
    if (selectedColumns) {
        const headers = document.querySelectorAll('#data-table thead th');
        headers.forEach((header, index) => {
            if (header.classList.contains('filter-cell')) return;
            
            const headerText = header.querySelector('.header-text');
            const columnName = headerText ? headerText.textContent.trim() : header.textContent.trim();
            const filterCell = document.querySelectorAll('#data-table thead .filter-cell')[index];
            const cells = document.querySelectorAll(`#data-table tbody td:nth-child(${index + 1})`);
            
            if (selectedColumns.includes(columnName)) {
                if (header) header.style.display = '';
                if (filterCell) filterCell.style.display = '';
                cells.forEach(cell => cell.style.display = '');
            } else {
                if (header) header.style.display = 'none';
                if (filterCell) filterCell.style.display = 'none';
                cells.forEach(cell => cell.style.display = 'none');
            }
        });
    }
    
    // Обработчик кнопки сброса фильтров
    document.getElementById('reset-filters')?.addEventListener('click', function() {
        window.currentComplexFilter = null;
        window.currentSearchTerm = '';
        window.currentColumnFilters = {};
        window.currentPage = 1;
        
        // Закрываем все открытые выпадающие меню фильтров
        document.querySelectorAll('.filter-dropdown').forEach(dropdown => {
            if (dropdown.parentNode) {
                document.body.removeChild(dropdown);
            }
        });
        
        // Сбрасываем значение поиска
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.value = '';
        }
        
        if (window.currentTableData) {
            renderTable();
            updatePaginationControls();
            updateURL();
        }
    });
	
	document.getElementById('reset-sort')?.addEventListener('click', function() {
		window.currentSortColumns = [];
		updateSortIndicators();
		
		if (window.currentTableData) {
			renderTable();
			updatePaginationControls();
			updateURL();
		}
	});	
	

    window.addEventListener('popstate', function() {
        parseURL();
        if (window.currentTableData) {
            renderTable();
            updatePaginationControls();
        }
    });
    
    function setupColumnDragging() {
        const table = document.getElementById('data-table');
        if (!table) return;

        const headers = Array.from(table.querySelectorAll('thead th:not(.filter-cell)'));
        const filterCells = Array.from(table.querySelectorAll('thead .filter-cell'));
        let draggedHeader = null;
        let draggedIndex = null;
        let isDragging = false;

        headers.forEach((header, index) => {
            header.setAttribute('draggable', 'true');
            header.style.cursor = 'grab';

            header.addEventListener('dragstart', (e) => {
                isDragging = true;
                draggedHeader = header;
                draggedIndex = index;
                e.dataTransfer.setData('text/plain', index);
                e.dataTransfer.effectAllowed = 'move';
                header.classList.add('dragging');
                
                const dragImage = header.cloneNode(true);
                dragImage.classList.add('drag-image');
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
                
                setTimeout(() => {
                    if (dragImage.parentNode) {
                        document.body.removeChild(dragImage);
                    }
                }, 0);
            });

            header.addEventListener('dragend', () => {
                isDragging = false;
                headers.forEach(h => {
                    h.classList.remove('dragging');
                    h.style.opacity = '';
                });
                draggedHeader = null;
                draggedIndex = null;
                
                document.querySelectorAll('.drag-placeholder').forEach(el => {
                    el.parentNode.removeChild(el);
                });
            });

            header.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const rect = header.getBoundingClientRect();
                const midX = rect.left + rect.width / 2;
                
                document.querySelectorAll('.drag-placeholder').forEach(el => {
                    el.parentNode.removeChild(el);
                });
                
                const placeholder = document.createElement('div');
                placeholder.className = 'drag-placeholder';
                placeholder.style.height = `${rect.height}px`;
                placeholder.style.top = `${rect.top + window.scrollY}px`;
                
                if (e.clientX < midX) {
                    placeholder.style.left = `${rect.left + window.scrollX}px`;
                } else {
                    placeholder.style.left = `${rect.right + window.scrollX - 4}px`;
                }
                
                document.body.appendChild(placeholder);
            });

            header.addEventListener('dragleave', () => {
                document.querySelectorAll('.drag-placeholder').forEach(el => {
                    el.parentNode.removeChild(el);
                });
            });

            header.addEventListener('drop', (e) => {
                e.preventDefault();
                
                document.querySelectorAll('.drag-placeholder').forEach(el => {
                    el.parentNode.removeChild(el);
                });
                
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = headers.indexOf(header);
                
                // Если перетаскивание на то же место - ничего не делаем
                if (fromIndex === toIndex) return;
                
                // Обновляем originalColumnOrder при перетаскивании
                const headerText = draggedHeader.querySelector('.header-text');
                const columnName = headerText ? headerText.textContent.trim() : draggedHeader.textContent.trim();
                
                // Удаляем столбец из исходной позиции
                const removedColumn = window.originalColumnOrder.splice(fromIndex, 1)[0];
                // Вставляем в новую позицию
                window.originalColumnOrder.splice(toIndex, 0, removedColumn);
                
                // Перемещаем заголовок
                header.parentNode.insertBefore(draggedHeader, header);
                
                // Перемещаем ячейку фильтра
                const draggedFilterCell = filterCells[fromIndex];
                if (draggedFilterCell) {
                    const filterRow = document.querySelector('.filter-row');
                    if (filterRow) {
                        filterRow.insertBefore(draggedFilterCell, filterCells[toIndex]);
                    }
                }
                
                // Обновляем массивы заголовков и ячеек фильтров
                const movedHeader = headers.splice(fromIndex, 1)[0];
                headers.splice(toIndex, 0, movedHeader);
                
                const movedFilterCell = filterCells.splice(fromIndex, 1)[0];
                if (movedFilterCell) {
                    filterCells.splice(toIndex, 0, movedFilterCell);
                }
                
                // Перемещаем ячейки данных
                const rows = table.querySelectorAll('tbody tr');
                
                rows.forEach(row => {
                    const cells = Array.from(row.children);
                    const cellToMove = cells[fromIndex];
                    cells.splice(fromIndex, 1);
                    cells.splice(toIndex, 0, cellToMove);
                    
                    while (row.firstChild) {
                        row.removeChild(row.firstChild);
                    }
                    cells.forEach(c => row.appendChild(c));
                });
                
                saveColumnOrder();
                
                // Обновляем отображение таблицы с новым порядком столбцов
                if (window.currentTableData) {
                    renderTable();
                    updatePaginationControls();
                }
            });
        });
    }

    function saveColumnOrder() {
        const headers = Array.from(document.querySelectorAll('#data-table thead th:not(.filter-cell)'));
        const columnOrder = headers.map(header => {
            const headerText = header.querySelector('.header-text');
            return headerText ? headerText.textContent.trim() : header.textContent.trim();
        });
        localStorage.setItem('columnOrder', JSON.stringify(columnOrder));
        // Сохраняем текущий порядок в отдельной переменной
        window.savedColumnOrder = [...columnOrder];
    }

	function loadColumnOrder() {
		const savedOrder = localStorage.getItem('columnOrder');
		if (!savedOrder) return false;

		const columnOrder = JSON.parse(savedOrder);
		const currentHeaders = Array.from(document.querySelectorAll('#data-table thead th:not(.filter-cell)'));
		
		// Проверяем, что элементы существуют
		if (currentHeaders.length === 0) return false;
		
		const currentOrder = currentHeaders.map(header => {
			const headerText = header.querySelector('.header-text');
			return headerText ? headerText.textContent.trim() : header.textContent.trim();
		});

		if (JSON.stringify(columnOrder) === JSON.stringify(currentOrder)) {
			return false;
		}

		const table = document.getElementById('data-table');
		const headerRow = table.querySelector('thead tr:first-child');
		const filterRow = table.querySelector('thead .filter-row');
		const bodyRows = table.querySelectorAll('tbody tr');

		// Проверяем, что все необходимые элементы существуют
		if (!headerRow || !filterRow || bodyRows.length === 0) {
			return false;
		}

		const columnIndexMap = {};
		currentHeaders.forEach((header, index) => {
			const headerText = header.querySelector('.header-text');
			const columnName = headerText ? headerText.textContent.trim() : header.textContent.trim();
			columnIndexMap[columnName] = index;
		});

		headerRow.innerHTML = '';
		filterRow.innerHTML = '';
		
		columnOrder.forEach(columnName => {
			const index = columnIndexMap[columnName];
			if (index !== undefined) {
				headerRow.appendChild(currentHeaders[index]);
				
				const filterCells = document.querySelectorAll('#data-table thead .filter-cell');
				if (filterCells[index]) {
					filterRow.appendChild(filterCells[index]);
				}
			}
		});

		bodyRows.forEach(row => {
			const cells = Array.from(row.children);
			const newCells = [];
			
			columnOrder.forEach(columnName => {
				const index = columnIndexMap[columnName];
				if (index !== undefined && cells[index]) {
					newCells.push(cells[index]);
				}
			});
			
			row.innerHTML = '';
			newCells.forEach(cell => row.appendChild(cell));
		});

		return true;
	}

    function resetColumnOrder() {
        const table = document.getElementById('data-table');
        if (!table) return;

        // Сохраняем текущий порядок перед сбросом
        const currentHeaders = Array.from(document.querySelectorAll('#data-table thead th:not(.filter-cell)'));
        window.savedColumnOrder = currentHeaders.map(header => {
            const headerText = header.querySelector('.header-text');
            return headerText ? headerText.textContent.trim() : header.textContent.trim();
        });

        const headerRow = table.querySelector('thead tr:first-child');
        const filterRow = table.querySelector('thead .filter-row');
        const bodyRows = table.querySelectorAll('tbody tr');
        
        const headers = Array.from(headerRow.querySelectorAll('th:not(.filter-cell)'));
        const filterCells = Array.from(filterRow.querySelectorAll('th.filter-cell'));
        const bodyCells = Array.from(bodyRows).map(row => Array.from(row.children));
        
        const newOrder = [];
        
        // Используем исходный порядок из window.originalColumnOrder
        const originalOrder = ['Комплекс', 'ОИВ комплекса', 'Связанный ОИВ', 'Связь', 'Тема', 'НПА связи', 'Стратегия', 'Гос.программы', 'Подпрограммы', 'Проект'];
        
        originalOrder.forEach(columnName => {
            const index = headers.findIndex(header => {
                const headerText = header.querySelector('.header-text');
                return (headerText ? headerText.textContent.trim() : header.textContent.trim()) === columnName;
            });
            
            if (index !== -1) {
                newOrder.push({
                    header: headers[index],
                    filterCell: filterCells[index],
                    bodyCells: bodyCells.map(row => row[index])
                });
            }
        });
        
        headerRow.innerHTML = '';
        filterRow.innerHTML = '';
        bodyRows.forEach(row => row.innerHTML = '');
        
        newOrder.forEach((column, index) => {
            headerRow.appendChild(column.header);
            
            if (column.filterCell) {
                filterRow.appendChild(column.filterCell);
            }
            
            column.bodyCells.forEach((cell, rowIndex) => {
                if (cell && bodyRows[rowIndex]) {
                    bodyRows[rowIndex].appendChild(cell);
                }
            });
        });
        
        // Обновляем originalColumnOrder
        window.originalColumnOrder = [...originalOrder];
        saveColumnOrder();
        
        if (window.currentTableData) {
            renderTable();
            updatePaginationControls();
        }
    }

    function restoreSavedColumnOrder() {
        if (!window.savedColumnOrder) return;

        const table = document.getElementById('data-table');
        if (!table) return;

        const headerRow = table.querySelector('thead tr:first-child');
        const filterRow = table.querySelector('thead .filter-row');
        const bodyRows = table.querySelectorAll('tbody tr');

        const currentHeaders = Array.from(headerRow.querySelectorAll('th:not(.filter-cell)'));
        const currentFilterCells = Array.from(filterRow.querySelectorAll('th.filter-cell'));
        const currentBodyCells = Array.from(bodyRows).map(row => Array.from(row.children));

        const columnIndexMap = {};
        currentHeaders.forEach((header, index) => {
            const headerText = header.querySelector('.header-text');
            const columnName = headerText ? headerText.textContent.trim() : header.textContent.trim();
            columnIndexMap[columnName] = index;
        });

        headerRow.innerHTML = '';
        filterRow.innerHTML = '';
        bodyRows.forEach(row => row.innerHTML = '');

        window.savedColumnOrder.forEach(columnName => {
            const index = columnIndexMap[columnName];
            if (index !== undefined) {
                headerRow.appendChild(currentHeaders[index]);
                
                if (currentFilterCells[index]) {
                    filterRow.appendChild(currentFilterCells[index]);
                }
            }
        });

        bodyRows.forEach((row, rowIndex) => {
            window.savedColumnOrder.forEach(columnName => {
                const index = columnIndexMap[columnName];
                if (index !== undefined && currentBodyCells[rowIndex][index]) {
                    row.appendChild(currentBodyCells[rowIndex][index]);
                }
            });
        });

        window.originalColumnOrder = [...window.savedColumnOrder];
        saveColumnOrder();
        
        if (window.currentTableData) {
            renderTable();
            updatePaginationControls();
        }
    }	

	function initializeColumnDragging() {
		// Откладываем инициализацию перетаскивания до полной загрузки таблицы
		setTimeout(() => {
			const orderChanged = loadColumnOrder();
			setupColumnDragging();

			if (orderChanged && window.currentTableData) {
				renderTable();
				updatePaginationControls();
			}
			
			// Добавляем обработчик для кнопки сброса порядка столбцов
			document.getElementById('reset-column-order')?.addEventListener('click', resetColumnOrder);
			
			// Добавляем обработчик для восстановления сохраненного порядка
			document.getElementById('restore-column-order')?.addEventListener('click', restoreSavedColumnOrder);
		}, 100); // Небольшая задержка для гарантии загрузки DOM
	}
	
	add3DSwitchButton();
	window.addEventListener('load', function() {
		// Применяем сохраненные фильтры при загрузке
		const savedFilters = localStorage.getItem('savedFilters');
		if (savedFilters) {
			const filters = JSON.parse(savedFilters);
			setTimeout(() => {
				if (window.applyCascadeFilter) {
					window.applyCascadeFilter(filters);
				}
			}, 500);
		}
	});
	
});

window.switchTo3DView = function() {
    // Получаем текущие фильтры из таблицы
    const currentFilters = window.getCurrentTableFilters();
    
    // Сохраняем фильтры
    localStorage.setItem('savedFilters', JSON.stringify(currentFilters));
    
    // Переключаемся на 3D представление
    window.location.href = '/';
};

window.apply3DViewFilters = function(filters) {
    if (!filters) return;
    
    // Применяем фильтры к 3D сцене
    if (window.applyCascadeFilter) {
        window.applyCascadeFilter(filters);
    }
    
    // Очищаем pending фильтры
    window.pending3DViewFilters = null;
};

// Функция для применения фильтров из 3D представления
window.applyCascadeFilter = function(filterParams) {
    if (!filterParams) return;
    
    // Сбрасываем текущие фильтры
    window.currentComplexFilter = null;
    window.currentSearchTerm = '';
    window.currentColumnFilters = {};
    window.currentPage = 1;
    
    // Применяем фильтры комплексов
    if (filterParams.complexes && filterParams.complexes.length > 0) {
        const complexNames = filterParams.complexes.map(complexId => {
            const complex = window.currentTableData.complexes.find(c => c.id === complexId);
            return complex ? complex.name : complexId;
        });
        window.currentColumnFilters['Комплекс'] = complexNames;
    }
    
    // Применяем фильтры OIV
    if (filterParams.oiv && filterParams.oiv.length > 0) {
        const oivNames = filterParams.oiv.map(oivId => {
            const oiv = window.currentTableData.oiv.find(o => o.id === oivId);
            return oiv ? oiv.name : oivId;
        });
        window.currentColumnFilters['ОИВ комплекса'] = oivNames;
    }
    
    // Применяем фильтры тем
    if (filterParams.themes && filterParams.themes.length > 0) {
        window.currentColumnFilters['Тема'] = filterParams.themes;
    }
    
    // Применяем фильтры стратегий
    if (filterParams.strategies && filterParams.strategies.length > 0) {
        window.currentColumnFilters['Стратегия'] = filterParams.strategies;
    }
    
    // Применяем фильтры программ
    if (filterParams.programs && filterParams.programs.length > 0) {
        window.currentColumnFilters['Гос.программы'] = filterParams.programs;
    }
    
    // Применяем фильтры из columnFilters (если есть)
    if (filterParams.columnFilters) {
        Object.assign(window.currentColumnFilters, filterParams.columnFilters);
    }
    
    // Обновляем таблицу
    if (window.currentTableData) {
        renderTable();
        updatePaginationControls();
        updateURL();
    }
};

// Добавьте кнопку переключения в таблице
function add3DSwitchButton() {
    const tableControls = document.querySelector('.table-actions');
    if (!tableControls) return;
    
    const switchButton = document.createElement('button');
    switchButton.id = 'switch-to-3d';
    switchButton.innerHTML = '🔍 Перейти к 3D виду';
    switchButton.style.padding = '8px 12px';
    switchButton.style.background = '#4a6da7';
    switchButton.style.color = 'white';
    switchButton.style.border = 'none';
    switchButton.style.borderRadius = '4px';
    switchButton.style.cursor = 'pointer';
    switchButton.style.marginLeft = '10px';
    
    switchButton.addEventListener('click', function() {
        // Сохраняем текущие фильтры
        const currentFilters = window.getCurrentFilters();
        localStorage.setItem('savedFilters', JSON.stringify(currentFilters));
        
        // Переключаемся на 3D представление
        window.location.href = '/';
    });
    
    tableControls.appendChild(switchButton);
}
