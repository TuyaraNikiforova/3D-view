document.addEventListener('DOMContentLoaded', async function() {
    // Глобальная переменная для хранения текущих фильтров между вкладками
    window.globalFilters = {
        complexes: [],
        oiv: [],
        themes: [],
        strategies: [],
        programs: [],
        projects: [],
        commonFilters: [],
        showOnlyConnections: false
    };

    // Обработка переключения вкладок
    const tabLinks = document.querySelectorAll('.tab-link');
    
    function setActiveTabFromURL() {
        const path = window.location.pathname;
        let activeTab = '3d-view';
        
        if (path.includes('/table-view')) {
            activeTab = 'table-view';
        } else if (path.includes('/dashboard')) {
            activeTab = 'dashboard';
        }
        
        // Удаляем активный класс у всех вкладок
        tabLinks.forEach(l => l.classList.remove('active'));
        
        // Добавляем активный класс текущей вкладке
        const activeLink = document.querySelector(`.tab-link[data-tab="${activeTab}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // Сохраняем текущие фильтры перед переключением
        saveCurrentFilters();
        
        // Инициализируем представление и применяем сохраненные фильтры
        if ((path === '/' || path === '/3d-view') && document.getElementById('canvas-container')) {
            // Загружаем модуль сцены динамически
            import('./threeScene.js').then(module => {
                module.init3DScene();
                
                // Применяем сохраненные фильтры после инициализации
                setTimeout(() => {
                    applySavedFilters();
                }, 1000);
            });
        } else if (path.includes('/table-view')) {
            // Применяем сохраненные фильтры после загрузки таблицы
            setTimeout(() => {
                applySavedFilters();
            }, 1000);
        }
    }
    
    // Сохранение текущих фильтров
    function saveCurrentFilters() {
        // Получаем текущие фильтры из активного представления
        let currentFilters = {};
        
        if (window.location.pathname.includes('/table-view') && window.getCurrentTableFilters) {
            // Для табличного представления
            currentFilters = window.getCurrentTableFilters();
        } else if (window.getCurrentFilters) {
            // Для 3D представления
            currentFilters = window.getCurrentFilters();
        }
        
        if (Object.keys(currentFilters).length > 0) {
            window.globalFilters = {...currentFilters};
            localStorage.setItem('savedFilters', JSON.stringify(window.globalFilters));
        }
    }
    
    // Применение сохраненных фильтров
    function applySavedFilters() {
        const savedFilters = localStorage.getItem('savedFilters');
        if (savedFilters) {
            window.globalFilters = JSON.parse(savedFilters);
            
            // Применяем фильтры в зависимости от текущего представления
            if (window.location.pathname.includes('/table-view')) {
                // Для табличного представления
                if (window.applyCascadeFilter) {
                    window.applyCascadeFilter(window.globalFilters);
                }
            } else {
                // Для 3D представления
                if (window.applyCascadeFilter) {
                    window.applyCascadeFilter(window.globalFilters);
                }
            }
        }
    }
    
    // Обработчик кликов по вкладкам
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.getAttribute('data-tab');
            
            // Сохраняем текущие фильтры перед переходом
            saveCurrentFilters();
            
            // Устанавливаем активную вкладку перед переходом
            tabLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Переходим на соответствующий URL
            if (tabId === 'table-view') {
                window.location.href = '/table-view';
            } else if (tabId === 'dashboard') {
                window.location.href = '/dashboard';
            } else {
                window.location.href = '/';
            }
        });
    });
    
    // Устанавливаем активную вкладку при загрузке
    setActiveTabFromURL();
    
    // Применяем фильтры при загрузке страницы
    window.addEventListener('load', function() {
        setTimeout(() => {
            applySavedFilters();
        }, 500);
    });
});

window.getCurrentTableFilters = function() {
    return {
        complexes: window.currentComplexFilter ? [window.currentComplexFilter] : [],
        oiv: [],
        themes: [],
        strategies: [],
        programs: [],
        projects: [],
        commonFilters: [],
        showOnlyConnections: false,
        // Добавляем фильтры столбцов
        columnFilters: {...window.currentColumnFilters}
    };
};