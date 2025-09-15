// public/js/search.js
export function initSearch(nodeMeshes, edgeArrows, complexSpheres, indicatorGroups, config) {
    const searchInput = document.getElementById('global-search');
    const searchResults = document.getElementById('search-results');
    
    if (!searchInput || !searchResults) return;
    
    searchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        const results = [];
        
        // Search through OIV (government bodies)
        config.oiv.forEach(oiv => {
            if (oiv.name.toLowerCase().includes(query)) {
                results.push({
                    type: 'ОИВ',
                    name: oiv.name,
                    id: oiv.id,
                    complex: oiv.complex
                });
            }
        });
        
        // Search through complexes
        config.complexes.forEach(complex => {
            if (complex.name.toLowerCase().includes(query)) {
                results.push({
                    type: 'Комплекс',
                    name: complex.name,
                    id: complex.id
                });
            }
        });
        
        // Search through themes
        Object.keys(config.themeColors).forEach(theme => {
            if (theme.toLowerCase().includes(query)) {
                results.push({
                    type: 'Тема',
                    name: theme,
                    id: theme
                });
            }
        });
        
        // Search through strategies
        config.strategies.forEach(strategy => {
            if (strategy.name.toLowerCase().includes(query)) {
                results.push({
                    type: 'Стратегия',
                    name: strategy.name,
                    id: strategy.id
                });
            }
        });
        
        // Search through programs
        config.programs.forEach(program => {
            if (program.name.toLowerCase().includes(query)) {
                results.push({
                    type: 'Госпрограмма',
                    name: program.name,
                    id: program.id
                });
            }
        });
        
        // Search through projects
        config.projects.forEach(project => {
            if (project.name.toLowerCase().includes(query)) {
                results.push({
                    type: 'Проект',
                    name: project.name,
                    id: project.id
                });
            }
        });
        
        // Display results
        if (results.length > 0) {
            searchResults.innerHTML = '';
            
            results.forEach(result => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                
                // Highlight matches
                const name = highlightMatch(result.name, query);
                
                item.innerHTML = `
                    <div>${name}</div>
                    <div class="search-result-type">${result.type}</div>
                `;
                
                item.addEventListener('click', () => {
                    handleSearchResultClick(result, nodeMeshes, edgeArrows, complexSpheres, indicatorGroups, config);
                    searchResults.style.display = 'none';
                    searchInput.value = result.name;
                });
                
                searchResults.appendChild(item);
            });
            
            searchResults.style.display = 'block';
        } else {
            searchResults.innerHTML = '<div class="search-result-item">Ничего не найдено</div>';
            searchResults.style.display = 'block';
        }
    });
    
    // Hide results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
    
    // Handle Enter key
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && searchResults.children.length > 0) {
            const firstResult = searchResults.children[0];
            if (firstResult) {
                const resultData = {
                    type: firstResult.querySelector('.search-result-type').textContent,
                    name: firstResult.querySelector('div:first-child').textContent.replace(/<\/?[^>]+(>|$)/g, ""),
                    id: firstResult.dataset.id
                };
                handleSearchResultClick(resultData, nodeMeshes, edgeArrows, complexSpheres, indicatorGroups, config);
                searchResults.style.display = 'none';
                searchInput.value = resultData.name;
            }
        }
    });
}

function highlightMatch(text, query) {
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    
    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);
    
    return `${before}<span class="highlight">${match}</span>${after}`;
}

function handleSearchResultClick(result, nodeMeshes, edgeArrows, complexSpheres, indicatorGroups, config) {
    // Используем глобальные функции из threeScene.js
    switch(result.type) {
        case 'ОИВ':
            window.selectOIV([result.id]);
            break;
            
        case 'Комплекс':
            window.updateSelectedComplexes([result.id]);
            break;
            
        case 'Тема':
            window.selectTheme([result.id]);
            break;
            
        case 'Стратегия':
            // Здесь нужно добавить соответствующую функцию в threeScene.js
            console.log('Selected strategy:', result.id);
            break;
            
        case 'Госпрограмма':
            // Здесь нужно добавить соответствующую функцию в threeScene.js
            console.log('Selected program:', result.id);
            break;
            
        case 'Проект':
            // Здесь нужно добавить соответствующую функцию в threeScene.js
            console.log('Selected project:', result.id);
            break;
    }
}