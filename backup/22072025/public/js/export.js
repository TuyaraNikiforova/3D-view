document.addEventListener('DOMContentLoaded', function() {
    const exportBtn = document.getElementById('export-btn');
    
    exportBtn.addEventListener('click', function() {
        // Получаем текущие отфильтрованные данные
        const currentData = window.getCurrentTableData ? window.getCurrentTableData() : null;
        
        if (currentData) {
            // Отправка данных на сервер для экспорта
            fetch('/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: currentData })
            })
            .then(response => response.blob())
            .then(blob => {
                // Скачивание файла
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'government_data.xlsx';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            });
        }
    });
});