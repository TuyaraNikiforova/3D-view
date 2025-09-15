import { exportDashboardToExcel } from './export_dashboard.js';

let chartJsLoading = null;
let objectsData = [];
let parametersData = [];
let indicatorsData = [];

// Фиксированная цветовая палитра для графиков
const COLOR_PALETTE = [
    '#4a6da7', // синий
    '#6da74a', // зеленый
    '#a76d4a', // коричневый
    '#a74a6d', // розовый
    '#4aa7a7', // бирюзовый
    '#6d4aa7', // фиолетовый
    '#a7a74a', // оливковый
    '#4a6da7', // синий (повтор для большего количества элементов)
    '#6da74a', // зеленый (повтор)
];

function loadChartJS() {
    if (chartJsLoading) {
        return chartJsLoading;
    }
    
    chartJsLoading = new Promise((resolve, reject) => {
	if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
		Chart.register(ChartDataLabels);
	} else {
		console.error('Chart.js or ChartDataLabels plugin not loaded');
	}

        const scriptChart = document.createElement('script');
        scriptChart.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        
        const scriptLabels = document.createElement('script');
        scriptLabels.src = 'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0';
        
        let loaded = 0;
        const checkLoaded = () => {
            if (++loaded === 2) resolve();
        };
        
        scriptChart.onload = checkLoaded;
        scriptLabels.onload = checkLoaded;
        
        scriptChart.onerror = () => {
            console.error('Ошибка загрузки Chart.js');
            reject(new Error('Не удалось загрузить Chart.js'));
        };
        
        scriptLabels.onerror = () => {
            console.error('Ошибка загрузки chartjs-plugin-datalabels');
            reject(new Error('Не удалось загрузить chartjs-plugin-datalabels'));
        };
        
        document.head.appendChild(scriptChart);
        document.head.appendChild(scriptLabels);
    });
    
    return chartJsLoading;
}

