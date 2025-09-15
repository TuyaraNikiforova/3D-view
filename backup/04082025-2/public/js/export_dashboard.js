export function exportDashboardToExcel(data, fileName = 'dashboard_export') {
    // Проверяем снова после попытки загрузки
    if (typeof XLSX === 'undefined') {
        console.error('Библиотека XLSX не загружена');
        alert('Для экспорта в Excel необходимо подключение к интернету. Пожалуйста, проверьте соединение и попробуйте снова.');
        return;
    }
    
    if (!data || !data.edges || !data.oiv) {
        console.error('Некорректные данные для экспорта');
        return;
    }

    // Создаем новую рабочую книгу Excel
    const wb = XLSX.utils.book_new();

    // 1. Лист с обобщенной статистикой по темам и OIV
    createSummarySheet(wb, data);

    // 2. Лист с детализацией всех связей
    createDetailsSheet(wb, data);

    // 3. Лист со списком всех OIV
    createOIVListSheet(wb, data);

    // 4. Лист с объектами управления (если есть данные)
    if (window.objectsData && window.objectsData.length > 0) {
        createObjectsSheet(wb, window.objectsData);
    }

    // Генерируем имя файла с текущей датой
    const exportFileName = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Сохраняем файл
    XLSX.writeFile(wb, exportFileName);
}

function createSummarySheet(wb, data) {
    // Группируем данные по темам и source OIV
    const themes = [...new Set(data.edges.map(edge => edge.theme))];
    const sourceOIVs = [...new Set(data.edges.map(edge => edge.source))];
    
    // Создаем матрицу для данных
    const summaryData = [
        ['Тема / Орган власти', ...sourceOIVs.map(id => 
            data.oiv.find(oiv => oiv.id === id)?.name || id)]
    ];

    // Заполняем матрицу данными
    themes.forEach(theme => {
        const row = [theme];
        sourceOIVs.forEach(sourceId => {
            const count = data.edges.filter(edge => 
                edge.theme === theme && edge.source === sourceId
            ).length;
            row.push(count > 0 ? count : '');
        });
        summaryData.push(row);
    });

    // Добавляем итоговую строку
    const totalRow = ['ИТОГО'];
    sourceOIVs.forEach(sourceId => {
        const count = data.edges.filter(edge => edge.source === sourceId).length;
        totalRow.push(count > 0 ? count : '');
    });
    summaryData.push(totalRow);

    // Создаем рабочий лист
    const ws = XLSX.utils.aoa_to_sheet(summaryData);

    // Добавляем стили (по возможности)
    if (ws['!cols'] === undefined) ws['!cols'] = [];
    summaryData[0].forEach((_, i) => {
        ws['!cols'][i] = { width: i === 0 ? 30 : 20 };
    });

    // Добавляем лист в книгу
    XLSX.utils.book_append_sheet(wb, ws, 'Общая статистика');
}

function createDetailsSheet(wb, data) {
    const detailsData = [
        [
            '№ п/п',
            'Тема',
            'Источник (ОИВ)',
            'Цель (ОИВ)',
            'Наименование связи',
            'Комплекс источника',
            'Комплекс цели'
        ]
    ];

    let rowNumber = 1;
    data.edges.forEach(edge => {
        const sourceOIV = data.oiv.find(oiv => oiv.id === edge.source);
        const targetOIV = data.oiv.find(oiv => oiv.id === edge.target);

        detailsData.push([
            rowNumber++,
            edge.theme || '',
            sourceOIV?.name || edge.source,
            targetOIV?.name || edge.target,
            edge.label || edge.name || 'Без названия',
            sourceOIV?.complex || '',
            targetOIV?.complex || ''
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(detailsData);

    // Настраиваем ширину столбцов
    if (ws['!cols'] === undefined) ws['!cols'] = [];
    detailsData[0].forEach((_, i) => {
        ws['!cols'][i] = { 
            width: i === 0 ? 10 : i === 4 || i === 5 ? 40 : 20 
        };
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Детализация связей');
}

function createOIVListSheet(wb, data) {
    const oivData = [
        ['ID', 'Наименование', 'Комплекс', 'Стратегии', 'Программы']
    ];

    data.oiv.forEach(oiv => {
        oivData.push([
            oiv.id,
            oiv.name || '',
            oiv.complex || '',
            oiv.strategies ? oiv.strategies.join(', ') : '',
            oiv.programs ? oiv.programs.join(', ') : ''
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(oivData);

    // Настраиваем ширину столбцов
    if (ws['!cols'] === undefined) ws['!cols'] = [];
    oivData[0].forEach((_, i) => {
        ws['!cols'][i] = { width: i === 1 ? 40 : 20 };
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Список ОИВ');
}

function createObjectsSheet(wb, objectsData) {
    const objectsSheetData = [
        [
            '№ п/п',
            'Тема',
            'ОИВ',
            'Тип объекта',
            'Наименование объекта',
            'Описание'
        ]
    ];

    let rowNumber = 1;
    objectsData.forEach(obj => {
        objectsSheetData.push([
            rowNumber++,
            obj.theme || '',
            obj.oiv_id || '',
            obj.info_type === 1 ? 'ОИВ' : 'ИИ',
            obj.name || '',
            obj.description || ''
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(objectsSheetData);

    // Настраиваем ширину столбцов
    if (ws['!cols'] === undefined) ws['!cols'] = [];
    objectsSheetData[0].forEach((_, i) => {
        ws['!cols'][i] = { 
            width: i === 0 ? 10 : i === 4 || i === 5 ? 40 : 20 
        };
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Объекты управления');
}

export function initExportButton(data) {
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Экспорт в Excel';
    exportBtn.style.cssText = `
        padding: 10px 20px;
        background-color: #4a6da7;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: Arial, sans-serif;
        font-size: 14px;
        margin: 20px 0;
    `;
    
    exportBtn.addEventListener('click', () => {
        exportDashboardToExcel(data);
    });

    const container = document.querySelector('.dashboard-container');
    if (container) {
        container.insertBefore(exportBtn, container.firstChild);
    }
}