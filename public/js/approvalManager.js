// public/js/approvalManager.js
class ApprovalManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        await this.checkAuthStatus();
        this.setupEventListeners();
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/current-user');
            this.currentUser = await response.json();
            this.updateUI();
        } catch (error) {
            console.error('Ошибка проверки аутентификации:', error);
        }
    }

    async login(username, password) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentUser = result.user;
                this.updateUI();
                return true;
            } else {
                alert('Ошибка входа: ' + result.error);
                return false;
            }
        } catch (error) {
            console.error('Ошибка входа:', error);
            return false;
        }
    }

    async logout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            this.currentUser = null;
            this.updateUI();
        } catch (error) {
            console.error('Ошибка выхода:', error);
        }
    }

    updateUI() {
        const authContainer = document.getElementById('user-auth');
        if (!authContainer) return;

        if (this.currentUser) {
            authContainer.innerHTML = `
                <div class="user-info">
                    <span>Вы вошли как: ${this.currentUser.name}</span>
                    <button id="logout-btn">Выйти</button>
                </div>
            `;
        } else {
            authContainer.innerHTML = `
                <div class="login-form">
                    <input type="text" id="username" placeholder="Логин">
                    <input type="password" id="password" placeholder="Пароль">
                    <button id="login-btn">Войти</button>
                </div>
            `;
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Обработчик входа
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', async () => {
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                await this.login(username, password);
            });
        }

        // Обработчик выхода
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    // Метод для получения статуса акцептации
    async getApprovalStatus(entity_type, entity_id) {
        if (!this.currentUser) return null;

        try {
            const response = await fetch(`/api/approvals/${entity_type}/${entity_id}`);
            return await response.json();
        } catch (error) {
            console.error('Ошибка получения статуса акцептации:', error);
            return null;
        }
    }

    // Метод для акцептации
    async approveEntity(entity_type, entity_id, status, comment = '') {
        if (!this.currentUser) {
            alert('Для акцептации необходимо войти в систему');
            return false;
        }

        try {
            const response = await fetch('/api/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entity_type, entity_id, status, comment })
            });

            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Ошибка акцептации:', error);
            return false;
        }
    }

    // Метод для создания интерфейса акцептации
    createApprovalInterface(entity_type, entity_id, currentStatus = null) {
        if (!this.currentUser) return '';

        const isApproved = currentStatus && currentStatus.status === 'approved';
        const isRejected = currentStatus && currentStatus.status === 'rejected';

        if (isApproved) {
            return `
                <div class="approval-status approved">
                    <span>✓ Акцептовано</span>
                    <div class="approval-details">
                        <small>${currentStatus.approved_by_name} • ${new Date(currentStatus.approved_at).toLocaleDateString()}</small>
                    </div>
                </div>
            `;
        }

        if (isRejected) {
            return `
                <div class="approval-status rejected">
                    <span>✗ Отклонено</span>
                    <div class="approval-details">
                        <small>Причина: ${currentStatus.comment}</small>
                        <small>${currentStatus.approved_by_name} • ${new Date(currentStatus.approved_at).toLocaleDateString()}</small>
                    </div>
                </div>
            `;
        }

		return `
			<div class="approval-actions">
				<select class="approval-select" data-entity-type="${entity_type}" data-entity-id="${entity_id}">
					<option value="pending">Не обработано</option>
					<option value="approved">Акцептовать</option>
					<option value="rejected">Отклонить</option>
				</select>
				<div class="rejection-comment" style="display: none;">
					<textarea placeholder="Причина отклонения..." rows="2"></textarea>
				</div>
				<button class="save-approval" data-entity-type="${entity_type}" data-entity-id="${entity_id}">Сохранить</button>
			</div>
		`;
    }
}

// Создаем глобальный экземпляр
window.approvalManager = new ApprovalManager();