document.addEventListener('DOMContentLoaded', function() {
    const savedFilters = localStorage.getItem('dashboardFilters');
    console.log('Saved filters:', savedFilters);
    
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
    Promise.all([
        fetch('/data/data.json').then(res => res.json()),
        fetch('/data/objects.json').then(res => res.json()),
        fetch('/data/parameters.json').then(res => res.json()),
        fetch('/data/indicators.json').then(res => res.json()) 
    ])
    .then(([data, objects, parameters, indicators]) => {
        objectsData = objects;
        parametersData = parameters;
        indicatorsData = indicators; 
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

    if (filters.sourceOivIds && filters.sourceOivIds.length > 0) {
        filteredData.edges = data.edges.filter(edge => 
            filters.sourceOivIds.includes(edge.source));
        
        const allOIVs = new Set();
        filteredData.edges.forEach(edge => {
            allOIVs.add(edge.source);
            allOIVs.add(edge.target);
        });
        
        filteredData.oiv = data.oiv.filter(oiv => allOIVs.has(oiv.id));
    } 
    else if (filters.targetOivIds && filters.targetOivIds.length > 0) {
        filteredData.edges = data.edges.filter(edge => 
            filters.targetOivIds.includes(edge.target));
        
        const allOIVs = new Set();
        filteredData.edges.forEach(edge => {
            allOIVs.add(edge.source);
            allOIVs.add(edge.target);
        });
        
        filteredData.oiv = data.oiv.filter(oiv => allOIVs.has(oiv.id));
    }
    else if (filters.themes && filters.themes.length > 0) {
        filteredData.edges = data.edges.filter(edge => filters.themes.includes(edge.theme));
        
        const themeOIVs = new Set();
        filteredData.edges.forEach(edge => {
            themeOIVs.add(edge.source);
            themeOIVs.add(edge.target);
        });
        
        filteredData.oiv = data.oiv.filter(oiv => themeOIVs.has(oiv.id));
    }
    else if (filters.complexes && filters.complexes.length > 0) {
        filteredData.oiv = data.oiv.filter(oiv => filters.complexes.includes(oiv.complex));
        
        const oivIds = filteredData.oiv.map(oiv => oiv.id);
        filteredData.edges = data.edges.filter(edge => 
            oivIds.includes(edge.source) || oivIds.includes(edge.target));
    }
    else if (filters.strategies && filters.strategies.length > 0) {
        filteredData.oiv = data.oiv.filter(oiv => 
            oiv.strategies && oiv.strategies.some(s => filters.strategies.includes(s)));
        
        const oivIds = filteredData.oiv.map(oiv => oiv.id);
        filteredData.edges = data.edges.filter(edge => 
            oivIds.includes(edge.source) || oivIds.includes(edge.target));
    }
    else if (filters.programs && filters.programs.length > 0) {
        filteredData.oiv = data.oiv.filter(oiv => 
            oiv.programs && oiv.programs.some(p => filters.programs.includes(p)));
        
        const oivIds = filteredData.oiv.map(oiv => oiv.id);
        filteredData.edges = data.edges.filter(edge => 
            oivIds.includes(edge.source) || oivIds.includes(edge.target));
    }
    else if (filters.edges && filters.edges.length > 0) {
        filteredData.edges = data.edges.filter(edge => filters.edges.includes(edge.id));
        
        const edgeOIVs = new Set();
        filteredData.edges.forEach(edge => {
            edgeOIVs.add(edge.source);
            edgeOIVs.add(edge.target);
        });
        
        filteredData.oiv = data.oiv.filter(oiv => edgeOIVs.has(oiv.id));
    } else {
        return {
            ...data,
            edges: [],
            oiv: []
        };
    }

    return filteredData;
}

function shouldShowDashboard(data, filters) {
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
    if (!container) {
        console.error('Dashboard container not found');
        return;
    }
    
    container.innerHTML = `
        <div class="empty-state">
            <h3>Выберите фильтр на 3D-схеме</h3>
            <p>Для отображения данных выберите органы власти, темы, комплексы или другие фильтры в 3D-визуализации</p>
        </div>
    `;
    
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

async function createDashboardLayout(data) {
    const container = document.querySelector('.dashboard-container');
    if (!container) {
        console.error('Контейнер дашборда не найден');
        return;
    }
    
    try {
        await loadChartJS(); 

        if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
            Chart.register(ChartDataLabels);
        }		
        container.innerHTML = '';
        
        if (data.edges.length === 0 || data.oiv.length === 0) {
            showEmptyState();
            return;
        }
        
		container.innerHTML = `
			<div class="dashboard-layout">
				<div class="dashboard-header">
					<button class="export-btn">Экспорт в Excel</button>
					<button class="toggle-table-btn">Показать таблицу связей</button>
					<button class="toggle-objects-btn">Показать объекты управления</button>
					<button class="toggle-parameters-btn">Показать параметры</button>
					<button class="toggle-indicators-btn">Показать показатели</button>
				</div>
				<div class="dashboard-content">
					<div class="dashboard-left">
						<div class="filters-container"></div>
						<div class="chart-container"></div>
						<div class="objects-chart-container"></div>
						<div class="parameters-chart-container"></div>
						<div class="indicators-chart-container"></div>
					</div>
					<div class="dashboard-right collapsed">
						<div class="tables-container"></div>
					</div>
					<div class="objects-container collapsed">
						<div class="objects-table-container"></div>
					</div>
					<div class="parameters-container collapsed">
						<div class="parameters-table-container"></div>
					</div>
					<div class="indicators-container collapsed">
						<div class="indicators-table-container"></div>
					</div>
				</div>
			</div>
		`;

        const style = document.createElement('style');
        style.textContent = `
            .dashboard-layout {
                display: flex;
                flex-direction: column;
                width: 100%;
                gap: 20px;
            }
            .dashboard-header {
                display: flex;
                gap: 15px;
                margin-bottom: 20px;
            }    
            .dashboard-content {
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
    .filters-container {
        display: flex;
        flex-direction: row;  /* Изменено с column на row */
        gap: 15px;
        padding: 15px;  /* Увеличено с 10px */
        background-color: transparent;  /* Изменено с #f5f5f5 */
        border-radius: 8px;
        margin-bottom: 20px;
        flex-wrap: wrap;
    }
    .filter-group {
        flex: 1;
        min-width: 280px;  /* Увеличено с 250px */
        background-color: rgba(255, 255, 255, 0.8);  /* Полупрозрачный белый */
        padding: 15px;  /* Увеличено с 10px */
        border-radius: 6px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
            .filter-group h4 {
                margin: 0 0 10px 0;
                color: #4a6da7;
            }
            .filter-checkbox {
                margin-bottom: 6px;
            }
            .filter-checkbox label {
                display: flex;
                align-items: center;
                cursor: pointer;
                font-size: 14px;
                color: #333;
            }
            .filter-checkbox input {
                margin-right: 8px;
            }
            .filter-group ::-webkit-scrollbar {
                width: 6px;
            }
            .filter-group ::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 3px;
            }
            .filter-group ::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 3px;
            }
            .filter-group ::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }
    .chart-container {
        width: 100%;
        height: 400px;
        margin-bottom: 20px;
        background-color: #f9f9f9;  /* Изменено с #f9f9f9 */
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 20px;
    }
    .objects-chart-container {
        width: 100%;
        height: 400px;
        margin-bottom: 20px;
        background-color: #f9f9f9;  /* Изменено с #f9f9f9 */
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 20px;
    }
            .export-btn, .toggle-table-btn, .toggle-objects-btn {
                padding: 12px 24px;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-family: 'Arial', sans-serif;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.3s ease;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }
            .export-btn {
                background-color: #4a6da7;
            }
            .toggle-table-btn {
                background-color: #4a6da7;
            }
            .toggle-objects-btn {
                background-color: #6da74a;
            }
            .export-btn:hover, .toggle-table-btn:hover, .toggle-objects-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }    
            .export-btn:active, .toggle-table-btn:active, .toggle-objects-btn:active {
                transform: translateY(0);
                box-shadow: 0 2px 3px rgba(0,0,0,0.1);
            }            
			.export-btn::before {
				content: "";
				display: inline-block;
				width: 16px;
				height: 16px;
				margin-right: 8px;
				vertical-align: middle;
				background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='white' viewBox='0 0 16 16'%3E%3Cpath d='M8.5 6.5a.5.5 0 0 0-1 0v3.793L6.354 9.146a.5.5 0 1 0-.708.708l2 2a.5.5 0 0 0 .708 0l2-2a.5.5 0 0 0-.708-.708L8.5 10.293V6.5z'/%3E%3Cpath d='M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z'/%3E%3C/svg%3E");
				background-repeat: no-repeat;
				background-position: center;
			}
            .toggle-table-btn::before {
                content: "⇄ ";
                margin-right: 8px;
            }
            .toggle-objects-btn::before {
                content: "📋 ";
                margin-right: 8px;
            }
            /* Стили для таблицы */
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
            
            .objects-container {
                flex: 1;
                min-width: 40%;
                max-width: 40%;
                overflow: auto;
                transition: all 0.3s ease;
            }
            .objects-container.collapsed {
                max-width: 0;
                min-width: 0;
                flex: 0;
                opacity: 0;
                visibility: hidden;
            }
            .objects-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-family: Arial, sans-serif;
            }
            .objects-table th, .objects-table td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            .objects-table th {
                background-color: #4a6da7;
                color: white;
                font-weight: bold;
            }
            .objects-table tr:nth-child(even) {
                background-color: #f2f2f2;
            }
            .checkmark {
                color: #4CAF50;
                font-weight: bold;
                font-size: 18px;
            }

			.parameters-chart-container {
				width: 100%;
				height: 400px;
				margin-bottom: 20px;
				background-color: #f9f9f9;
				border: 1px solid #ddd;
				border-radius: 4px;
				padding: 20px;
			}			
			.parameters-table {
				width: 100%;
				border-collapse: collapse;
				margin-top: 20px;
				font-family: Arial, sans-serif;
			}
			.parameters-table th, .parameters-table td {
				border: 1px solid #ddd;
				padding: 8px;
				text-align: left;
			}
			.parameters-table th {
				background-color: #4a6da7;
				color: white;
				font-weight: bold;
			}
			.parameters-table tr:nth-child(even) {
				background-color: #f2f2f2;
			}			

			.toggle-parameters-btn {
				background-color: #6da74a;
				padding: 12px 24px;
				color: white;
				border: none;
				border-radius: 6px;
				cursor: pointer;
				font-family: 'Arial', sans-serif;
				font-size: 14px;
				font-weight: 600;
				transition: all 0.3s ease;
				box-shadow: 0 2px 5px rgba(0,0,0,0.1);
				display: inline-flex;
				align-items: center;
				justify-content: center;
			}

			.toggle-parameters-btn:hover {
				transform: translateY(-2px);
				box-shadow: 0 4px 8px rgba(0,0,0,0.15);
			}

			.toggle-parameters-btn:active {
				transform: translateY(0);
				box-shadow: 0 2px 3px rgba(0,0,0,0.1);
			}

			.toggle-parameters-btn::before {
				content: "📋 ";
				margin-right: 8px;
			}

			.parameters-container {
				flex: 1;
				min-width: 40%;
				max-width: 40%;
				overflow: auto;
				transition: all 0.3s ease;
			}

			.parameters-container.collapsed {
				max-width: 0;
				min-width: 0;
				flex: 0;
				opacity: 0;
				visibility: hidden;
			}			
			
			.indicators-chart-container {
				width: 100%;
				height: 400px;
				margin-bottom: 20px;
				background-color: #f9f9f9;
				border: 1px solid #ddd;
				border-radius: 4px;
				padding: 20px;
			}

			.toggle-indicators-btn {
				background-color: #6da74a;
				padding: 12px 24px;
				color: white;
				border: none;
				border-radius: 6px;
				cursor: pointer;
				font-family: 'Arial', sans-serif;
				font-size: 14px;
				font-weight: 600;
				transition: all 0.3s ease;
				box-shadow: 0 2px 5px rgba(0,0,0,0.1);
				display: inline-flex;
				align-items: center;
				justify-content: center;
			}

			.toggle-indicators-btn:hover {
				transform: translateY(-2px);
				box-shadow: 0 4px 8px rgba(0,0,0,0.15);
			}

			.toggle-indicators-btn:active {
				transform: translateY(0);
				box-shadow: 0 2px 3px rgba(0,0,0,0.1);
			}

			.toggle-indicators-btn::before {
				content: "📋 ";
				margin-right: 8px;
			}

			.indicators-container {
				flex: 1;
				min-width: 40%;
				max-width: 40%;
				overflow: auto;
				transition: all 0.3s ease;
			}

			.indicators-container.collapsed {
				max-width: 0;
				min-width: 0;
				flex: 0;
				opacity: 0;
				visibility: hidden;
			}

			.indicators-table {
				width: 100%;
				border-collapse: collapse;
				margin-top: 20px;
				font-family: Arial, sans-serif;
			}

			.indicators-table th, .indicators-table td {
				border: 1px solid #ddd;
				padding: 8px;
				text-align: left;
			}

			.indicators-table th {
				background-color: #4a6da7;
				color: white;
				font-weight: bold;
			}

			.indicators-table tr:nth-child(even) {
				background-color: #f2f2f2;
			}	
			.highlight-row {
				background-color: rgba(71, 99, 255, 0.4) !important;
				box-shadow: 0 0 8px rgba(74, 109, 167, 0.5);
				transition: all 0.3s ease;
			}			
        `;
        document.head.appendChild(style);
        
        try {
            const chartContainer = container.querySelector('.chart-container');
            const objectsChartContainer = container.querySelector('.objects-chart-container');
			const parametersChartContainer = container.querySelector('.parameters-chart-container'); 
			const indicatorsChartContainer = container.querySelector('.indicators-chart-container');
			
            const tablesContainer = container.querySelector('.tables-container');
            const toggleObjectsBtn = container.querySelector('.toggle-objects-btn');
            const objectsPanel = container.querySelector('.objects-container');
            const filtersContainer = container.querySelector('.filters-container');
			
			const toggleParametersBtn = container.querySelector('.toggle-parameters-btn');
			const parametersPanel = container.querySelector('.parameters-container');	

			const toggleIndicatorsBtn = container.querySelector('.toggle-indicators-btn');
			const indicatorsPanel = container.querySelector('.indicators-container');
			
            // Создаем фильтры
            createFilters(data, filtersContainer);
            
            // Создаем графики
            createBarChart(data, chartContainer);
            const updateObjectsChart = createObjectsChart(data, objectsChartContainer);  
			const updateParametersChart = createParametersChart(data, parametersChartContainer);
			const updateIndicatorsChart = createIndicatorsChart(data, indicatorsChartContainer);			
            
            // Обработчик кнопки "раскрыть"
            const toggleBtn = container.querySelector('.toggle-table-btn');
            const rightPanel = container.querySelector('.dashboard-right');
            
            toggleBtn.addEventListener('click', () => {
                const isCollapsed = rightPanel.classList.contains('collapsed');
                rightPanel.classList.toggle('collapsed');
                toggleBtn.textContent = isCollapsed ? 'Скрыть таблицу связей' : 'Показать таблицу связей';
                
                if (isCollapsed) {
                    tablesContainer.innerHTML = '';
                    createTargetTables(data, tablesContainer);
                }
            });

			toggleObjectsBtn.addEventListener('click', () => {
				const isCollapsed = objectsPanel.classList.contains('collapsed');
				objectsPanel.classList.toggle('collapsed');
				toggleObjectsBtn.textContent = isCollapsed ? 'Скрыть объекты управления' : 'Показать объекты управления';
				
				if (isCollapsed) {
					const objectsTableContainer = container.querySelector('.objects-table-container');
					objectsTableContainer.innerHTML = '';
					
					// Получаем выбранные темы из фильтров
					const selectedThemes = [...document.querySelectorAll('.theme-checkbox:checked')].map(cb => cb.value);
					createObjectsTable(data, objectsTableContainer, selectedThemes);
				}
			});        
            
			toggleParametersBtn.addEventListener('click', () => {
				const isCollapsed = parametersPanel.classList.contains('collapsed');
				parametersPanel.classList.toggle('collapsed');
				toggleParametersBtn.textContent = isCollapsed ? 'Скрыть параметры' : 'Показать параметры';
				
				if (isCollapsed) {
					const parametersTableContainer = container.querySelector('.parameters-table-container');
					parametersTableContainer.innerHTML = '';
					
					const selectedThemes = [...document.querySelectorAll('.theme-checkbox:checked')].map(cb => cb.value);
					createParametersTable(data, parametersTableContainer, selectedThemes);
				}
			});
			
			toggleIndicatorsBtn.addEventListener('click', () => {
				const isCollapsed = indicatorsPanel.classList.contains('collapsed');
				indicatorsPanel.classList.toggle('collapsed');
				toggleIndicatorsBtn.textContent = isCollapsed ? 'Скрыть показатели' : 'Показать показатели';
				
				if (isCollapsed) {
					const indicatorsTableContainer = container.querySelector('.indicators-table-container');
					indicatorsTableContainer.innerHTML = '';
					
					const selectedThemes = [...document.querySelectorAll('.theme-checkbox:checked')].map(cb => cb.value);
					createIndicatorsTable(data, indicatorsTableContainer, selectedThemes);
				}
			});	
            // Добавляем кнопку экспорта
            addExportButton(data);
            
        } catch (error) {
            console.error('Ошибка при создании дашборда:', error);
            container.innerHTML = '<p>Произошла ошибка при загрузке компонентов дашборда</p>';
        }
    } catch (error) {
        console.error('Ошибка при создании дашборда:', error);
        container.innerHTML = `
            <div class="error-state">
                <h3>Ошибка при загрузке компонентов</h3>
                <p>Пожалуйста, обновите страницу или попробуйте позже.</p>
                <p>Детали: ${error.message}</p>
            </div>
        `;
    }
}

function createFilters(data, container) {
    // Получаем уникальные темы и OIV
    const themes = [...new Set(data.edges.map(edge => edge.theme))];
    const sourceOIVs = [...new Set(data.edges.map(edge => edge.source))];
    const sourceOIVNames = sourceOIVs.map(id => ({
        id,
        name: data.oiv.find(oiv => oiv.id === id)?.name || id
    }));

    // Очищаем контейнер
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.gap = '20px';
    container.style.flexWrap = 'wrap';
    container.style.marginBottom = '20px';

    // Функция для создания выпадающего списка фильтров
    function createDropdownFilter(title, items, className, allChecked = true) {
        const dropdownId = `dropdown-${className}`;
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'dropdown-filter';
        dropdownContainer.style.position = 'relative';
        dropdownContainer.style.marginBottom = '0';
        dropdownContainer.style.minWidth = '280px';

        // Кнопка для открытия/закрытия dropdown
        const dropdownBtn = document.createElement('button');
        dropdownBtn.className = 'dropdown-btn';
        dropdownBtn.textContent = title;
        dropdownBtn.style.width = '100%';
        dropdownBtn.style.padding = '10px 15px';
        dropdownBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        dropdownBtn.style.border = '1px solid #ddd';
        dropdownBtn.style.borderRadius = '4px';
        dropdownBtn.style.textAlign = 'left';
        dropdownBtn.style.cursor = 'pointer';
        dropdownBtn.style.display = 'flex';
        dropdownBtn.style.justifyContent = 'space-between';
        dropdownBtn.style.alignItems = 'center';

        const arrowIcon = document.createElement('span');
        arrowIcon.textContent = '▼';
        arrowIcon.style.fontSize = '12px';
        dropdownBtn.appendChild(arrowIcon);

        // Контейнер для чекбоксов
        const dropdownContent = document.createElement('div');
        dropdownContent.id = dropdownId;
        dropdownContent.className = 'dropdown-content';
        dropdownContent.style.display = 'none';
        dropdownContent.style.position = 'absolute';
        dropdownContent.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        dropdownContent.style.border = '1px solid #ddd';
        dropdownContent.style.borderRadius = '4px';
        dropdownContent.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        dropdownContent.style.zIndex = '1000';
        dropdownContent.style.width = '100%';
        dropdownContent.style.maxHeight = '300px';
        dropdownContent.style.overflowY = 'auto';
        dropdownContent.style.padding = '10px';

        // Для фильтра ОИВ добавляем чекбокс "Объединить все ОИВ"
        if (className === 'oiv') {
            const combineOIVDiv = document.createElement('div');
            combineOIVDiv.className = 'filter-checkbox';
            combineOIVDiv.style.marginBottom = '10px';
            combineOIVDiv.style.paddingBottom = '10px';
            combineOIVDiv.style.borderBottom = '1px solid #eee';

            const combineOIVLabel = document.createElement('label');
            combineOIVLabel.style.display = 'flex';
            combineOIVLabel.style.alignItems = 'center';
            combineOIVLabel.style.cursor = 'pointer';

            const combineOIVCheckbox = document.createElement('input');
            combineOIVCheckbox.type = 'checkbox';
            combineOIVCheckbox.className = 'combine-oiv-checkbox';
            combineOIVCheckbox.checked = true;
            combineOIVCheckbox.style.marginRight = '8px';

            combineOIVLabel.appendChild(combineOIVCheckbox);
            combineOIVLabel.appendChild(document.createTextNode('Все органы власти'));
            combineOIVDiv.appendChild(combineOIVLabel);
            dropdownContent.appendChild(combineOIVDiv);
        }

        // Чекбокс "Выбрать все"
        const selectAllDiv = document.createElement('div');
        selectAllDiv.className = 'filter-checkbox';
        selectAllDiv.style.marginBottom = '10px';
        selectAllDiv.style.paddingBottom = '10px';
        selectAllDiv.style.borderBottom = '1px solid #eee';

        const selectAllLabel = document.createElement('label');
        selectAllLabel.style.display = 'flex';
        selectAllLabel.style.alignItems = 'center';
        selectAllLabel.style.cursor = 'pointer';

        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.className = `all-${className}-checkbox`;
        selectAllCheckbox.checked = false;
        selectAllCheckbox.style.marginRight = '8px';

        selectAllLabel.appendChild(selectAllCheckbox);
        selectAllLabel.appendChild(document.createTextNode('Выбрать все'));
        selectAllDiv.appendChild(selectAllLabel);
        dropdownContent.appendChild(selectAllDiv);

        // Добавляем чекбоксы для каждого элемента
        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'filter-checkbox';
            itemDiv.style.margin = '5px 0';

            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.cursor = 'pointer';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = `${className}-checkbox`;
            checkbox.value = item.id || item.name || item;
            checkbox.checked = false;
            checkbox.style.marginRight = '8px';

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(item.name || item));
            itemDiv.appendChild(label);
            dropdownContent.appendChild(itemDiv);
        });

        // Обработчик клика по кнопке
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isShowing = dropdownContent.style.display === 'block';
            dropdownContent.style.display = isShowing ? 'none' : 'block';
            arrowIcon.textContent = isShowing ? '▼' : '▲';
        });

        // Закрываем dropdown при клике вне его
        document.addEventListener('click', (e) => {
            if (!dropdownContainer.contains(e.target)) {
                dropdownContent.style.display = 'none';
                arrowIcon.textContent = '▼';
            }
        });

        dropdownContainer.appendChild(dropdownBtn);
        dropdownContainer.appendChild(dropdownContent);
        return dropdownContainer;
    }

    // Создаем выпадающие списки фильтров
    const oivFilterDropdown = createDropdownFilter('Органы власти', sourceOIVNames, 'oiv');
    const themeFilterDropdown = createDropdownFilter('Темы', themes, 'theme');

    container.appendChild(oivFilterDropdown);
    container.appendChild(themeFilterDropdown);

    // Функция для обновления графиков
	function updateChartsHandler() {
		const selectedOIVs = [...oivFilterDropdown.querySelectorAll('.oiv-checkbox:checked')].map(cb => cb.value);
		const selectedThemes = [...themeFilterDropdown.querySelectorAll('.theme-checkbox:checked')].map(cb => cb.value);
		
		// Получаем rightPanel из DOM
		const rightPanel = document.querySelector('.dashboard-right');
		const objectsPanel = document.querySelector('.objects-container');
		const parametersPanel = document.querySelector('.parameters-container');
		const indicatorsPanel = document.querySelector('.indicators-container');
		
		// Обновляем графики
		updateCharts(data, selectedOIVs, selectedThemes);
		
		// Обновляем таблицы связей
		if (rightPanel && !rightPanel.classList.contains('collapsed')) {
			const tablesContainer = document.querySelector('.tables-container');
			if (tablesContainer) {
				tablesContainer.innerHTML = '';
				createTargetTables(data, tablesContainer, selectedOIVs, selectedThemes);
			}
		}
		
		// Обновляем таблицы объектов
		if (objectsPanel && !objectsPanel.classList.contains('collapsed')) {
			const objectsTableContainer = document.querySelector('.objects-table-container');
			if (objectsTableContainer) {
				objectsTableContainer.innerHTML = '';
				createObjectsTable(data, objectsTableContainer, selectedThemes, selectedOIVs);
			}
		}
		
		// Обновляем таблицы параметров
		if (parametersPanel && !parametersPanel.classList.contains('collapsed')) {
			const parametersTableContainer = document.querySelector('.parameters-table-container');
			if (parametersTableContainer) {
				parametersTableContainer.innerHTML = '';
				createParametersTable(data, parametersTableContainer, selectedThemes, selectedOIVs);
			}
		}
		
		// Обновляем таблицы показателей
		if (indicatorsPanel && !indicatorsPanel.classList.contains('collapsed')) {
			const indicatorsTableContainer = document.querySelector('.indicators-table-container');
			if (indicatorsTableContainer) {
				indicatorsTableContainer.innerHTML = '';
				createIndicatorsTable(data, indicatorsTableContainer, selectedThemes, selectedOIVs);
			}
		}
	}
    // Обработчики событий для чекбоксов "Выбрать все"
    oivFilterDropdown.querySelector(`.all-oiv-checkbox`).addEventListener('change', function() {
        const isChecked = this.checked;
        oivFilterDropdown.querySelectorAll('.oiv-checkbox').forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        updateChartsHandler();
    });
    
    themeFilterDropdown.querySelector(`.all-theme-checkbox`).addEventListener('change', function() {
        const isChecked = this.checked;
        themeFilterDropdown.querySelectorAll('.theme-checkbox').forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        updateChartsHandler();
    });
    
    // Обработчики событий для отдельных чекбоксов
    oivFilterDropdown.querySelectorAll('.oiv-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const allChecked = [...oivFilterDropdown.querySelectorAll('.oiv-checkbox')].every(cb => cb.checked);
            oivFilterDropdown.querySelector('.all-oiv-checkbox').checked = allChecked;
            updateChartsHandler();
        });
    });
    
    themeFilterDropdown.querySelectorAll('.theme-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const allChecked = [...themeFilterDropdown.querySelectorAll('.theme-checkbox')].every(cb => cb.checked);
            themeFilterDropdown.querySelector('.all-theme-checkbox').checked = allChecked;
            updateChartsHandler();
        });
    });
    
    // Обработчик для чекбокса "Объединить все ОИВ"
    const combineOIVCheckbox = oivFilterDropdown.querySelector('.combine-oiv-checkbox');
    if (combineOIVCheckbox) {
        combineOIVCheckbox.addEventListener('change', function() {
            // При включении "Объединить все ОИВ" снимаем выбор с отдельных ОИВ
            if (this.checked) {
                oivFilterDropdown.querySelectorAll('.oiv-checkbox').forEach(checkbox => {
                    checkbox.checked = false;
                });
                oivFilterDropdown.querySelector('.all-oiv-checkbox').checked = false;
            }
            updateChartsHandler();
        });
    }
    
    // Инициализируем графики с текущими фильтрами
    updateChartsHandler();
}

