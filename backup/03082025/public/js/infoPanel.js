// Конфигурация стилей
const DETAILS_STYLE = `
.info-panel {
    position: absolute;
    top: 130px;
    left: 20px;
    width: 300px;
    background: rgba(30, 30, 40, 0.9);
    border-radius: 8px;
    padding: 15px;
    color: #e0e0e0;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    z-index: 100;
}

.info-panel-header {
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.info-panel-title {
    font-weight: bold;
    font-size: 16px;
    color: #4a6da7;
}

.info-panel-content {
    max-height: 70vh;
    overflow-y: auto;
}

.info-panel-section {
    margin-bottom: 15px;
}

.info-panel-section-title {
    font-weight: bold;
    margin-bottom: 8px;
    color: #fff;
}

.info-panel-stat-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    font-size: 13px;
}

.info-panel-stat-table td {
    padding: 6px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.info-panel-stat-table td:last-child {
    text-align: right;
    font-weight: bold;
    color: #4a6da7;
}

.info-panel-content::-webkit-scrollbar {
    width: 6px;
}

.info-panel-content::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
}

.info-panel-content::-webkit-scrollbar-thumb {
    background: rgba(74, 109, 167, 0.5);
    border-radius: 3px;
}

.info-panel-content::-webkit-scrollbar-thumb:hover {
    background: rgba(74, 109, 167, 0.7);
}
.tab-content:not(#3d-view):not(#dashboard) .info-panel {
    display: none !important;
}

/* Стили для кнопки "Детализировать" */
.details-btn {
    width: 100%;
    margin-top: 15px;
    padding: 8px 16px;
    background-color: #4a6da7;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.3s ease;
    text-align: center;
}

.details-btn:hover {
    background-color: #3a5a8f;
}

.details-btn:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
    opacity: 0.7;
}
`;

const detailsStyleElement = document.createElement('style');
detailsStyleElement.textContent = DETAILS_STYLE;
document.head.appendChild(detailsStyleElement);

let currentData = {
    complexes: [],
    oiv: [],
    edges: [],
    themes: [],
    strategies: [],
    programs: [],
    objects: [],
    parameters: [],
    indicators: []
};
let currentFilters = {};
let infoPanel = null;

async function loadAllData() {
    try {
        const responses = await Promise.all([
            fetch('/data/data.json').then(res => res.json()),
            fetch('/data/strategies.json').then(res => res.json()),
            fetch('/data/programs.json').then(res => res.json())
        //    fetch('/data/objects.json').then(res => res.json()),
        //    fetch('/data/parameters.json').then(res => res.json()),
        //    fetch('/data/indicators.json').then(res => res.json())
        ]);
        
        currentData = {
            complexes: responses[0].complexes || [],
            oiv: responses[0].oiv || [],
            edges: responses[0].edges || [],
            themes: responses[0].themes || [],
            strategies: responses[1] || [],
            programs: responses[2].filter(p => p.program_type === 0.0) || [] // Фильтруем только program_type: 0.0
        //    objects: responses[3] || [],
        //    parameters: responses[4] || [],
        //    indicators: responses[5] || []
        };
        
        return currentData;
    } catch (error) {
        console.error('Error loading data:', error);
        return currentData;
    }
}

function initInfoPanel() {
    const oldPanel = document.querySelector('.info-panel');
    if (oldPanel) oldPanel.remove();

    // Проверяем активную вкладку
    const activeTab = document.querySelector('.tab-link.active')?.dataset.tab;
    if (activeTab !== '3d-view') return;

    infoPanel = document.createElement('div');
    infoPanel.className = 'info-panel';
    
    infoPanel.innerHTML = `
        <div class="info-panel-header">
            <div class="info-panel-title">Статистика</div>
        </div>
        <div class="info-panel-content" id="info-panel-content">
            <!-- Контент будет заполнен через updateInfoPanel -->
        </div>
    `;
    
    document.body.appendChild(infoPanel);
    updateInfoPanel({}); // Показываем общую статистику при инициализации
}

