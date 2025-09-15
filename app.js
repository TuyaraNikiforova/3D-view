// app.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const expressLayouts = require('express-ejs-layouts');

// Загрузка данных
const dataPath = path.join(__dirname, 'data/data.json');
const govData = require(dataPath);

// Настройки
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Маршруты
app.get('/', (req, res) => {
  res.render('index', { 
    title: '3D View',
    activeTab: '3d-view'
  });
});

app.get('/table-view', (req, res) => {
  res.render('table-view', { 
    title: 'Table View',
    activeTab: 'table-view',
    data: govData // Передаем данные в шаблон
  });
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard',
    activeTab: 'dashboard',
    data: govData
  });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
//app.listen(PORT, '0.0.0.0', () => {
//  console.log(`Server running on http://0.0.0.0:${PORT}`);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});