function updateCharts(data, selectedOIVs, selectedThemes) {
    // Обновляем первый график
    const chartCanvas = document.getElementById('dashboardChart');
    if (chartCanvas) {
        const ctx = chartCanvas.getContext('2d');
        
        if (window.dashboardChart && typeof window.dashboardChart.destroy === 'function') {
            window.dashboardChart.destroy();
        }
        
        const allThemes = [...new Set(data.edges.map(edge => edge.theme))];
        const allOIVs = [...new Set(data.edges.map(edge => edge.source))];
		
        // Фильтруем данные по выбранным темам
        const filteredThemes = selectedThemes.length > 0 ? selectedThemes : allThemes;
        const filteredOIVs = selectedOIVs.length > 0 ? selectedOIVs : allOIVs;

        if (filteredThemes.length === 0 || filteredOIVs.length === 0) {
            return;
        }
        
        // Получаем состояние чекбокса "Объединить все ОИВ"
        const combineOIV = document.querySelector('.combine-oiv-checkbox')?.checked || false;

        // Создаем датасеты для каждого выбранного OIV
        let datasets;
        
        // Если выбран чекбокс "Объединить все ОИВ", создаем один датасет
        if (combineOIV) {
            datasets = [{
                label: 'Все органы власти',
                data: filteredThemes.map(theme => 
                    data.edges.filter(edge => 
                        edge.theme === theme && 
                        (selectedOIVs.length === 0 || selectedOIVs.includes(edge.source))
                    ).length
                ),
                backgroundColor: '#4a6da7',
                borderColor: '#3a5a8f',
                borderWidth: 1
            }];
        } else {
            // Иначе создаем датасеты для каждого OIV
            datasets = selectedOIVs.length > 0 ? 
                selectedOIVs.map((oivId, index) => {
                    const oivName = data.oiv.find(oiv => oiv.id === oivId)?.name || oivId;
                    // Используем фиксированные цвета из палитры
                    const colorIndex = index % COLOR_PALETTE.length;
                    return {
                        label: oivName,
                        data: filteredThemes.map(theme => 
                            data.edges.filter(edge => 
                                edge.theme === theme && edge.source === oivId
                            ).length
                        ),
                        backgroundColor: COLOR_PALETTE[colorIndex],
                        borderColor: COLOR_PALETTE[colorIndex],
                        borderWidth: 1
                    };
                }) : 
                [{
                    label: 'Все органы власти',
                    data: filteredThemes.map(theme => 
                        data.edges.filter(edge => edge.theme === theme).length
                    ),
                    backgroundColor: '#4a6da7',
                    borderColor: '#3a5a8f',
                    borderWidth: 1
                }];
        }
        
        window.dashboardChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: filteredThemes,
                datasets: datasets
            },
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
                },
				plugins: {
					datalabels: {
						display: true,
						color: '#000',
						anchor: 'end',
						align: 'top',
						formatter: Math.round
					}
				}			
            }
        });
    }
    
    // Обновляем график объектов управления
    if (window.updateObjectsChart && typeof window.updateObjectsChart === 'function') {
        window.updateObjectsChart(selectedOIVs, selectedThemes);
    }

    // Обновляем график параметров
    if (window.updateParametersChart && typeof window.updateParametersChart === 'function') {
        window.updateParametersChart(selectedOIVs, selectedThemes);
    }

    // Обновляем график показателей
	if (window.updateIndicatorsChart && typeof window.updateIndicatorsChart === 'function') {
		window.updateIndicatorsChart(selectedOIVs, selectedThemes);
	}
}


