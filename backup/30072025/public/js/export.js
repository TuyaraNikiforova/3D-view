// export.js
document.addEventListener('DOMContentLoaded', function() {
    const exportBtn = document.getElementById('export-btn');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            // Получаем текущие отфильтрованные данные
            const currentData = window.getCurrentTableData ? window.getCurrentTableData() : null;
            
            if (currentData) {
                // Получаем видимые столбцы
                const visibleColumns = Array.from(document.querySelectorAll('#data-table thead th'))
                    .map(th => th.textContent.trim())
                    .filter((col, index) => {
                        return document.querySelectorAll('#data-table thead th')[index].style.display !== 'none';
                    });
                
                // Подготавливаем данные для экспорта
                const exportData = prepareExportData(currentData, visibleColumns);
                
                // Экспортируем данные в XLSX
                exportToXLSX(exportData, 'government_data.xlsx');
            }
        });
    }

    function prepareExportData(data, visibleColumns) {
        const rows = [];
        
        // Применяем те же фильтры, что и в таблице
        let filteredEdges = applyAllFilters(data.edges, data);
        
        filteredEdges.forEach(edge => {
            const sourceOIV = data.oiv.find(o => o.id === edge.source);
            const targetOIV = data.oiv.find(o => o.id === edge.target);
            const complex = data.complexes.find(c => c.id === (sourceOIV?.complex || targetOIV?.complex));
            
            if (!sourceOIV || !targetOIV || !complex) return;
            
            const row = {};
            
            visibleColumns.forEach(column => {
                switch(column) {
                    case 'Комплекс':
                        row[column] = complex.name;
                        break;
                    case 'ОИВ комплекса':
                        row[column] = sourceOIV.name;
                        break;
                    case 'Связанный ОИВ':
                        row[column] = targetOIV.name;
                        break;
                    case 'Связь':
                        row[column] = edge.label;
                        break;
                    case 'Тема':
                        row[column] = edge.theme;
                        break;
                    case 'Стратегия':
                        row[column] = (sourceOIV.strategies || [])
                            .map(strategyId => {
                                const strategy = data.strategies?.find(s => s.id === strategyId);
                                return strategy?.name || '';
                            })
                            .filter(Boolean)
                            .join(', ');
                        break;
                    case 'Гос.программы':
                        row[column] = (sourceOIV.programs || [])
                            .map(programId => {
                                const program = data.programs?.find(p => p.id === programId);
                                return program?.name || '';
                            })
                            .filter(Boolean)
                            .join(', ');
                        break;
                    case 'Проект':
                        row[column] = (sourceOIV.projects || [])
                            .map(projectId => {
                                const project = data.projects?.find(p => p.id === projectId);
                                return project?.name || '';
                            })
                            .filter(Boolean)
                            .join(', ');
                        break;
                }
            });
            
            rows.push(row);
        });
        
        return {
            headers: visibleColumns,
            rows: rows
        };
    }
    
    function applyAllFilters(edges, data) {
        // Копируем функцию фильтрации из table-filter.js
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
                    (sourceOIV.strategies || []).some(strategyId => {
                        const strategy = data.strategies?.find(s => s.id === strategyId);
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
                    case 'Стратегия':
                        return (sourceOIV.strategies || []).some(strategyId => {
                            const strategy = data.strategies?.find(s => s.id === strategyId);
                            return strategy && strategy.name.toLowerCase().includes(filterValue);
                        });
                    case 'Гос.программы':
                        return (sourceOIV.programs || []).some(programId => {
                            const program = data.programs?.find(p => p.id === programId);
                            return program && program.name.toLowerCase().includes(filterValue);
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
        
        return filteredEdges;
    }
    
    function exportToXLSX(data, fileName) {
        // Создаем новую книгу Excel
        const wb = XLSX.utils.book_new();
        
        // Подготавливаем данные для листа
        const wsData = [
            data.headers, // Заголовки
            ...data.rows.map(row => data.headers.map(header => row[header] || '')) // Данные
        ];
        
        // Создаем лист
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Добавляем лист в книгу
        XLSX.utils.book_append_sheet(wb, ws, "Данные");
        
        // Генерируем файл и скачиваем
        XLSX.writeFile(wb, fileName);
    }
});