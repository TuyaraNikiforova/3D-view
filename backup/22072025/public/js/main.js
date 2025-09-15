document.addEventListener('DOMContentLoaded', async function() {
    // Обработка переключения вкладок
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    
    const defaultTab = document.querySelector('.tab-link[data-tab="3d-view"]');
    if (defaultTab) {
        defaultTab.classList.add('active');
    }
    
    const defaultContent = document.getElementById('3d-view');
    if (defaultContent) {
        defaultContent.classList.add('active');
    }
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Удаляем активный класс у всех вкладок
            tabLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Добавляем активный класс текущей вкладке
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            
            // Если активирована 3D вкладка, инициализируем сцену
            if (tabId === '3d-view') {
                init3DScene();
            }
        });
    });
    
    // По умолчанию активируем 3D-view
    document.querySelector('.tab-link[data-tab="3d-view"]').classList.add('active');
    document.getElementById('3d-view').classList.add('active');
    
    // Инициализация 3D сцены
    async function init3DScene() {
        if (!window.sceneInitialized) {
            try {
                const { init3DScene } = await import('./threeScene.js');
                init3DScene();
                window.sceneInitialized = true;
                console.log('3D scene initialized successfully');
            } catch (err) {
                console.error('Error loading 3D scene:', err);
            }
        }
    }
    
    // Инициализируем сцену при загрузке
    await init3DScene();
});