function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

async function createBarChart(data, container) {
    if (!container) {
        console.error('Контейнер для графика не найден');
        return;
    }

    try {
        await loadChartJS();
        
        const themes = [...new Set(data.edges.map(edge => edge.theme))];
        const sourceOIVs = [...new Set(data.edges.map(edge => edge.source))];
        const sourceOIVNames = sourceOIVs.map(id => ({
            id,
            name: data.oiv.find(oiv => oiv.id === id)?.name || id
        }));

        if (themes.length === 0 || sourceOIVNames.length === 0) {
            container.innerHTML = '<p>Недостаточно данных для построения графика</p>';
            return;
        }

        container.innerHTML = '';
        
        const chartDiv = document.createElement('div');
        chartDiv.style.width = '100%';
        chartDiv.style.height = '350px';
        chartDiv.style.position = 'relative';
        container.appendChild(chartDiv);
        
        const chartCanvas = document.createElement('canvas');
        chartCanvas.id = 'dashboardChart';
        chartDiv.appendChild(chartCanvas);

        // Инициализация графика с пустыми данными
        const ctx = chartCanvas.getContext('2d');
        window.dashboardChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: []
            },
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

    } catch (error) {
        console.error('Ошибка при создании графика:', error);
        container.innerHTML = '<p>Ошибка при создании графика. Пожалуйста, обновите страницу.</p>';
    }
}

