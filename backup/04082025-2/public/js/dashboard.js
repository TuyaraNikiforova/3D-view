import { exportDashboardToExcel } from './export_dashboard.js';

let chartJsLoading = null;
let objectsData = [];

function loadChartJS() {
    if (chartJsLoading) {
        return chartJsLoading;
    }
    
    chartJsLoading = new Promise((resolve, reject) => {
        if (typeof Chart !== 'undefined') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = resolve;
        script.onerror = () => {
            console.error('Ошибка загрузки Chart.js');
            reject(new Error('Не удалось загрузить Chart.js'));
        };
        document.head.appendChild(script);
    });
    
    return chartJsLoading;
}

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
    Promise.all([
        fetch('/data/data.json').then(res => res.json()),
        fetch('/data/objects.json').then(res => res.json())
    ])
    .then(([data, objects]) => {
        objectsData = objects;
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

async function createDashboardLayout(data) {
    const container = document.querySelector('.dashboard-container');
    if (!container) {
        console.error('Контейнер дашборда не найден');
        return;
    }
    
    try {
        await loadChartJS();	
        // Очищаем контейнер
        container.innerHTML = '';
        
        // Проверяем, есть ли данные для отображения
        if (data.edges.length === 0 || data.oiv.length === 0) {
            showEmptyState();
            return;
        }
        
        // Создаем основную разметку с двумя колонками (правая колонка по умолчанию скрыта)
		container.innerHTML = `
			<div class="dashboard-layout">
				<div class="dashboard-header">
					<button class="export-btn">Экспорт в Excel</button>
					<button class="toggle-table-btn">Показать таблицу связей</button>
					<button class="toggle-objects-btn">Показать объекты управления</button>
				</div>
				<div class="dashboard-content">
					<div class="dashboard-left">
						<div class="chart-container"></div>
						<div class="objects-chart-container"></div>
					</div>
					<div class="dashboard-right collapsed">
						<div class="tables-container"></div>
					</div>
					<div class="objects-container collapsed">
						<div class="objects-table-container"></div>
					</div>
				</div>
			</div>
		`;

        
        // Добавляем стили
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
            .chart-container {
                width: 100%;
                height: 400px;
                margin-bottom: 20px;
                background-color: #f9f9f9;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 20px;
            }
			.objects-chart-container {
				background-color: #f9f9f9;
				border: 1px solid #ddd;
				border-radius: 4px;
				padding: 20px;
			}
			.export-btn, .toggle-table-btn {
				padding: 12px 24px;
				background-color: #4a6da7;
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
			.export-btn:hover, .toggle-table-btn:hover {
				background-color: #3a5a8f;
				transform: translateY(-2px);
				box-shadow: 0 4px 8px rgba(0,0,0,0.15);
			}	

			.export-btn:active, .toggle-table-btn:active {
				transform: translateY(0);
				box-shadow: 0 2px 3px rgba(0,0,0,0.1);
			}			
			.export-btn::before {
				content: "📊 ";
				margin-right: 8px;
			}
			.toggle-table-btn::before {
				content: "⇄ ";
				margin-right: 8px;
			}			
            .oiv-selector {
                margin-bottom: 20px;
                padding: 10px;
                width: 100%;
                max-width: 400px;
                font-size: 14px;
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
			.toggle-objects-btn {
				padding: 12px 24px;
				background-color: #6da74a;
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
			.toggle-objects-btn:hover {
				background-color: #5a8f3a;
				transform: translateY(-2px);
				box-shadow: 0 4px 8px rgba(0,0,0,0.15);
			}
			.toggle-objects-btn::before {
				content: "📋 ";
				margin-right: 8px;
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
				background-color: #6da74a;
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
        `;
        document.head.appendChild(style);
        
        try {
            // Получаем контейнеры
            const chartContainer = container.querySelector('.chart-container');
            const objectsChartContainer = container.querySelector('.objects-chart-container');
            const tablesContainer = container.querySelector('.tables-container');
			const toggleObjectsBtn = container.querySelector('.toggle-objects-btn');
			const objectsPanel = container.querySelector('.objects-container');			
            
            // Создаем графики
            createBarChart(data, chartContainer);
            const updateObjectsChart = createObjectsChart(data, objectsChartContainer);	
            
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
					createObjectsTable(data, objectsTableContainer);
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

async function createBarChart(data, container) {
    if (!container) {
        console.error('Контейнер для графика не найден');
        return;
    }

    try {
        // Ждем загрузку Chart.js
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
        
        // Создаем селектор и контейнер для графика
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
        
        const chartDiv = document.createElement('div');
        chartDiv.style.width = '100%';
        chartDiv.style.height = '350px';
        chartDiv.style.position = 'relative';
        container.appendChild(chartDiv);
        
        const chartCanvas = document.createElement('canvas');
        chartCanvas.id = 'dashboardChart';
        chartDiv.appendChild(chartCanvas);

        // Функция обновления графика и таблиц
        const updateChartAndTables = (selectedOIV = 'all') => {
            const ctx = chartCanvas.getContext('2d');
            
            // Проверяем, существует ли chart и есть ли у него метод destroy
            if (window.dashboardChart && typeof window.dashboardChart.destroy === 'function') {
                window.dashboardChart.destroy();
            }
            
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

            // Обновляем таблицы, если панель раскрыта
            const rightPanel = document.querySelector('.dashboard-right');
            if (rightPanel && !rightPanel.classList.contains('collapsed')) {
                const tablesContainer = document.querySelector('.tables-container');
                if (tablesContainer) {
                    tablesContainer.innerHTML = '';
                    createTargetTables(data, tablesContainer);
                }
            }
            
            // Обновляем второй график, если функция определена
            if (window.updateObjectsChart && typeof window.updateObjectsChart === 'function') {
                window.updateObjectsChart(selectedOIV);
            }
        };

        // Инициализация
        updateChartAndTables();
        
        // Обработчик изменения селектора
        select.addEventListener('change', (e) => {
            updateChartAndTables(e.target.value);
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
    const updateChart = (selectedOIV = 'all') => {
        const ctx = chartCanvas.getContext('2d');
        
        // Проверяем, существует ли chart и есть ли у него метод destroy
        if (window.objectsChart && typeof window.objectsChart.destroy === 'function') {
            window.objectsChart.destroy();
        }
        
        const chartData = {
            labels: themes,
            datasets: [
                {
                    label: 'Все объекты управления',
                    data: themes.map(theme => {
                        return objectsData.filter(obj => 
                            obj.theme === theme && 
                            (selectedOIV === 'all' || obj.oiv_id === selectedOIV)
                        ).length;
                    }),
                    backgroundColor: '#4a6da7',
                    borderColor: '#3a5a8f',
                    borderWidth: 1
                },
                {
                    label: 'Объекты управления ОИВ',
                    data: themes.map(theme => {
                        return objectsData.filter(obj => 
                            obj.theme === theme && 
                            obj.info_type === 1 &&
                            (selectedOIV === 'all' || obj.oiv_id === selectedOIV)
                        ).length;
                    }),
                    backgroundColor: '#6da74a',
                    borderColor: '#5a8f3a',
                    borderWidth: 1
                },
                {
                    label: 'О ИИ (info_type=2)',
                    data: themes.map(theme => {
                        return objectsData.filter(obj => 
                            obj.theme === theme && 
                            obj.info_type === 2 &&
                            (selectedOIV === 'all' || obj.oiv_id === selectedOIV)
                        ).length;
                    }),
                    backgroundColor: '#a76d4a',
                    borderColor: '#8f5a3a',
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
                            color: '#333' // Темный цвет для легенды
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Количество объектов',
                            color: '#333' // Темный цвет для заголовка оси Y
                        },
                        ticks: {
                            color: '#666' // Серый цвет для меток оси Y
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)' // Светлые линии сетки
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Темы',
                            color: '#333' // Темный цвет для заголовка оси X
                        },
                        ticks: {
                            color: '#666' // Серый цвет для меток оси X
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)' // Светлые линии сетки
                        }
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

function createTargetTables(data, container) {
    // Получаем уникальные темы
    const themes = [...new Set(data.edges.map(edge => edge.theme))];
    
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
    
    // Получаем выбранный OIV из селектора в диаграмме
    const oivSelector = document.querySelector('.oiv-selector');
    const selectedOIV = oivSelector ? oivSelector.value : 'all';
    
    themes.forEach(theme => {
        // Фильтруем связи по выбранной теме
        let themeEdges = data.edges.filter(edge => edge.theme === theme);
        
        // Если есть выбранный OIV в селекторе (не "all"), фильтруем по нему
        if (selectedOIV !== 'all') {
            themeEdges = themeEdges.filter(edge => edge.source === selectedOIV);
        }
        // Иначе, если есть выбранные источники в фильтрах, фильтруем по ним
        else if (selectedSourceOIVs.length > 0) {
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

function createObjectsTable(data, container) {
    if (!objectsData || objectsData.length === 0) {
        container.innerHTML = '<p>Нет данных об объектах управления</p>';
        return;
    }

    // Получаем уникальные темы из объектов управления
    const themes = [...new Set(objectsData.map(obj => obj.theme))];
    
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
        
        // Создаем заголовок таблицы
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Добавляем столбцы
        const nameHeader = document.createElement('th');
        nameHeader.textContent = 'Наименование объекта управления';
        headerRow.appendChild(nameHeader);
        
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
        
        // Получаем уникальные объекты по названию (может потребоваться доработка)
        const uniqueObjects = [...new Set(themeObjects.map(obj => obj.name))];
        
        uniqueObjects.forEach(objName => {
            const row = document.createElement('tr');
            
            // Ячейка с названием объекта
            const nameCell = document.createElement('td');
            nameCell.textContent = objName;
            row.appendChild(nameCell);
            
            // Проверяем наличие в данных ОИВ (info_type == 1)
            const hasOIVData = themeObjects.some(obj => 
                obj.name === objName && obj.info_type === 1
            );
            
            const oivCell = document.createElement('td');
            oivCell.style.textAlign = 'center';
            oivCell.innerHTML = hasOIVData ? '<span class="checkmark">✓</span>' : '';
            row.appendChild(oivCell);
            
            // Проверяем наличие в данных ИИ (info_type == 2)
            const hasAIData = themeObjects.some(obj => 
                obj.name === objName && obj.info_type === 2
            );
            
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

function addExportButton(data) {
    const exportBtn = document.querySelector('.export-btn');
    if (!exportBtn) return;
    
    exportBtn.addEventListener('click', async () => {
        try {
            // Проверяем загрузку XLSX
            if (typeof XLSX === 'undefined') {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
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