function updateInfoPanel(filters = {}) {
    if (!infoPanel) return;
    
    currentFilters = filters;
    const contentElement = infoPanel.querySelector('#info-panel-content');
    const scrollTop = contentElement.scrollTop;
    contentElement.innerHTML = '';
    
    const summarySection = document.createElement('div');
    summarySection.className = 'info-panel-section';
    
    const title = document.createElement('div');
    title.className = 'info-panel-section-title';
    title.textContent = 'Статистика:';
    summarySection.appendChild(title);
    
    const stats = calculateStatistics(filters);
    
    const table = document.createElement('table');
    table.className = 'info-panel-stat-table';
    
    addStatRow(table, 'Комплексы', stats.complexes);
    addStatRow(table, 'Органы власти', stats.oiv);
    addStatRow(table, 'Темы', stats.themes);
    addStatRow(table, 'Связи', stats.edges);
    addStatRow(table, 'Стратегии', stats.strategies);
    addStatRow(table, 'Гос. программы', stats.programs);
    
    summarySection.appendChild(table);
    
    // Добавляем кнопку "Детализировать"
	if (stats.themes > 0 || stats.oiv > 0) {
		const detailsBtn = document.createElement('button');
		detailsBtn.className = 'details-btn';
		detailsBtn.textContent = 'Детализировать';
		detailsBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			// Сохраняем фильтры в localStorage
			localStorage.setItem('dashboardFilters', JSON.stringify({
				...filters,
				// Добавляем oivIds для source и target отдельно
				sourceOivIds: filters.oiv?.map(o => o.id) || filters.oivIds || [],
				targetOivIds: [], // Можно заполнить, если нужно
				// Сохраняем edges для детализации
				edges: filters.edges || []
			}));
			// Находим и кликаем на вкладку "Детализация"
			const dashboardTab = document.querySelector('.tab-link[data-tab="dashboard"]');
			if (dashboardTab) {
				dashboardTab.click();
			}
		});
		summarySection.appendChild(detailsBtn);
	}
    
    contentElement.appendChild(summarySection);
    contentElement.scrollTop = scrollTop;
}

function addStatRow(table, label, value) {
    const row = document.createElement('tr');
    const labelCell = document.createElement('td');
    const valueCell = document.createElement('td');
    
    labelCell.textContent = label;
    valueCell.textContent = value;
    
    row.appendChild(labelCell);
    row.appendChild(valueCell);
    table.appendChild(row);
}