function createObjectsChart(data, container) {
    if (!objectsData || objectsData.length === 0) {
        container.innerHTML = '<p>Нет данных об объектах управления</p>';
        return;
    }

    const themes = [...new Set(data.edges.map(edge => edge.theme))];
    if (themes.length === 0) {
        container.innerHTML = '<p>Нет данных для отображения графика</p>';
        return;
    }

    // Создаем контейнер для графика
    const chartDiv = document.createElement('div');
    chartDiv.style.width = '100%';
    chartDiv.style.height = '350px';
    chartDiv.style.position = 'relative';
    container.appendChild(chartDiv);
    
    const chartCanvas = document.createElement('canvas');
    chartCanvas.id = 'objectsChart';
    chartDiv.appendChild(chartCanvas);

    // Функция обновления графика
    const updateChart = (selectedOIVs = [], selectedThemes = []) => {
        const ctx = chartCanvas.getContext('2d');
        
        if (window.objectsChart && typeof window.objectsChart.destroy === 'function') {
            window.objectsChart.destroy();
        }
        
        // Фильтруем темы, если выбраны конкретные
        const filteredThemes = selectedThemes.length > 0 ? selectedThemes : themes;
        
        // Фильтруем объекты по выбранным OIV и темам
        const filteredObjects = objectsData.filter(obj => 
            (selectedOIVs.length === 0 || selectedOIVs.includes(obj.oiv_id)) &&
            (selectedThemes.length === 0 || selectedThemes.includes(obj.theme))
        );
        
        const chartData = {
            labels: filteredThemes,
            datasets: [
                {
                    label: 'Все объекты управления',
                    data: filteredThemes.map(theme => {
                        return filteredObjects.filter(obj => 
                            obj.theme === theme
                        ).length;
                    }),
                    backgroundColor: '#4a6da7',
                    borderColor: '#3a5a8f',
                    borderWidth: 1
                },
                {
                    label: 'Объекты управления ОИВ',
                    data: filteredThemes.map(theme => {
                        return filteredObjects.filter(obj => 
                            obj.theme === theme && 
                            obj.info_type === 1
                        ).length;
                    }),
                    backgroundColor: '#6da74a',
                    borderColor: '#5a8f3a',
                    borderWidth: 1
                },
                {
                    label: 'Объекты управления, сфорированные ИИ',
                    data: filteredThemes.map(theme => {
                        return filteredObjects.filter(obj => 
                            obj.theme === theme && 
                            obj.info_type === 2
                        ).length;
                    }),
                    backgroundColor: '#a76d4a',
                    borderColor: '#8f5a3a',
                    borderWidth: 1
                },
				{
					label: 'Объекты управления в ОИВ и ИИ',
					data: filteredThemes.map(theme => {
						return filteredObjects.filter(obj => 
							obj.theme === theme && 
							obj.info_type === 1 &&
							obj.AI_object_id
						).length;
					}),
					backgroundColor: '#5c6061', 
					borderColor: '#5c6061',
					borderWidth: 1
				}				
            ]
        };

		window.objectsChart = new Chart(ctx, {
			type: 'bar',
			data: chartData,
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						labels: {
							color: '#333',
							font: {
								size: 12
							}
						},
						position: 'top',
					}
				},
				scales: {
					y: {
						beginAtZero: true,
						title: {
							display: true,
							text: 'Количество объектов',
							color: '#4a5568',
							font: {
								weight: 'bold',
								size: 12
							}
						},
						ticks: {
							color: '#4a5568',
							font: {
								size: 11
							}
						},
						grid: {
							color: 'rgba(0, 0, 0, 0.05)',
							drawBorder: false
						}
					},
					x: {
						title: {
							display: true,
							text: 'Темы',
							color: '#4a5568',
							font: {
								weight: 'bold',
								size: 12
							}
						},
						ticks: {
							color: '#4a5568',
							font: {
								size: 11
							}
						},
						grid: {
							display: false,
							drawBorder: false
						}
					}
				},
				onHover: (event, chartElements) => {
					if (chartElements.length > 0) {
						const { datasetIndex, index } = chartElements[0];
						const theme = filteredThemes[index];
						let infoType = 'all';
						
						if (datasetIndex === 0) infoType = 'all';
						else if (datasetIndex === 1) infoType = 'oiv';
						else if (datasetIndex === 2) infoType = 'ai';
						else if (datasetIndex === 3) infoType = 'both';
						
						highlightTableRows('.objects-table', theme, infoType);
					} else {
						// Убираем подсветку при уходе курсора
						document.querySelectorAll('.objects-table tr').forEach(row => {
							row.classList.remove('highlight-row');
						});
					}
				},
				plugins: {
					datalabels: {
						display: true,
						color: '#000',
						anchor: 'end',
						align: 'top'
					}
				}
			}
		});
    };

    // Инициализация графика
    updateChart();
    
    // Сохраняем функцию в глобальной области видимости для доступа из других функций
    window.updateObjectsChart = updateChart;
    
    return updateChart;
}

