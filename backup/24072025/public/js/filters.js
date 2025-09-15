document.addEventListener('DOMContentLoaded', function() {
    // Элементы фильтров
    const searchInput = document.getElementById('global-search');
    const filterForm = document.getElementById('filter-form');
    const resetFiltersBtn = document.getElementById('back-btn'); // Теперь это кнопка "Назад"
    
    // Контейнеры для фильтров
    const complexFiltersContainer = document.getElementById('complex-filters');
    const oivFiltersContainer = document.getElementById('oiv-filters');
    const themeFiltersContainer = document.getElementById('theme-filters');
    const strategyFiltersContainer = document.getElementById('strategy-filters');
    const programFiltersContainer = document.getElementById('program-filters');
    const projectFiltersContainer = document.getElementById('project-filters');
    
    let currentData = {};
    
    // Загрузка данных
    async function loadData() {
        const response = await fetch('./data/data.json');
        currentData = await response.json();
        initFilters(currentData);
    }
    
    // Инициализация фильтров
    function initFilters(data) {
        // Очищаем контейнеры
        complexFiltersContainer.innerHTML = '';
        oivFiltersContainer.innerHTML = '';
        themeFiltersContainer.innerHTML = '';
        strategyFiltersContainer.innerHTML = '';
        programFiltersContainer.innerHTML = '';
        projectFiltersContainer.innerHTML = '';
        
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
        
        // Фильтры по ОИВ (органам власти)
        const sortedOIV = [...data.oiv].sort((a, b) => a.name.localeCompare(b.name));
        sortedOIV.forEach(oiv => {
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
        data.strategies.forEach(strategy => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `strategy-${strategy.id}`;
            checkbox.name = 'strategies';
            checkbox.value = strategy.id;
            checkbox.dataset.type = 'strategy';
            
            const label = document.createElement('label');
            label.htmlFor = `strategy-${strategy.id}`;
            label.innerHTML = `
                <span class="filter-color" style="background-color: ${strategy.color};"></span>
                ${strategy.name}
            `;
            
            const div = document.createElement('div');
            div.className = 'filter-item';
            div.appendChild(checkbox);
            div.appendChild(label);
            
            strategyFiltersContainer.appendChild(div);
        });
        
        // Фильтры по программам
        data.programs.forEach(program => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `program-${program.id}`;
            checkbox.name = 'programs';
            checkbox.value = program.id;
            checkbox.dataset.type = 'program';
            
            const label = document.createElement('label');
            label.htmlFor = `program-${program.id}`;
            label.innerHTML = `
                <span class="filter-color" style="background-color: ${program.color};"></span>
                ${program.name}
            `;
            
            const div = document.createElement('div');
            div.className = 'filter-item';
            div.appendChild(checkbox);
            div.appendChild(label);
            
            programFiltersContainer.appendChild(div);
        });
        
        // Фильтры по проектам
        data.projects.forEach(project => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `project-${project.id}`;
            checkbox.name = 'projects';
            checkbox.value = project.id;
            checkbox.dataset.type = 'project';
            
            const label = document.createElement('label');
            label.htmlFor = `project-${project.id}`;
            label.innerHTML = `
                <span class="filter-color" style="background-color: ${project.color};"></span>
                ${project.name}
            `;
            
            const div = document.createElement('div');
            div.className = 'filter-item';
            div.appendChild(checkbox);
            div.appendChild(label);
            
            projectFiltersContainer.appendChild(div);
        });
        
        // Обработчики событий для фильтров
        document.querySelectorAll('.filter-item').forEach(item => {
            item.addEventListener('click', function(e) {
                if (e.target.tagName !== 'INPUT') {
                    const checkbox = this.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        dispatchFilterChange(checkbox);
                    }
                }
            });
        });
        
        document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', function(e) {
                e.stopPropagation();
                dispatchFilterChange(this);
                applyFilters(); // Применяем фильтры сразу при изменении
            });
        });
    }
    
    // Отправка события изменения фильтра
    function dispatchFilterChange(checkbox) {
        const event = new CustomEvent('filterChange', {
            detail: {
                type: checkbox.dataset.type,
                id: checkbox.value,
                checked: checkbox.checked
            }
        });
        document.dispatchEvent(event);
    }
    
    // Применение фильтров
    function applyFilters() {
        const formData = new FormData(filterForm);
        const filters = {
            complexes: formData.getAll('complexes'),
            oiv: formData.getAll('oiv'),
            themes: formData.getAll('themes'),
            strategies: formData.getAll('strategies'),
            programs: formData.getAll('programs'),
            projects: formData.getAll('projects')
        };
        
        // Фильтрация данных
        const filteredData = filterData(currentData, filters);
        
        // Обновляем все представления, включая 3D сцену
        updateViews(filteredData, filters);
        
        // Показываем кнопку "Назад", если есть выбранные фильтры
        const hasFilters = Object.values(filters).some(arr => arr.length > 0);
        resetFiltersBtn.style.display = hasFilters ? 'block' : 'none';
    }
    
    // Функция фильтрации данных
    function filterData(data, filters) {
        const filtered = JSON.parse(JSON.stringify(data));
        
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
        }
        
        // Фильтрация по темам
        if (filters.themes.length > 0) {
            filtered.edges = filtered.edges.filter(edge => 
                filters.themes.includes(edge.theme));
        }
        
        // Фильтрация по стратегиям
        if (filters.strategies.length > 0) {
            const strategyNames = filters.strategies.map(id => 
                data.strategies.find(s => s.id === id)?.name).filter(Boolean);
            
            filtered.oiv = filtered.oiv.filter(oiv => 
                oiv.strategies.some(strategy => strategyNames.includes(strategy)));
        }
        
        // Фильтрация по программам
        if (filters.programs.length > 0) {
            const programNames = filters.programs.map(id => 
                data.programs.find(p => p.id === id)?.name).filter(Boolean);
            
            filtered.oiv = filtered.oiv.filter(oiv => 
                oiv.programs.some(program => programNames.includes(program)));
        }
        
        // Фильтрация по проектам
        if (filters.projects.length > 0) {
            const projectNames = filters.projects.map(id => 
                data.projects.find(p => p.id === id)?.name).filter(Boolean);
            
            filtered.oiv = filtered.oiv.filter(oiv => 
                oiv.projects.some(project => projectNames.includes(project)));
        }
        
        return filtered;
    }
    
    // Обновление представлений
	function updateViews(data, filters) {
		if (window.update3DScene) {
			// Передаем как данные, так и фильтры
			window.update3DScene(data, filters);
		}
		if (window.updateTableView) {
			window.updateTableView(data);
		}
		if (window.updateDashboard) {
			window.updateDashboard(data);
		}
	}
    
    // Глобальный поиск
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        
        if (searchTerm.length < 2) {
            updateViews(currentData, {});
            return;
        }
        
        // Фильтрация данных
        const filteredData = filterDataBySearch(currentData, searchTerm);
        updateViews(filteredData, {});
    });
    
    // Функция фильтрации данных по поисковому запросу
    function filterDataBySearch(data, searchTerm) {
        if (!searchTerm) return data;
        
        const filtered = JSON.parse(JSON.stringify(data));
        
        // Фильтрация комплексов
        filtered.complexes = filtered.complexes.filter(complex => 
            complex.name.toLowerCase().includes(searchTerm));
        
        // Фильтрация ОИВ
        filtered.oiv = filtered.oiv.filter(oiv => 
            oiv.name.toLowerCase().includes(searchTerm));
        
        // Фильтрация тем
        filtered.edges = filtered.edges.filter(edge => 
            edge.theme.toLowerCase().includes(searchTerm) || 
            edge.label.toLowerCase().includes(searchTerm));
        
        // Фильтрация стратегий
        filtered.strategies = filtered.strategies.filter(strategy => 
            strategy.name.toLowerCase().includes(searchTerm));
        
        // Фильтрация программ
        filtered.programs = filtered.programs.filter(program => 
            program.name.toLowerCase().includes(searchTerm));
        
        // Фильтрация проектов
        filtered.projects = filtered.projects.filter(project => 
            project.name.toLowerCase().includes(searchTerm));
        
        return filtered;
    }
    
    // Обработчик кнопки "Назад"
    resetFiltersBtn.addEventListener('click', function() {
        filterForm.reset();
        applyFilters();
    });
    
    // Событие изменения размера окна
    window.addEventListener('resize', function() {
        if (window.onWindowResize) {
            window.onWindowResize();
        }
    });
    
    // Загрузка данных при старте
    loadData();
    
    // Экспорт функций для использования в других модулях
    window.applyFilters = applyFilters;
    window.filterData = filterData;
    window.updateViews = updateViews;
});