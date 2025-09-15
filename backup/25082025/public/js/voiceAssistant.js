// voiceAssistant.js
class VoiceAssistant {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.commands = {
            'сбросить фильтры': () => this.resetFilters(),
            'показать все': () => this.resetFilters(),
            'очистить': () => this.resetFilters(),
            'комплекс': (name) => this.filterComplex(name),
            'орган власти': (name) => this.filterOIV(name),
            'тема': (name) => this.filterTheme(name),
            'стратегия': (name) => this.filterStrategy(name),
            'программа': (name) => this.filterProgram(name)
        };
        
        this.init();
    }

    init() {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            this.recognition.continuous = false;
            this.recognition.lang = 'ru-RU';
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                this.processCommand(transcript);
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.stopListening();
            };

            this.recognition.onend = () => {
                this.stopListening();
            };
        }
    }

    startListening() {
        if (!this.recognition) {
            alert('Голосовой ввод не поддерживается в вашем браузере');
            return;
        }

        if (!this.isListening) {
            try {
                this.isListening = true;
                this.updateButtonState(true);
                this.recognition.start();
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                this.stopListening();
            }
        }
    }

    stopListening() {
        this.isListening = false;
        this.updateButtonState(false);
        try {
            this.recognition.stop();
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
        }
    }

    updateButtonState(listening) {
        const button = document.getElementById('voice-assistant-btn');
        if (button) {
            if (listening) {
                button.classList.add('listening');
                button.title = 'Слушаю...';
            } else {
                button.classList.remove('listening');
                button.title = 'Голосовой помощник';
            }
        }
    }

    processCommand(transcript) {
        console.log('Распознанная команда:', transcript);

        // Проверяем команды на сброс
        if (transcript.includes('сбросить') || transcript.includes('очистить') || transcript.includes('показать все')) {
            this.resetFilters();
            return;
        }

        // Ищем соответствия в командах
        for (const [command, action] of Object.entries(this.commands)) {
            if (transcript.includes(command)) {
                const param = transcript.replace(command, '').trim();
                if (typeof action === 'function') {
                    action(param);
                }
                return;
            }
        }

        // Если команда не распознана
        this.showNotification('Команда не распознана. Попробуйте еще раз.');
    }

    resetFilters() {
        if (window.resetAllFilters) {
            window.resetAllFilters();
            this.showNotification('Фильтры сброшены');
        }
    }

    filterComplex(name) {
        if (window.updateSelectedComplexes && name) {
            // Здесь можно добавить логику для поиска ID комплекса по имени
            this.showNotification(`Поиск комплекса: ${name}`);
        }
    }

    filterOIV(name) {
        if (window.selectOIV && name) {
            this.showNotification(`Поиск органа власти: ${name}`);
        }
    }

    filterTheme(name) {
        if (window.selectTheme && name) {
            this.showNotification(`Поиск темы: ${name}`);
        }
    }

    filterStrategy(name) {
        if (window.selectStrategy && name) {
            this.showNotification(`Поиск стратегии: ${name}`);
        }
    }

    filterProgram(name) {
        if (window.selectProgram && name) {
            this.showNotification(`Поиск программы: ${name}`);
        }
    }

    showNotification(message) {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Удаляем уведомление через 3 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Инициализация голосового помощника
let voiceAssistant = null;

document.addEventListener('DOMContentLoaded', function() {
    voiceAssistant = new VoiceAssistant();
});

// Глобальная функция для запуска голосового помощника
window.startVoiceAssistant = function() {
    if (voiceAssistant) {
        voiceAssistant.startListening();
    }
};