function createParametersChart(data, container, selectedOIVs = [], selectedThemes = []) {
    if (!parametersData || parametersData.length === 0) {
        container.innerHTML = '<p>Нет данных о параметрах объектов управления</p>';
        return;
    }

    const themes = [...new Set(data.edges.map(edge => edge.theme))];
    if (themes.length === 0) {
        container.innerHTML = '<p>Нет данных для отображения графика</p>';
        return;
    }

    // Создаем контейнер для графика
    const chartDiv = document.createElement('div');
    chartDiv.style.width = '100%';
    chartDiv.style.height = '350px';
    chartDiv.style.position = 'relative';
    container.appendChild(chartDiv);
    
    const chartCanvas = document.createElement('canvas');
    chartCanvas.id = 'parametersChart';
    chartDiv.appendChild(chartCanvas);

    // Функция обновления графика
    const updateChart = (selectedOIVs = [], selectedThemes = []) => {
        const ctx = chartCanvas.getContext('2d');
        
        if (window.parametersChart && typeof window.parametersChart.destroy === 'function') {
            window.parametersChart.destroy();
        }
        
        // Фильтруем темы, если выбраны конкретные
        const filteredThemes = selectedThemes.length > 0 ? selectedThemes : themes;
        
        // Фильтруем параметры по выбранным темам
        let filteredParameters = parametersData.filter(param => 
            filteredThemes.includes(param.theme)
        );
        
        // Если выбраны OIV, фильтруем объекты по OIV и затем параметры по этим объектам
        if (selectedOIVs.length > 0) {
            // Получаем все object_id для выбранных OIV
            const filteredObjectIds = objectsData
                .filter(obj => selectedOIVs.includes(obj.oiv_id))
                .map(obj => obj.object_id);
            
            // Фильтруем параметры по object_id
            filteredParameters = filteredParameters.filter(param => 
                filteredObjectIds.includes(param.object_id)
            );
        }
        
        const chartData = {
            labels: filteredThemes,
            datasets: [
                {
                    label: 'Все параметры',
                    data: filteredThemes.map(theme => {
                        return filteredParameters.filter(param => 
                            param.theme === theme
                        ).length;
                    }),
                    backgroundColor: '#4a6da7',
                    borderColor: '#3a5a8f',
                    borderWidth: 1
                },
                {
                    label: 'Параметры по данным ОИВ',
                    data: filteredThemes.map(theme => {
                        return filteredParameters.filter(param => 
                            param.theme === theme && 
                            param.info_type === 1
                        ).length;
                    }),
                    backgroundColor: '#6da74a',
                    borderColor: '#5a8f3a',
                    borderWidth: 1
                },
                {
                    label: 'Параметры по данным ИИ',
                    data: filteredThemes.map(theme => {
                        return filteredParameters.filter(param => 
                            param.theme === theme && 
                            param.info_type === 2
                        ).length;
                    }),
                    backgroundColor: '#a76d4a',
                    borderColor: '#8f5a3a',
                    borderWidth: 1
                },
                {
                    label: 'Параметры в ОИВ и ИИ',
                    data: filteredThemes.map(theme => {
                        return filteredParameters.filter(param => 
                            param.theme === theme && 
                            param.info_type === 1 &&
                            param.AI_parameter_id
                        ).length;
                    }),
                    backgroundColor: '#5c6061',
                    borderColor: '#5c6061',
                    borderWidth: 1
                }                
            ]
        };

        window.parametersChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#333',
                            font: {
                                size: 12
                            }
                        },
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Количество параметров',
                            color: '#4a5568',
                            font: {
                                weight: 'bold',
                                size: 12
                            }
                        },
                        ticks: {
                            color: '#4a5568',
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Темы',
                            color: '#4a5568',
                            font: {
                                weight: 'bold',
                                size: 12
                            }
                        },
                        ticks: {
                            color: '#4a5568',
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            display: false,
                            drawBorder: false
                        }
                    }
                },
                onHover: (event, chartElements) => {
                    if (chartElements.length > 0) {
                        const { datasetIndex, index } = chartElements[0];
                        const theme = filteredThemes[index];
                        let infoType = 'all';
                        
                        if (datasetIndex === 0) infoType = 'all';
                        else if (datasetIndex === 1) infoType = 'oiv';
                        else if (datasetIndex === 2) infoType = 'ai';
                        else if (datasetIndex === 3) infoType = 'both';
                        
                        highlightTableRows('.parameters-table', theme, infoType);
                    } else {
                        // Убираем подсветку при уходе курсора
                        document.querySelectorAll('.parameters-table tr').forEach(row => {
                            row.classList.remove('highlight-row');
                        });
                    }
                },
				plugins: {
					datalabels: {
						display: true,
						color: '#000',
						anchor: 'end',
						align: 'top'
					}
				}            
            }
        });
    };

    // Инициализация графика
    updateChart();
    
    // Сохраняем функцию в глобальной области видимости для доступа из других функций
    window.updateParametersChart = updateChart;
    
    return updateChart;
}

function createIndicatorsChart(data, container) {
    if (!indicatorsData || indicatorsData.length === 0) {
        container.innerHTML = '<p>Нет данных о показателях</p>';
        return;
    }

    const themes = [...new Set(data.edges.map(edge => edge.theme))];
    if (themes.length === 0) {
        container.innerHTML = '<p>Нет данных для отображения графика</p>';
        return;
    }

    // Создаем контейнер для графика
    container.innerHTML = '';
    const chartDiv = document.createElement('div');
    chartDiv.style.width = '100%';
    chartDiv.style.height = '350px';
    chartDiv.style.position = 'relative';
    container.appendChild(chartDiv);
    
    const chartCanvas = document.createElement('canvas');
    chartCanvas.id = 'indicatorsChart';
    chartDiv.appendChild(chartCanvas);

    // Функция обновления графика
    const updateChart = (selectedOIVs = [], selectedThemes = []) => {
        const ctx = chartCanvas.getContext('2d');
        
        if (window.indicatorsChart && typeof window.indicatorsChart.destroy === 'function') {
            window.indicatorsChart.destroy();
        }
        
        // Фильтруем темы, если выбраны конкретные
        const filteredThemes = selectedThemes.length > 0 ? selectedThemes : themes;
        
        // Фильтруем показатели по выбранным темам и OIV (если есть)
        let filteredIndicators = indicatorsData.filter(ind => 
            filteredThemes.includes(ind.theme)
        );
        
        // Если выбраны OIV, фильтруем по ним
        if (selectedOIVs.length > 0) {
            filteredIndicators = filteredIndicators.filter(ind => 
                selectedOIVs.includes(ind.oiv_id)
            );
        }
        
        const chartData = {
            labels: filteredThemes,
            datasets: [
                {
                    label: 'Все показатели',
                    data: filteredThemes.map(theme => {
                        return filteredIndicators.filter(ind => 
                            ind.theme === theme
                        ).length;
                    }),
                    backgroundColor: '#4a6da7',
                    borderColor: '#3a5a8f',
                    borderWidth: 1
                },
                {
                    label: 'Показатели по данным ОИВ',
                    data: filteredThemes.map(theme => {
                        return filteredIndicators.filter(ind => 
                            ind.theme === theme && 
                            ind.info_type === 1
                        ).length;
                    }),
                    backgroundColor: '#6da74a',
                    borderColor: '#5a8f3a',
                    borderWidth: 1
                },
                {
                    label: 'Показатели по данным ИИ',
                    data: filteredThemes.map(theme => {
                        return filteredIndicators.filter(ind => 
                            ind.theme === theme && 
                            ind.info_type === 2
                        ).length;
                    }),
                    backgroundColor: '#a76d4a',
                    borderColor: '#8f5a3a',
                    borderWidth: 1
                },
				{
					label: 'Показатели в ОИВ и ИИ',
					data: filteredThemes.map(theme => {
						return filteredIndicators.filter(ind => 
							ind.theme === theme && 
							ind.info_type === 1 &&
							ind.AI_indicator_id
						).length;
					}),
					backgroundColor: '#5c6061', 
					borderColor: '#5c6061',
					borderWidth: 1
				}				
            ]
        };

        window.indicatorsChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#333',
                            font: {
                                size: 12
                            }
                        },
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Количество показателей',
                            color: '#4a5568',
                            font: {
                                weight: 'bold',
                                size: 12
                            }
                        },
                        ticks: {
                            color: '#4a5568',
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Темы',
                            color: '#4a5568',
                            font: {
                                weight: 'bold',
                                size: 12
                            }
                        },
                        ticks: {
                            color: '#4a5568',
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            display: false,
                            drawBorder: false
                        }
                    }
                },
				onHover: (event, chartElements) => {
					if (chartElements.length > 0) {
						const { datasetIndex, index } = chartElements[0];
						const theme = filteredThemes[index];
						let infoType = 'all';
						
						if (datasetIndex === 0) infoType = 'all';
						else if (datasetIndex === 1) infoType = 'oiv';
						else if (datasetIndex === 2) infoType = 'ai';
						else if (datasetIndex === 3) infoType = 'both';
						
						highlightTableRows('.indicators-table', theme, infoType);
					} else {
						// Убираем подсветку при уходе курсора
						document.querySelectorAll('.indicators-table tr').forEach(row => {
							row.classList.remove('highlight-row');
						});
					}
				},
				plugins: {
					datalabels: {
						display: true,
						color: '#000',
						anchor: 'end',
						align: 'top'
					}
				}			
            }
        });
    };

    // Инициализация графика
    updateChart();
    
    // Сохраняем функцию в глобальной области видимости для доступа из других функций
    window.updateIndicatorsChart = updateChart;
    
    return updateChart;
}