function calculateStatistics(filters) {
    const stats = {
        complexes: 0,
        oiv: 0,
        themes: 0,
        edges: 0,
        strategies: 0,
        programs: 0,
        objects: 0,
        parameters: 0,
        indicators: 0
    };

    if (!currentData) return stats;
    // Если переданы фильтры по программам
    if (filters?.programs?.length > 0) {
        const oivWithPrograms = currentData.oiv.filter(oiv => 
            oiv.programs && oiv.programs.some(program => 
                filters.programs.includes(program)
            )
        );
        const oivIds = oivWithPrograms.map(oiv => oiv.id);
        const relatedEdges = currentData.edges.filter(edge => 
            oivIds.includes(edge.source) || oivIds.includes(edge.target)
        );
        const uniqueComplexes = new Set();
        const uniqueThemes = new Set();
        const uniqueStrategies = new Set();

        oivWithPrograms.forEach(oiv => {
            uniqueComplexes.add(oiv.complex);
            if (oiv.strategies) {
                oiv.strategies.forEach(s => uniqueStrategies.add(s));
            }
        });

        relatedEdges.forEach(edge => {
            uniqueThemes.add(edge.theme);
        });

        stats.complexes = uniqueComplexes.size;
        stats.oiv = oivWithPrograms.length;
        stats.themes = uniqueThemes.size;
        stats.edges = relatedEdges.length;
        stats.strategies = uniqueStrategies.size;
        stats.programs = filters.programs.length;

        return stats;
    }

    // Если переданы конкретные ID связей
    if (filters?.edges?.length > 0) {
        const selectedEdges = currentData.edges.filter(edge => filters.edges.includes(edge.id));
        const uniqueComplexes = new Set();
        const uniqueOIV = new Set();
        const uniqueThemes = new Set();
        const uniqueStrategies = new Set();

        selectedEdges.forEach(edge => {
            uniqueThemes.add(edge.theme);

            const sourceOIV = currentData.oiv.find(oiv => oiv.id === edge.source);
            const targetOIV = currentData.oiv.find(oiv => oiv.id === edge.target);

            if (sourceOIV) {
                uniqueOIV.add(sourceOIV.id);
                uniqueComplexes.add(sourceOIV.complex);
                if (sourceOIV.strategies) {
                    sourceOIV.strategies.forEach(s => uniqueStrategies.add(s));
                }
            }

            if (targetOIV) {
                uniqueOIV.add(targetOIV.id);
                uniqueComplexes.add(targetOIV.complex);
                if (targetOIV.strategies) {
                    targetOIV.strategies.forEach(s => uniqueStrategies.add(s));
                }
            }
        });

        stats.complexes = uniqueComplexes.size;
        stats.oiv = uniqueOIV.size;
        stats.themes = uniqueThemes.size;
        stats.edges = selectedEdges.length;
        stats.strategies = uniqueStrategies.size;

        return stats;
    }

    // Если переданы фильтры по OIV
    if ((filters?.oiv?.length > 0) || (filters?.oivIds?.length > 0)) {
        // Получаем ID выбранных OIV
        const oivIds = filters.oiv?.map(o => o.id) || filters.oivIds || [];
        
        // Находим все связанные OIV (прямые и непрямые связи)
        const allRelatedOIV = new Set(oivIds);
        const queue = [...oivIds];
        const processedEdges = new Set();
        const relatedEdges = [];
        const uniqueThemes = new Set();
        const uniqueStrategies = new Set();

        // Обходим граф в ширину, чтобы найти все связанные OIV
        while (queue.length > 0) {
            const currentOIV = queue.shift();
            
            // Находим все связи для текущего OIV
            currentData.edges.forEach(edge => {
                if (processedEdges.has(edge.id)) return;
                
                const isSource = edge.source === currentOIV;
                const isTarget = edge.target === currentOIV;
                
                if (isSource || isTarget) {
                    relatedEdges.push(edge);
                    processedEdges.add(edge.id);
                    uniqueThemes.add(edge.theme);
                    
                    const relatedOIV = isSource ? edge.target : edge.source;
                    if (!allRelatedOIV.has(relatedOIV)) {
                        allRelatedOIV.add(relatedOIV);
                        queue.push(relatedOIV);
                    }
                }
            });
        }

        // Находим все уникальные комплексы и стратегии
        const uniqueComplexes = new Set();
        Array.from(allRelatedOIV).forEach(oivId => {
            const oiv = currentData.oiv.find(o => o.id === oivId);
            if (oiv) {
                uniqueComplexes.add(oiv.complex);
                if (oiv.strategies) {
                    oiv.strategies.forEach(s => uniqueStrategies.add(s));
                }
            }
        });

        stats.complexes = uniqueComplexes.size;
        stats.oiv = allRelatedOIV.size;
        stats.themes = uniqueThemes.size;
        stats.edges = relatedEdges.length;
        stats.strategies = uniqueStrategies.size;

        return stats;
    }

    // Если переданы фильтры по комплексам
    if (filters?.complexes?.length > 0) {
        const complexOIV = currentData.oiv.filter(oiv => filters.complexes.includes(oiv.complex));
        const oivIds = complexOIV.map(oiv => oiv.id);
        const relatedEdges = currentData.edges.filter(edge => 
            oivIds.includes(edge.source) || oivIds.includes(edge.target)
        );
        const allRelatedOIV = new Set(oivIds);
        const allRelatedComplexes = new Set(filters.complexes);
        const uniqueThemes = new Set();
        const uniqueStrategies = new Set();

        relatedEdges.forEach(edge => {
            allRelatedOIV.add(edge.source);
            allRelatedOIV.add(edge.target);
            uniqueThemes.add(edge.theme);
        });

        Array.from(allRelatedOIV).forEach(oivId => {
            const oiv = currentData.oiv.find(o => o.id === oivId);
            if (oiv) {
                allRelatedComplexes.add(oiv.complex);
                if (oiv.strategies) {
                    oiv.strategies.forEach(s => uniqueStrategies.add(s));
                }
            }
        });

        stats.complexes = allRelatedComplexes.size;
        stats.oiv = allRelatedOIV.size;
        stats.themes = uniqueThemes.size;
        stats.edges = relatedEdges.length;
        stats.strategies = uniqueStrategies.size;

        return stats;
    }
	

    // Если переданы фильтры по темам
    if (filters?.themes?.length > 0) {
        const themeEdges = currentData.edges.filter(edge => filters.themes.includes(edge.theme));
        const uniqueComplexes = new Set();
        const uniqueOIV = new Set();
        const uniqueStrategies = new Set();

        themeEdges.forEach(edge => {
            const sourceOIV = currentData.oiv.find(oiv => oiv.id === edge.source);
            const targetOIV = currentData.oiv.find(oiv => oiv.id === edge.target);

            if (sourceOIV) {
                uniqueOIV.add(sourceOIV.id);
                uniqueComplexes.add(sourceOIV.complex);
                if (sourceOIV.strategies) {
                    sourceOIV.strategies.forEach(s => uniqueStrategies.add(s));
                }
            }

            if (targetOIV) {
                uniqueOIV.add(targetOIV.id);
                uniqueComplexes.add(targetOIV.complex);
                if (targetOIV.strategies) {
                    targetOIV.strategies.forEach(s => uniqueStrategies.add(s));
                }
            }
        });

        stats.complexes = uniqueComplexes.size;
        stats.oiv = uniqueOIV.size;
        stats.themes = filters.themes.length;
        stats.edges = themeEdges.length;
        stats.strategies = uniqueStrategies.size;

        return stats;
    }
	

    // Если переданы фильтры по стратегиям
    if (filters?.strategies?.length > 0) {
        const oivWithStrategies = currentData.oiv.filter(oiv => 
            oiv.strategies && oiv.strategies.some(s => filters.strategies.includes(s))
        );
        const oivIds = oivWithStrategies.map(oiv => oiv.id);
        const relatedEdges = currentData.edges.filter(edge => 
            oivIds.includes(edge.source) || oivIds.includes(edge.target)
        );
        const uniqueComplexes = new Set();
        const uniqueThemes = new Set();

        oivWithStrategies.forEach(oiv => {
            uniqueComplexes.add(oiv.complex);
        });

        relatedEdges.forEach(edge => {
            uniqueThemes.add(edge.theme);
        });

        stats.complexes = uniqueComplexes.size;
        stats.oiv = oivWithStrategies.length;
        stats.themes = uniqueThemes.size;
        stats.edges = relatedEdges.length;
        stats.strategies = filters.strategies.length;

        return stats;
    }

    // Если фильтров нет, показываем общую статистику
    stats.complexes = currentData.complexes.length;
    stats.oiv = currentData.oiv.length;
    stats.themes = currentData.themes.length;
    stats.edges = currentData.edges.length;
    stats.strategies = currentData.strategies.length;
    stats.programs = currentData.programs?.length || 0;
    stats.objects = currentData.objects?.length || 0;
    stats.parameters = currentData.parameters?.length || 0;
    stats.indicators = currentData.indicators?.length || 0;

    return stats;
}

