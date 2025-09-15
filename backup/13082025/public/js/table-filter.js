// table-filter.js
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
	window.currentSortColumns = [];
    
    function sortData(data, sortColumns) {
        const edges = [...data.edges];
        
        edges.sort((a, b) => {
            const sourceOIVA = data.oiv.find(o => o.id === a.source);
            const targetOIVA = data.oiv.find(o => o.id === a.target);
            const complexA = data.complexes.find(c => c.id === (sourceOIVA?.complex || targetOIVA?.complex));
            
            const sourceOIVB = data.oiv.find(o => o.id === b.source);
            const targetOIVB = data.oiv.find(o => o.id === b.target);
            const complexB = data.complexes.find(c => c.id === (sourceOIVB?.complex || targetOIVB?.complex));
            
            // Проходим по всем столбцам сортировки, пока не найдем различие
            for (const {columnName, direction} of sortColumns) {
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
            header.style.cursor = 'pointer';
            
            header.addEventListener('click', function(e) {
                const columnName = this.textContent.trim();
                const isCtrlPressed = e.ctrlKey || e.metaKey; // Проверяем Ctrl или Command
                
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
                    if (existingSortIndex >= 0) {
                        // Если столбец уже есть, просто меняем направление
                        window.currentSortColumns = [{
                            columnName: columnName,
                            direction: window.currentSortColumns[existingSortIndex].direction === 'asc' ? 'desc' : 'asc'
                        }];
                    } else {
                        // Иначе устанавливаем новый столбец с сортировкой по возрастанию
                        window.currentSortColumns = [{
                            columnName: columnName,
                            direction: 'asc'
                        }];
                    }
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
        });
        
        // Восстанавливаем состояние сортировки при загрузке
        updateSortIndicators();
    }

    function updateSortIndicators() {
        const headers = document.querySelectorAll('#data-table thead th:not(.filter-cell)');
        
        // Удаляем все индикаторы сортировки
        headers.forEach(h => {
            h.classList.remove('sorted-asc', 'sorted-desc', 'sorted-multi');
            h.removeAttribute('title');
        });
        
        // Добавляем индикаторы для текущих столбцов сортировки
        window.currentSortColumns.forEach((sort, index) => {
            const header = Array.from(headers).find(h => h.textContent.trim() === sort.columnName);
            if (header) {
                header.classList.add(`sorted-${sort.direction}`);
                
                // Для множественной сортировки добавляем номер приоритета
                if (window.currentSortColumns.length > 1) {
                    header.classList.add('sorted-multi');
                    header.setAttribute('title', `Уровень сортировки: ${index + 1}`);
                }
            }
        });
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
            params.set(`filter_${encodeURIComponent(column)}`, window.currentColumnFilters[column]);
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
                window.currentColumnFilters[columnName] = value;
                
                // Устанавливаем значения в поля фильтрации
                document.querySelectorAll('.column-filter').forEach(input => {
                    if (input.dataset.column === columnName) {
                        input.value = value;
                    }
                });
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
		updateURL(); // Добавляем обновление URL
};
    
    // Функция для рендеринга таблицы
	function renderTable() {
		const tableBody = document.getElementById('table-body');
		if (!tableBody) return;
		
		tableBody.innerHTML = '';
		
		const data = window.getCurrentTableData();
		if (!data || !data.edges || data.edges.length === 0) {
			const row = document.createElement('tr');
			const cell = document.createElement('td');
			cell.colSpan = 8;
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
		
		paginatedEdges.forEach(edge => {
			const sourceOIV = data.oiv.find(o => o.id === edge.source);
			const targetOIV = data.oiv.find(o => o.id === edge.target);
			const complex = data.complexes.find(c => c.id === (sourceOIV?.complex || targetOIV?.complex));
			
			if (!sourceOIV || !targetOIV || !complex) return;
			
			const row = document.createElement('tr');
			
			// Комплекс
			const complexCell = document.createElement('td');
			complexCell.textContent = complex.name;
			row.appendChild(complexCell);
			
			// Органы власти
			const authorityCell = document.createElement('td');
			authorityCell.innerHTML = `<div>${sourceOIV.name}</div>`;
			row.appendChild(authorityCell);

			// Связанные органы власти
			const authConnectCell = document.createElement('td');
			authConnectCell.innerHTML = `<div>${targetOIV.name}</div>`;
			row.appendChild(authConnectCell);
			
			// Связь
			const connectionCell = document.createElement('td');
			connectionCell.textContent = edge.label;
			row.appendChild(connectionCell);
			
			// Тема связи
			const themeCell = document.createElement('td');
			themeCell.textContent = edge.theme;
			row.appendChild(themeCell);

			// НПА связи
			const docCell = document.createElement('td');
			docCell.textContent = edge.edge_doc || '';
			row.appendChild(docCell);
			
			// Стратегии
			const strategyCell = document.createElement('td');
			const edgeStrategies = window.additionalStrategies?.filter(s => s.oiv_id === edge.source) || [];
			// Добавляем стратегии из sourceOIV.strategies
			(sourceOIV.strategies || []).forEach(strategyId => {
				let strategy = data.strategies?.find(s => s.id === strategyId) || 
							  window.additionalStrategies?.find(s => s.id === strategyId);
				if (strategy) {
					strategyCell.innerHTML += `${strategy.name}<br>`;
				}                
			});

			// Добавляем стратегии, найденные по edge.source
			edgeStrategies.forEach(strategy => {
				strategyCell.innerHTML += `${strategy.name}<br>`;
			});

			row.appendChild(strategyCell);
			
			// Программы
			const programCell = document.createElement('td');
			// Получаем программы из programs.json
			const programs = window.programsData || [];
			programs
				.filter(program => program.oiv_id === sourceOIV.id && program.program_type === 0.0)
				.forEach(program => {
					programCell.innerHTML += `${program.name}<br>`;
				});
			row.appendChild(programCell);
			
			// Подпрограммы
			const subprogramCell = document.createElement('td');
			// Получаем подпрограммы из programs.json
			programs
				.filter(program => program.oiv_id === sourceOIV.id && program.program_type === 1.0)
				.forEach(program => {
					subprogramCell.innerHTML += `${program.name}<br>`;
				});
			row.appendChild(subprogramCell);
			
			// Проекты
			const projectCell = document.createElement('td');
			(sourceOIV.projects || []).forEach(projectId => {
				const project = data.projects?.find(p => p.id === projectId);
				if (project) {
					projectCell.innerHTML += `${project.name}<br>`;
				}
			});
			row.appendChild(projectCell);
			
			tableBody.appendChild(row);
		});
		
		updatePaginationInfo(filteredEdges.length);
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
			updateURL(); // Добавляем обновление URL
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
            const filterValue = window.currentColumnFilters[columnName].toLowerCase();
            if (!filterValue) return;
            
            filteredEdges = filteredEdges.filter(edge => {
                const sourceOIV = data.oiv.find(o => o.id === edge.source);
                const targetOIV = data.oiv.find(o => o.id === edge.target);
                const complex = data.complexes.find(c => c.id === (sourceOIV?.complex || targetOIV?.complex));
                
                if (!sourceOIV || !targetOIV || !complex) return false;
                
                switch(columnName) {
                    case 'Комплекс':
                        return complex.name.toLowerCase().includes(filterValue);
                    case 'ОИВ комплекса':
                        return sourceOIV.name.toLowerCase().includes(filterValue);
                    case 'Связанный ОИВ':
                        return targetOIV.name.toLowerCase().includes(filterValue);
                    case 'Связь':
                        return edge.label.toLowerCase().includes(filterValue);
                    case 'Тема':
                        return edge.theme.toLowerCase().includes(filterValue);
                    case 'НПА связи':
                        return edge.edge_doc && edge.edge_doc.toLowerCase().includes(filterValue);				
					case 'Стратегия':
						return (sourceOIV.strategies || []).some(strategyId => {
							// Проверяем, является ли значение ID или строкой "В разработке"
							if (strategyId === "В разработке") {
								return "в разработке".includes(filterValue);
							}
							
							// Ищем стратегию сначала в основном data.json
							let strategy = data.strategies?.find(s => s.id === strategyId);
							
							// Если не найдено в основном файле, ищем в additionalStrategies
							if (!strategy && window.additionalStrategies) {
								strategy = window.additionalStrategies.find(s => s.id === strategyId);
							}
							
							return strategy && strategy.name.toLowerCase().includes(filterValue);
						});
                    case 'Гос.программы':
						return (sourceOIV.programs || []).some(programId => {
							const program = data.programs?.find(p => p.id === programId);
							return program && program.program_type === 0.0 && program.name.toLowerCase().includes(filterValue);
						});		
                    case 'Подпрограммы':
						return (sourceOIV.programs || []).some(programId => {
							const program = data.programs?.find(p => p.id === programId);
							return program && program.program_type === 1.0 && program.name.toLowerCase().includes(filterValue);
						});				
                    case 'Проект':
                        return (sourceOIV.projects || []).some(projectId => {
                            const project = data.projects?.find(p => p.id === projectId);
                            return project && project.name.toLowerCase().includes(filterValue);
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
		renderTable();
		updatePaginationControls();	
		
		// Инициализация фильтров столбцов
		document.querySelectorAll('.column-filter').forEach(input => {
			input.addEventListener('input', function() {
				const column = this.dataset.column;
				const value = this.value.trim();
				
				if (value) {
					window.currentColumnFilters[column] = value;
				} else {
					delete window.currentColumnFilters[column];
				}
				
				window.currentPage = 1;
				renderTable();
				updatePaginationControls();
				updateURL(); // Добавляем обновление URL
			});
		});
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
                
                const columnName = header.textContent.trim();
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
					header.style.display = '';
					filterCell.style.display = '';
					cells.forEach(cell => cell.style.display = '');
					columnsToShow.push(header.textContent.trim());
				} else {
					header.style.display = 'none';
					filterCell.style.display = 'none';
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
			
			const columnName = header.textContent.trim();
			const filterCell = document.querySelectorAll('#data-table thead .filter-cell')[index];
			const cells = document.querySelectorAll(`#data-table tbody td:nth-child(${index + 1})`);
			
			if (selectedColumns.includes(columnName)) {
				header.style.display = '';
				filterCell.style.display = '';
				cells.forEach(cell => cell.style.display = '');
			} else {
				header.style.display = 'none';
				filterCell.style.display = 'none';
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
		
		document.querySelectorAll('.column-filter').forEach(input => {
			input.value = '';
		});
		
		if (window.currentTableData) {
			renderTable();
			updatePaginationControls();
			updateURL(); // Добавляем обновление URL
		}
	});

	window.addEventListener('popstate', function() {
		parseURL();
		if (window.currentTableData) {
			renderTable();
			updatePaginationControls();
		}
	});
    // Column dragging functionality
    function setupColumnDragging() {
        const table = document.getElementById('data-table');
        if (!table) return;

        const headers = Array.from(table.querySelectorAll('thead th:not(.filter-cell)'));
        const filterCells = Array.from(table.querySelectorAll('thead .filter-cell'));
        let draggedHeader = null;
        let draggedIndex = null;

        headers.forEach((header, index) => {
            header.setAttribute('draggable', 'true');
            
            header.addEventListener('dragstart', (e) => {
                draggedHeader = header;
                draggedIndex = index;
                e.dataTransfer.setData('text/plain', index);
                e.dataTransfer.effectAllowed = 'move';
                header.classList.add('dragging');
                setTimeout(() => header.style.display = 'none', 0);
            });

            header.addEventListener('dragend', () => {
                headers.forEach(h => {
                    h.classList.remove('dragging');
                    h.style.display = '';
                });
                draggedHeader = null;
                draggedIndex = null;
            });

            header.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const rect = header.getBoundingClientRect();
                const midX = rect.left + rect.width / 2;
                
                if (e.clientX < midX) {
                    header.classList.add('placeholder');
                } else {
                    header.classList.remove('placeholder');
                }
            });

            header.addEventListener('dragleave', () => {
                header.classList.remove('placeholder');
            });

			header.addEventListener('drop', (e) => {
				e.preventDefault();
				header.classList.remove('placeholder');
				
				const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
				const toIndex = headers.indexOf(header);
				const rect = header.getBoundingClientRect();
				const midX = rect.left + rect.width / 2;
				const insertBefore = e.clientX < midX;

				if (fromIndex === toIndex || (insertBefore && fromIndex === toIndex - 1) || (!insertBefore && fromIndex === toIndex + 1)) {
					return;
				}

				const finalToIndex = insertBefore ? toIndex : toIndex + 1;
				
				// Reorder headers
				if (fromIndex < finalToIndex) {
					header.parentNode.insertBefore(draggedHeader, headers[finalToIndex].nextSibling);
				} else {
					header.parentNode.insertBefore(draggedHeader, headers[finalToIndex]);
				}

				// Reorder filter cells to match
				const draggedFilterCell = filterCells[fromIndex];
				if (draggedFilterCell) {
					if (fromIndex < finalToIndex) {
						document.querySelector('.filter-row').insertBefore(draggedFilterCell, filterCells[finalToIndex].nextSibling);
					} else {
						document.querySelector('.filter-row').insertBefore(draggedFilterCell, filterCells[finalToIndex]);
					}
				}

				// Update the arrays
				const movedHeader = headers.splice(fromIndex, 1)[0];
				headers.splice(finalToIndex, 0, movedHeader);
				
				const movedFilterCell = filterCells.splice(fromIndex, 1)[0];
				if (movedFilterCell) {
					filterCells.splice(finalToIndex, 0, movedFilterCell);
				}

				// Reorder table columns in all rows
				const table = document.getElementById('data-table');
				const rows = table.querySelectorAll('tr');
				
				rows.forEach(row => {
					const cells = Array.from(row.children);
					const cell = cells[fromIndex];
					cells.splice(fromIndex, 1);
					cells.splice(finalToIndex, 0, cell);
					
					// Clear and reappend in new order
					row.innerHTML = '';
					cells.forEach(c => row.appendChild(c));
				});

				// Save column order to localStorage
				saveColumnOrder();
			});
        });
    }

    function saveColumnOrder() {
        const headers = Array.from(document.querySelectorAll('#data-table thead th:not(.filter-cell)'));
        const columnOrder = headers.map(header => header.textContent.trim());
        localStorage.setItem('columnOrder', JSON.stringify(columnOrder));
    }

	function loadColumnOrder() {
		const savedOrder = localStorage.getItem('columnOrder');
		if (!savedOrder) return false;

		const columnOrder = JSON.parse(savedOrder);
		const currentHeaders = Array.from(document.querySelectorAll('#data-table thead th:not(.filter-cell)'));
		const currentOrder = currentHeaders.map(header => header.textContent.trim());

		if (JSON.stringify(columnOrder) === JSON.stringify(currentOrder)) {
			return false;
		}

		const table = document.getElementById('data-table');
		const headerRow = table.querySelector('thead tr:first-child');
		const filterRow = table.querySelector('thead .filter-row');
		const bodyRows = table.querySelectorAll('tbody tr');

		// Create a mapping of column name to its index
		const columnIndexMap = {};
		currentHeaders.forEach((header, index) => {
			columnIndexMap[header.textContent.trim()] = index;
		});

		// Reorder headers
		headerRow.innerHTML = '';
		filterRow.innerHTML = '';
		
		columnOrder.forEach(columnName => {
			const index = columnIndexMap[columnName];
			if (index !== undefined) {
				// Add header
				headerRow.appendChild(currentHeaders[index]);
				
				// Add filter cell if exists
				const filterCells = document.querySelectorAll('#data-table thead .filter-cell');
				if (filterCells[index]) {
					filterRow.appendChild(filterCells[index]);
				}
			}
		});

		// Reorder cells in each body row
		bodyRows.forEach(row => {
			const cells = Array.from(row.children);
			const newCells = [];
			
			columnOrder.forEach(columnName => {
				const index = columnIndexMap[columnName];
				if (index !== undefined && cells[index]) {
					newCells.push(cells[index]);
				}
			});
			
			// Clear and append in new order
			row.innerHTML = '';
			newCells.forEach(cell => row.appendChild(cell));
		});

		return true;
	}

    function initializeColumnDragging() {

        const orderChanged = loadColumnOrder();

        setupColumnDragging();

        if (orderChanged && window.currentTableData) {
            renderTable();
            updatePaginationControls();
        }
    }

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
		initializeColumnDragging();
		setupColumnSorting();
		
		// Если есть параметры в URL, обновляем URL для корректного отображения
		if (window.location.search) {
			updateURL();
		}
	});
});