function createTargetTables(data, container, selectedOIVs = [], selectedThemes = []) {
    const allThemes = [...new Set(data.edges.map(edge => edge.theme))];
    const allOIVs = [...new Set(data.edges.map(edge => edge.source))];
    
    // Определяем, какие темы и OIV использовать
    const themes = selectedThemes.length > 0 ? selectedThemes : allThemes;
    const sourceOIVs = selectedOIVs.length > 0 ? selectedOIVs : allOIVs;
    
    // Если нет данных для отображения
    if (themes.length === 0 || sourceOIVs.length === 0) {
        container.innerHTML = '<p>Выберите фильтры для отображения данных</p>';
        return;
    }
    
    // Получаем выбранные source OIV из localStorage
    const savedFilters = localStorage.getItem('dashboardFilters');
    let selectedSourceOIVs = [];
    let selectedTargetOIVs = [];
    
    if (savedFilters) {
        try {
            const filters = JSON.parse(savedFilters);
            selectedSourceOIVs = filters.sourceOivIds || [];
            selectedTargetOIVs = filters.targetOivIds || [];
        } catch (e) {
            console.error('Error parsing filters:', e);
        }
    }
    
    // Если есть выбранные OIV в фильтрах, используем их
    if (selectedOIVs.length > 0) {
        selectedSourceOIVs = selectedOIVs;
    }
    
    themes.forEach(theme => {
        // Фильтруем связи по выбранной теме
        let themeEdges = data.edges.filter(edge => edge.theme === theme);
        
        // Фильтруем по выбранным источникам
        if (selectedSourceOIVs.length > 0) {
            themeEdges = themeEdges.filter(edge => selectedSourceOIVs.includes(edge.source));
        }
        
        // Если есть выбранные цели, фильтруем по ним
        if (selectedTargetOIVs.length > 0) {
            themeEdges = themeEdges.filter(edge => selectedTargetOIVs.includes(edge.target));
        }
        
        // Если после фильтрации нет связей, пропускаем эту тему
        if (themeEdges.length === 0) {
            return;
        }
        
        // Создаем контейнер для целевой таблицы
        const targetTableContainer = document.createElement('div');
        targetTableContainer.className = 'target-table-container visible';
        
        // Создаем строку с темой
        const themeRow = document.createElement('div');
        themeRow.className = 'theme-cell';
        themeRow.style.margin = '10px 0';
        themeRow.style.fontWeight = 'bold';
        themeRow.style.color = '#4a6da7';
        themeRow.textContent = `Тема: ${theme}`;
        targetTableContainer.appendChild(themeRow);
        
        // Получаем уникальные source OIV для этой темы после фильтрации
        const sourceOIVs = [...new Set(themeEdges.map(edge => edge.source))];
        
        // Создаем таблицу для каждой source OIV
        sourceOIVs.forEach(sourceOIVId => {
            const sourceName = data.oiv.find(oiv => oiv.id === sourceOIVId)?.name || sourceOIVId;
            
            // Создаем заголовок для source OIV
            const sourceHeader = document.createElement('h4');
            sourceHeader.textContent = `Источник: ${sourceName}`;
            targetTableContainer.appendChild(sourceHeader);

            // Создаем таблицу
            const table = document.createElement('table');
            table.className = 'dashboard-table';
            
            // Создаем заголовок таблицы
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            // Добавляем столбцы
            const numberHeader = document.createElement('th');
            numberHeader.textContent = '№';
            numberHeader.style.width = '50px';
            headerRow.appendChild(numberHeader);
            
            const targetHeader = document.createElement('th');
            targetHeader.textContent = 'Целевой орган власти';
            targetHeader.style.width = '300px';
            headerRow.appendChild(targetHeader);
            
            const detailsHeader = document.createElement('th');
            detailsHeader.textContent = 'Описание связи';
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
                    
                    // Ячейка с целевым органом власти
                    const targetCell = document.createElement('td');
                    targetCell.textContent = targetName;
                    row.appendChild(targetCell);
                    
                    // Ячейка с описанием связи
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

function createObjectsTable(data, container, selectedThemes = [], selectedOIVs = []) {
    if (!objectsData || objectsData.length === 0) {
        container.innerHTML = '<p>Нет данных об объектах управления</p>';
        return;
    }

    // Получаем уникальные темы из объектов управления
    let themes = [...new Set(objectsData.map(obj => obj.theme))];
    
    // Если переданы выбранные темы, фильтруем
    if (selectedThemes && selectedThemes.length > 0) {
        themes = themes.filter(theme => selectedThemes.includes(theme));
    }
    
    // Фильтруем объекты по выбранным OIV, если они указаны
    let filteredObjects = objectsData;
    if (selectedOIVs && selectedOIVs.length > 0) {
        filteredObjects = objectsData.filter(obj => selectedOIVs.includes(obj.oiv_id));
    }
    
    // Собираем все AI_object_id для объектов с info_type=1
    const aiObjectIds = new Set(
        filteredObjects
            .filter(obj => obj.info_type === 1 && obj.AI_object_id)
            .map(obj => obj.AI_object_id)
    );
    
    // Создаем маппинг AI_object_id -> массив object_id для всех связанных объектов
    const aiToObjectsMap = {};
    objectsData.forEach(obj => {
        if (obj.info_type === 1 && obj.AI_object_id) {
            if (!aiToObjectsMap[obj.AI_object_id]) {
                aiToObjectsMap[obj.AI_object_id] = [];
            }
            aiToObjectsMap[obj.AI_object_id].push(obj.object_id);
        }
    });
    
    // Создаем маппинг object_id -> AI_object_id для быстрого поиска
    const objectToAiMap = {};
    objectsData.forEach(obj => {
        if (obj.info_type === 1 && obj.AI_object_id) {
            objectToAiMap[obj.object_id] = obj.AI_object_id;
        }
    });
    
    themes.forEach(theme => {
        // Фильтруем объекты по текущей теме
        const themeObjects = objectsData.filter(obj => obj.theme === theme);
        if (themeObjects.length === 0) return;
        
        // Создаем заголовок темы
        const themeHeader = document.createElement('h3');
        themeHeader.textContent = `Тема: ${theme}`;
        themeHeader.style.color = '#6da74a';
        container.appendChild(themeHeader);
        
        // Создаем таблицу
        const table = document.createElement('table');
        table.className = 'objects-table';
		table.style.width = '100%'; 
        
        // Создаем заголовок таблицы
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Добавляем столбцы
        const nameHeader = document.createElement('th');
        nameHeader.textContent = 'Наименование объекта управления';
		nameHeader.style.width = '40%';
		
        headerRow.appendChild(nameHeader);
        
        const oivNameHeader = document.createElement('th');
        oivNameHeader.textContent = 'Орган власти';
        headerRow.appendChild(oivNameHeader);
        oivNameHeader.style.width = '40%';
		
        const oivHeader = document.createElement('th');
        oivHeader.textContent = 'Данные ОИВ';
        headerRow.appendChild(oivHeader);
        oivHeader.style.width = '10%';
		
        const aiHeader = document.createElement('th');
        aiHeader.textContent = 'Данные ИИ';
        headerRow.appendChild(aiHeader);
        aiHeader.style.width = '10%';
		
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
            
            // Ячейка с названием объекта
            const nameCell = document.createElement('td');
            nameCell.textContent = obj.name;
            row.appendChild(nameCell);
            
            // Ячейка с органом власти
            const oivNameCell = document.createElement('td');
            const oiv = data.oiv.find(o => o.id === obj.oiv_id);
            oivNameCell.textContent = oiv ? oiv.name : 'Неизвестный орган';
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
            oivCell.innerHTML = hasOIVData ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(oivCell);
            
            // Ячейка с данными ИИ
            const aiCell = document.createElement('td');
            aiCell.style.textAlign = 'center';
            aiCell.innerHTML = hasAIData ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(aiCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        container.appendChild(table);
    });
}

function createParametersTable(data, container, selectedThemes = [], selectedOIVs = []) {
    if (!parametersData || parametersData.length === 0) {
        container.innerHTML = '<p>Нет данных о параметрах объектов управления</p>';
        return;
    }

    // Получаем уникальные темы из параметров
    let themes = [...new Set(parametersData.map(param => param.theme))];
    
    // Если выбраны темы, фильтруем
    if (selectedThemes.length > 0) {
        themes = themes.filter(theme => selectedThemes.includes(theme));
    }
    
    // Фильтруем объекты по выбранным OIV
    let filteredObjects = objectsData;
    if (selectedOIVs && selectedOIVs.length > 0) {
        filteredObjects = objectsData.filter(obj => selectedOIVs.includes(obj.oiv_id));
    }
    
    // Затем фильтруем параметры по отфильтрованным объектам
    let filteredParameters = parametersData;
    if (selectedOIVs && selectedOIVs.length > 0) {
        const filteredObjectIds = new Set(filteredObjects.map(obj => obj.object_id));
        filteredParameters = parametersData.filter(param => filteredObjectIds.has(param.object_id));
    }
    
    // Собираем все AI_object_id для объектов с info_type=1
    const aiObjectIds = new Set(
        objectsData
            .filter(obj => obj.info_type === 1 && obj.AI_object_id)
            .map(obj => obj.AI_object_id)
    );
    
    themes.forEach(theme => {
        // Фильтруем параметры по текущей теме
        const themeParameters = parametersData.filter(param => param.theme === theme);
        if (themeParameters.length === 0) return;
        
        // Создаем заголовок темы
        const themeHeader = document.createElement('h3');
        themeHeader.textContent = `Тема: ${theme}`;
        themeHeader.style.color = '#4a6da7';
        container.appendChild(themeHeader);
        
        // Создаем таблицу
        const table = document.createElement('table');
        table.className = 'parameters-table';
        
        // Создаем заголовок таблицы
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Добавляем столбцы
        const nameHeader = document.createElement('th');
        nameHeader.textContent = 'Наименование параметра';
        headerRow.appendChild(nameHeader);
        
        const objectHeader = document.createElement('th');
        objectHeader.textContent = 'Объект управления';
        headerRow.appendChild(objectHeader);
        
        const oivNameHeader = document.createElement('th');
        oivNameHeader.textContent = 'Орган власти';
        headerRow.appendChild(oivNameHeader);
        
        const oivHeader = document.createElement('th');
        oivHeader.textContent = 'Данные ОИВ';
        headerRow.appendChild(oivHeader);
        
        const aiHeader = document.createElement('th');
        aiHeader.textContent = 'Данные ИИ';
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
            
            // Пропускаем параметры, чьи object_id есть в aiObjectIds
            if (aiObjectIds.has(param.object_id)) {
                return;
            }
            
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
            
            // Ячейка с названием параметра
            const nameCell = document.createElement('td');
            nameCell.textContent = param.parameter_name;
            row.appendChild(nameCell);
            
            // Ячейка с объектом управления - находим объект по object_id в objectsData
            const objectCell = document.createElement('td');
            const object = objectsData.find(obj => obj.object_id === param.object_id);
            objectCell.textContent = object ? object.object_name : `Неизвестный объект (ID: ${param.object_id})`;
            row.appendChild(objectCell);
            
            // Ячейка с органом власти
            const oivNameCell = document.createElement('td');
            const oiv = object ? data.oiv.find(o => o.id === object.oiv_id) : null;
            oivNameCell.textContent = oiv ? oiv.name : 'Неизвестный орган';
            row.appendChild(oivNameCell);
            
            // Ячейка с данными ОИВ
            const oivCell = document.createElement('td');
            oivCell.style.textAlign = 'center';
            oivCell.innerHTML = param.hasOIVData ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(oivCell);
            
            // Ячейка с данными ИИ
            const aiCell = document.createElement('td');
            aiCell.style.textAlign = 'center';
            aiCell.innerHTML = param.hasAIData ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(aiCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        container.appendChild(table);
    });
}

function createIndicatorsTable(data, container, selectedThemes = [], selectedOIVs = []) {
    if (!indicatorsData || indicatorsData.length === 0) {
        container.innerHTML = '<p>Нет данных о показателях</p>';
        return;
    }

    // Получаем уникальные темы из показателей
    let themes = [...new Set(indicatorsData.map(ind => ind.theme))];
    
    // Если выбраны темы, фильтруем
    if (selectedThemes.length > 0) {
        themes = themes.filter(theme => selectedThemes.includes(theme));
    }
    
    // Фильтруем показатели по выбранным OIV
    let filteredIndicators = indicatorsData;
    if (selectedOIVs && selectedOIVs.length > 0) {
        filteredIndicators = indicatorsData.filter(ind => selectedOIVs.includes(ind.oiv_id));
    }
    
    themes.forEach(theme => {
        // Фильтруем показатели по текущей теме
        const themeIndicators = indicatorsData.filter(ind => ind.theme === theme);
        if (themeIndicators.length === 0) return;
        
        // Создаем заголовок темы
        const themeHeader = document.createElement('h3');
        themeHeader.textContent = `Тема: ${theme}`;
        themeHeader.style.color = '#4a6da7';
        container.appendChild(themeHeader);
        
        // Создаем таблицу
        const table = document.createElement('table');
        table.className = 'indicators-table';
        
        // Создаем заголовок таблицы
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Добавляем столбцы
        const nameHeader = document.createElement('th');
        nameHeader.textContent = 'Наименование показателя';
        headerRow.appendChild(nameHeader);
        
        const oivNameHeader = document.createElement('th');
        oivNameHeader.textContent = 'Орган власти';
        headerRow.appendChild(oivNameHeader);
        
        const oivHeader = document.createElement('th');
        oivHeader.textContent = 'Данные ОИВ';
        headerRow.appendChild(oivHeader);
        
        const aiHeader = document.createElement('th');
        aiHeader.textContent = 'Данные ИИ';
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
            
            // Ячейка с названием показателя
            const nameCell = document.createElement('td');
            nameCell.textContent = ind.indicator_name;
            row.appendChild(nameCell);
            
            // Ячейка с органом власти
            const oivNameCell = document.createElement('td');
            const oiv = data.oiv.find(o => o.id === ind.oiv_id);
            oivNameCell.textContent = oiv ? oiv.name : 'Неизвестный орган';
            row.appendChild(oivNameCell);
            
            // Ячейка с данными ОИВ
            const oivCell = document.createElement('td');
            oivCell.style.textAlign = 'center';
            oivCell.innerHTML = ind.hasOIVData ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(oivCell);
            
            // Ячейка с данными ИИ
            const aiCell = document.createElement('td');
            aiCell.style.textAlign = 'center';
            aiCell.innerHTML = ind.hasAIData ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(aiCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        container.appendChild(table);
    });
}

function highlightTableRows(tableSelector, theme, infoType) {
    // Находим все строки в таблице, исключая заголовки
    const rows = document.querySelectorAll(`${tableSelector} tbody tr`);
    
    // Находим родительскую таблицу и заголовок темы перед ней
    const table = document.querySelector(tableSelector);
    let tableTheme = '';
    if (table) {
        const prevElement = table.previousElementSibling;
        if (prevElement && prevElement.tagName === 'H3') {
            tableTheme = prevElement.textContent.replace('Тема: ', '').trim();
        }
    }
    
    // Если тема таблицы не совпадает с переданной, пропускаем
    if (tableTheme !== theme) return;
    
    rows.forEach(row => {
        // Проверяем тип данных в строке
        const oivCell = row.querySelector('td:nth-last-child(2)');
        const aiCell = row.querySelector('td:last-child');
        
        if (!oivCell || !aiCell) return;
        
        const hasOIVData = oivCell.innerHTML.includes('✓');
        const hasAIData = aiCell.innerHTML.includes('✓');
        
        let matches = false;
        
        if (infoType === 'all') {
            matches = true;
        } else if (infoType === 'oiv') {
            matches = hasOIVData;
        } else if (infoType === 'ai') {
            matches = hasAIData;
        } else if (infoType === 'both') {
            matches = hasOIVData && hasAIData;
        }
        
        // Добавляем или удаляем класс подсветки
        if (matches) {
            row.classList.add('highlight-row');
        } else {
            row.classList.remove('highlight-row');
        }
    });
}

function addExportButton(data) {
    const exportBtn = document.querySelector('.export-btn');
    if (!exportBtn) return;
    
    exportBtn.addEventListener('click', async () => {
        try {
            if (typeof XLSX === 'undefined') {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.sheetjs.com/xlsx-0.19.3/package/dist/xlsx.full.min.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }
            
            console.log('Exporting data:', data);
            if (!data || !data.edges) {
                throw new Error('Нет данных для экспорта');
            }
            
            exportDashboardToExcel(data);
        } catch (error) {
            console.error('Export error:', error);
            alert(`Ошибка при экспорте: ${error.message}`);
        }
    });
}