function updateViews(data, filters) {
    if (window.update3DScene) window.update3DScene(data, filters);
    if (window.updateTableView) window.updateTableView(data);
    if (window.updateDashboard) window.updateDashboard(data);
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    
    // Инициализируем панель при загрузке
    initInfoPanel();
    
    // Добавляем обработчик изменения вкладок
    document.querySelectorAll('.tab-link').forEach(tab => {
        tab.addEventListener('click', () => {
            // Даем время для переключения активного класса
            setTimeout(() => {
                initInfoPanel();
            }, 50);
        });
    });
    
    document.addEventListener('filterChange', (e) => {
        updateInfoPanel(window.currentFilters);
    });
    
    window.addEventListener('applyFilters', () => {
        updateInfoPanel(window.currentFilters);
    });
});

export function updateInfoPanelData(data, filters) {
    // Обновляем только те данные, которые пришли
    if (data.complexes) currentData.complexes = data.complexes;
    if (data.oiv) currentData.oiv = data.oiv;
    if (data.edges) currentData.edges = data.edges;
    if (data.themes) currentData.themes = data.themes;
    if (data.strategies) currentData.strategies = data.strategies;
    if (data.programs) currentData.programs = data.programs;
    if (data.objects) currentData.objects = data.objects;
    if (data.parameters) currentData.parameters = data.parameters;
    if (data.indicators) currentData.indicators = data.indicators;
    
    currentFilters = filters || {};
    updateInfoPanel(currentFilters);
}