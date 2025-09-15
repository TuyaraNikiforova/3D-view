const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Загрузка данных
const dataPath = path.join(__dirname, '../data/data.json');
const rawData = fs.readFileSync(dataPath);
const govData = JSON.parse(rawData);

// Главная страница
router.get('/', (req, res) => {
  res.render('index', { 
    title: '3D Data Visualization',
    activeTab: '3d-view',
    styles: '' // Добавьте эту строку
  });
});

// Аналогично для других маршрутов
router.get('/table-view', (req, res) => {
  res.render('table-view', { 
    title: 'Table View',
    activeTab: 'table-view',
    styles: ''
  });
});

router.get('/dashboard', (req, res) => {
  res.render('index', {
    title: 'Dashboard',
    activeTab: 'dashboard',
    styles: '' // Добавьте эту строку
  });
});

// Фильтрация данных
router.post('/filter', (req, res) => {
  const filters = req.body.filters || {};
  let filteredData = JSON.parse(JSON.stringify(govData));
  
  // Применяем фильтры
  if (filters.departments) {
    filteredData.departments = filteredData.departments.filter(dept => 
      filters.departments.includes(dept.id));
  }
  
  // Другие фильтры...
  
  res.json(filteredData);
});

// Экспорт в XLSX
router.post('/export', (req, res) => {
  const filteredData = req.body.data;
  const ws = XLSX.utils.json_to_sheet(filteredData.departments);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Government Data");
  
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename=government_data.xlsx');
  res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

module.exports = router;