import { exportDashboardToExcel } from './export_dashboard.js';

document.addEventListener('DOMContentLoaded', function() {
    const savedFilters = localStorage.getItem('dashboardFilters');
    console.log('Saved filters:', savedFilters); // Проверьте данные
    
    if (savedFilters) {
        try {
            const filters = JSON.parse(savedFilters);
            console.log('Parsed filters:', filters);
            loadFilteredData(filters);
        } catch (e) {
            console.error('Error parsing filters:', e);
            showEmptyState();
        }
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
                createDashboardLayout(filteredData);
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

function createDashboardLayout(data) {
    const container = document.querySelector('.dashboard-container');
    if (!container) return;
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Проверяем, есть ли данные для отображения
    if (data.edges.length === 0 || data.oiv.length === 0) {
        showEmptyState();
        return;
    }
    
    // Создаем основную разметку с двумя колонками
    container.innerHTML = `
        <div class="dashboard-layout">
            <div class="dashboard-left">
                <div class="chart-container"></div>
                <button class="toggle-table-btn">Раскрыть таблицу</button>
            </div>
            <div class="dashboard-right">
                <div class="tables-container"></div>
            </div>
        </div>
    `;
    
    // Добавляем стили
    const style = document.createElement('style');
    style.textContent = `
        .dashboard-layout {
            display: flex;
            width: 100%;
            gap: 20px;
        }
        .dashboard-left {
            flex: 1;
            min-width: 60%;
            transition: all 0.3s ease;
        }
        .dashboard-right {
            flex: 1;
            min-width: 40%;
            max-width: 40%;
            overflow: auto;
            transition: all 0.3s ease;
        }
        .dashboard-right.collapsed {
            max-width: 0;
            min-width: 0;
            flex: 0;
            opacity: 0;
            visibility: hidden;
        }
        .chart-container {
            width: 100%;
            height: 400px;
            margin-bottom: 20px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 20px;
        }
        .toggle-table-btn {
            padding: 10px 20px;
            background-color: #4a6da7;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: Arial, sans-serif;
            font-size: 14px;
            margin-bottom: 20px;
        }
        .oiv-selector {
            margin-bottom: 20px;
            padding: 10px;
            width: 100%;
            max-width: 400px;
            font-size: 14px;
        }
        
        /* Стили для таблицы 2 (как в исходном коде) */
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
            text-align: center;
        }
        .toggle-icon {
            cursor: pointer;
            margin-right: 5px;
            font-weight: bold;
            color: #4a6da7;
        }
        .theme-cell {
            cursor: pointer;
            display: flex;
            align-items: center;
        }
        .target-table-container {
            display: none;
            width: 100%;
            margin: 10px 0;
            padding: 10px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .target-table-container.visible {
            display: block;
        }
        .target-table-container .dashboard-table {
            color: #333;
        }
    `;
    document.head.appendChild(style);
    
    // Получаем контейнеры
    const chartContainer = container.querySelector('.chart-container');
    const tablesContainer = container.querySelector('.tables-container');
    
    // Создаем график
    createBarChart(data, chartContainer);
    
    // Создаем таблицы (только вторую таблицу)
    createTargetTables(data, tablesContainer);
    
    // Добавляем кнопку экспорта
    addExportButton(data);
    
    // Обработчик кнопки "раскрыть"
    const toggleBtn = container.querySelector('.toggle-table-btn');
    const rightPanel = container.querySelector('.dashboard-right');
    
    toggleBtn.addEventListener('click', () => {
        rightPanel.classList.toggle('collapsed');
        toggleBtn.textContent = rightPanel.classList.contains('collapsed') ? 'Показать таблицу' : 'Скрыть таблицу';
    });
}

function createBarChart(data, container) {
    // Проверка данных
    if (!data || !data.edges || data.edges.length === 0) {
        container.innerHTML = '<p>Нет данных для отображения графика</p>';
        return;
    }

    // Получаем уникальные темы
    const themes = [...new Set(data.edges.map(edge => edge.theme))];
    console.log('Unique themes:', themes);

    // Получаем уникальные source OIV
    const sourceOIVs = [...new Set(data.edges.map(edge => edge.source))];
    const sourceOIVNames = sourceOIVs.map(id => ({
        id,
        name: data.oiv.find(oiv => oiv.id === id)?.name || id
    }));
    console.log('Source OIVs:', sourceOIVNames);

    // Проверка перед созданием элементов
    if (themes.length === 0 || sourceOIVNames.length === 0) {
        container.innerHTML = '<p>Недостаточно данных для построения графика</p>';
        return;
    }

    // Очистка контейнера
    container.innerHTML = '';

    // Создаем селектор
    const select = document.createElement('select');
    select.className = 'oiv-selector';
    
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Все органы власти';
    select.appendChild(allOption);
    
    sourceOIVNames.forEach(oiv => {
        const option = document.createElement('option');
        option.value = oiv.id;
        option.textContent = oiv.name;
        select.appendChild(option);
    });
    
    container.appendChild(select);
    
    // Создаем контейнер для графика
    const chartDiv = document.createElement('div');
    chartDiv.style.width = '100%';
    chartDiv.style.height = '350px';
    chartDiv.style.position = 'relative';
    container.appendChild(chartDiv);
    
    const chartCanvas = document.createElement('canvas');
    chartCanvas.id = 'dashboardChart';
    chartDiv.appendChild(chartCanvas);

    // Загрузка Chart.js
    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = initializeChart;
        script.onerror = function() {
            chartDiv.innerHTML = '<p>Ошибка загрузки Chart.js</p>';
        };
        document.head.appendChild(script);
    } else {
        initializeChart();
    }

	function initializeChart() {
		console.log('Initializing chart...');
		
		const updateChart = (selectedOIV = 'all') => {
			const ctx = chartCanvas.getContext('2d');
			
			// Уничтожаем предыдущий график, если он существует и является экземпляром Chart
			if (window.dashboardChart && typeof window.dashboardChart.destroy === 'function') {
				window.dashboardChart.destroy();
			}
			
			// Подготовка данных
			const chartData = {
				labels: themes,
				datasets: [{
					label: selectedOIV === 'all' ? 'Все органы власти' : 
						   sourceOIVNames.find(oiv => oiv.id === selectedOIV)?.name || selectedOIV,
					data: themes.map(theme => 
						selectedOIV === 'all' 
							? data.edges.filter(edge => edge.theme === theme).length
							: data.edges.filter(edge => 
								edge.theme === theme && edge.source === selectedOIV
							  ).length
					),
					backgroundColor: '#4a6da7',
					borderColor: '#3a5a8f',
					borderWidth: 1
				}]
			};
			
			console.log('Chart data:', chartData);

			// Создаем график
			window.dashboardChart = new Chart(ctx, {
				type: 'bar',
				data: chartData,
				options: {
					responsive: true,
					maintainAspectRatio: false,
					scales: {
						y: {
							beginAtZero: true,
							title: {
								display: true,
								text: 'Количество связей'
							}
						},
						x: {
							title: {
								display: true,
								text: 'Темы'
							}
						}
					}
				}
			});
		};
		
		// Инициализация
		updateChart();
		
		// Обработчик изменения селектора
		select.addEventListener('change', (e) => {
			updateChart(e.target.value);
		});
	}
}

function createTargetTables(data, container) {
    // Получаем уникальные темы
    const themes = [...new Set(data.edges.map(edge => edge.theme))];
    
    themes.forEach(theme => {
        // Создаем контейнер для целевой таблицы
        const targetTableContainer = document.createElement('div');
        targetTableContainer.className = 'target-table-container visible'; // По умолчанию видима
        
        // Создаем строку с темой
        const themeRow = document.createElement('div');
        themeRow.className = 'theme-cell';
        themeRow.style.margin = '10px 0';
        themeRow.style.fontWeight = 'bold';
        themeRow.style.color = '#4a6da7';
        themeRow.textContent = theme;
        targetTableContainer.appendChild(themeRow);
        
        // Фильтруем связи по выбранной теме
        const themeEdges = data.edges.filter(edge => edge.theme === theme);
        
        // Получаем уникальные source OIV для этой темы
        const sourceOIVs = [...new Set(themeEdges.map(edge => edge.source))];
        
        // Создаем таблицу для каждой source OIV
        sourceOIVs.forEach(sourceOIVId => {
            const sourceName = data.oiv.find(oiv => oiv.id === sourceOIVId)?.name || sourceOIVId;
            
            // Создаем заголовок для source OIV
            const sourceHeader = document.createElement('h4');
            sourceHeader.textContent = `Выбранный орган власти: ${sourceName}`;
            targetTableContainer.appendChild(sourceHeader);

            // Создаем таблицу
            const table = document.createElement('table');
            table.className = 'dashboard-table';
            
            // Создаем заголовок таблицы
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            // Добавляем столбец №п/п
            const numberHeader = document.createElement('th');
            numberHeader.textContent = '№п/п';
            numberHeader.style.width = '50px';
            headerRow.appendChild(numberHeader);
            
            const targetHeader = document.createElement('th');
            targetHeader.textContent = 'Связанный орган власти';
            targetHeader.style.width = '300px';
            headerRow.appendChild(targetHeader);
            
            const detailsHeader = document.createElement('th');
            detailsHeader.textContent = 'Наименование связи';
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
                    
                    // Добавляем ячейку с порядковым номером
                    const numberCell = document.createElement('td');
                    numberCell.textContent = rowNumber++;
                    row.appendChild(numberCell);
                    
                    const targetCell = document.createElement('td');
                    targetCell.textContent = targetName;
                    row.appendChild(targetCell);
                    
                    const detailsCell = document.createElement('td');
                    detailsCell.textContent = connection.label || connection.name || connection.description || 'Связь без названия';
                    row.appendChild(detailsCell);
                    
                    tbody.appendChild(row);
                });
            });
            
            table.appendChild(tbody);
            targetTableContainer.appendChild(table);
        });
        
        container.appendChild(targetTableContainer);
    });
}

function addExportButton(data) {
    const container = document.querySelector('.dashboard-container');
    if (!container) return;
    
    // Проверяем, есть ли уже кнопка экспорта
    const existingBtn = container.querySelector('.export-btn');
    if (existingBtn) return;
    
    // Создаем кнопку экспорта
    const exportBtn = document.createElement('button');
    exportBtn.className = 'export-btn';
    exportBtn.textContent = 'Экспорт в Excel';
    
    // Добавляем стили для кнопки
    exportBtn.style.cssText = `
        padding: 10px 20px;
        background-color: #4a6da7;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: Arial, sans-serif;
        font-size: 14px;
        margin: 20px 0;
        display: block;
    `;
    
    // Добавляем обработчик клика
    exportBtn.addEventListener('click', () => {
        try {
            exportDashboardToExcel(data);
        } catch (error) {
            console.error('Ошибка при экспорте в Excel:', error);
            alert('Произошла ошибка при экспорте. Проверьте консоль для подробностей.');
        }
    });
    
    // Вставляем кнопку в начало контейнера
    container.insertBefore(exportBtn, container.firstChild);
}