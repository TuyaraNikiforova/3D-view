// searchController.js
let searchData = null;
let searchSuggestions = [];

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('global-search');
    const searchResults = document.createElement('div');
    searchResults.id = 'search-results';
    searchResults.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ddd;
        border-top: none;
        max-height: 300px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    
    if (searchInput && searchInput.parentNode) {
        searchInput.parentNode.style.position = 'relative';
        searchInput.parentNode.appendChild(searchResults);
    }

    // Загрузка данных для поиска
    loadSearchData();

    // Обработчик ввода в поисковую строку
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.trim();
        
        if (searchTerm.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        if (!searchData) {
            console.error('Search data not loaded');
            return;
        }

        // Поиск по всем типам данных
        searchSuggestions = [
            // Комплексы
            ...searchData.complexes
                .filter(complex => complex.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(complex => ({
                    type: 'complex',
                    id: complex.id,
                    name: complex.name,
                    displayText: `Комплекс: ${complex.name}`,
                    color: complex.color
                })),
            
            // ОИВ
            ...searchData.oiv
                .filter(oiv => oiv.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(oiv => ({
                    type: 'oiv',
                    id: oiv.id,
                    name: oiv.name,
                    displayText: `ОИВ: ${oiv.name}`,
                    complex: oiv.complex
                })),
            
            // Темы
            ...searchData.themes
                .filter(theme => theme.id.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(theme => ({
                    type: 'theme',
                    id: theme.id,
                    name: theme.id,
                    displayText: `Тема: ${theme.id}`,
                    color: theme.color
                })),
            
            // Стратегии
            ...searchData.strategies
                .filter(strategy => strategy.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(strategy => ({
                    type: 'strategy',
                    id: strategy.name,
                    name: strategy.name,
                    displayText: `Стратегия: ${strategy.name}`
                })),
            
            // Программы
            ...searchData.programs
                .filter(program => program.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(program => ({
                    type: 'program',
                    id: program.name,
                    name: program.name,
                    displayText: `Программа: ${program.name}`
                }))
        ];

        displaySearchResults();
    });

    // Обработчик выбора результата
    searchResults.addEventListener('click', function(e) {
        const item = e.target.closest('.search-result-item');
        if (item) {
            const index = parseInt(item.dataset.index);
            const suggestion = searchSuggestions[index];
            
            if (suggestion) {
                applySearchFilter(suggestion);
                searchInput.value = '';
                searchResults.style.display = 'none';
            }
        }
    });

    // Скрытие результатов при клике вне области
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });

    // Обработчик клавиш
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            searchResults.style.display = 'none';
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            navigateSearchResults(e.key);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            selectFirstSearchResult();
        }
    });

    function displaySearchResults() {
        if (searchSuggestions.length === 0) {
            searchResults.innerHTML = '<div class="search-no-results">Ничего не найдено</div>';
            searchResults.style.display = 'block';
            return;
        }

        searchResults.innerHTML = searchSuggestions
            .map((suggestion, index) => {
                let icon = '';
                let colorStyle = '';
                
                switch(suggestion.type) {
                    case 'complex':
                        icon = '🏢';
                        colorStyle = `style="border-left: 4px solid ${suggestion.color}"`;
                        break;
                    case 'oiv':
                        icon = '🏛️';
                        break;
                    case 'theme':
                        icon = '🔗';
                        colorStyle = `style="border-left: 4px solid ${suggestion.color}"`;
                        break;
                    case 'strategy':
                        icon = '📋';
                        break;
                    case 'program':
                        icon = '📊';
                        break;
                }

                return `
                    <div class="search-result-item" data-index="${index}" ${colorStyle}>
                        <span class="search-icon">${icon}</span>
                        <span class="search-text">${suggestion.displayText}</span>
                    </div>
                `;
            })
            .join('');

        searchResults.style.display = 'block';
    }

    function navigateSearchResults(key) {
        const items = searchResults.querySelectorAll('.search-result-item');
        if (items.length === 0) return;

        let currentIndex = -1;
        items.forEach((item, index) => {
            if (item.classList.contains('selected')) {
                currentIndex = index;
                item.classList.remove('selected');
            }
        });

        if (key === 'ArrowDown') {
            currentIndex = (currentIndex + 1) % items.length;
        } else if (key === 'ArrowUp') {
            currentIndex = (currentIndex - 1 + items.length) % items.length;
        }

        items[currentIndex].classList.add('selected');
        items[currentIndex].scrollIntoView({ block: 'nearest' });
    }

    function selectFirstSearchResult() {
        const items = searchResults.querySelectorAll('.search-result-item');
        if (items.length > 0) {
            const firstItem = items[0];
            const index = parseInt(firstItem.dataset.index);
            const suggestion = searchSuggestions[index];
            
            if (suggestion) {
                applySearchFilter(suggestion);
                searchInput.value = '';
                searchResults.style.display = 'none';
            }
        }
    }

    function applySearchFilter(suggestion) {
        switch(suggestion.type) {
            case 'complex':
                if (window.updateSelectedComplexes) {
                    window.updateSelectedComplexes([suggestion.id]);
                }
                break;
            case 'oiv':
                if (window.selectOIV) {
                    window.selectOIV([suggestion.id]);
                }
                break;
            case 'theme':
                if (window.selectTheme) {
                    window.selectTheme([suggestion.id]);
                }
                break;
            case 'strategy':
                if (window.selectStrategy) {
                    window.selectStrategy([suggestion.name]);
                }
                break;
            case 'program':
                if (window.selectProgram) {
                    window.selectProgram([suggestion.name]);
                }
                break;
        }
    }

    async function loadSearchData() {
        try {
            const responses = await Promise.all([
                fetch('/data/data.json').then(res => res.json()),
                fetch('/data/strategies.json').then(res => res.json()),
                fetch('/data/programs.json').then(res => res.json())
            ]);
            
            searchData = {
                complexes: responses[0].complexes || [],
                oiv: responses[0].oiv || [],
                themes: responses[0].themes || [],
                strategies: responses[1] || [],
                programs: responses[2]?.filter(p => p.program_type === 0.0) || []
            };
        } catch (error) {
            console.error('Error loading search data:', error);
        }
    }
});