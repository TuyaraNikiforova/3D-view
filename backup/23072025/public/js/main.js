document.addEventListener('DOMContentLoaded', async function() {
    // Обработка переключения вкладок
    const tabLinks = document.querySelectorAll('.tab-link');
    
    // Устанавливаем активную вкладку на основе URL
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
        
        // Инициализируем 3D сцену только если это главная страница
        if ((path === '/' || path === '/3d-view') && document.getElementById('canvas-container')) {
            // Загружаем модуль сцены динамически
            import('./threeScene.js').then(module => {
                module.init3DScene();
            });
        }
    }
    
    // Обработчик кликов по вкладкам
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.getAttribute('data-tab');
            
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
	
	if (window.location.pathname.includes('/table-view')) {
		// Инициализация функционала таблицы
		document.addEventListener('DOMContentLoaded', function() {
			// Сортировка таблицы при клике на заголовки
			const table = document.getElementById('data-table');
			if (table) {
				const headers = table.querySelectorAll('th');
				headers.forEach((header, index) => {
					header.addEventListener('click', () => {
						sortTable(index);
					});
				});
			}
			
			function sortTable(columnIndex) {
				const table = document.getElementById('data-table');
				const tbody = table.querySelector('tbody');
				const rows = Array.from(tbody.querySelectorAll('tr'));
				
				rows.sort((a, b) => {
					const aText = a.cells[columnIndex].textContent;
					const bText = b.cells[columnIndex].textContent;
					
					// Попробуем сравнить как числа, если возможно
					const aNum = parseFloat(aText.replace(/[^\d.-]/g, ''));
					const bNum = parseFloat(bText.replace(/[^\d.-]/g, ''));
					
					if (!isNaN(aNum) && !isNaN(bNum)) {
						return aNum - bNum;
					}
					
					// Иначе сравниваем как строки
					return aText.localeCompare(bText);
				});
				
				// Удаляем существующие строки
				while (tbody.firstChild) {
					tbody.removeChild(tbody.firstChild);
				}
				
				// Добавляем отсортированные строки
				rows.forEach(row => tbody.appendChild(row));
			}
		});
	}	
});