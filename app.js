// app.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const expressLayouts = require('express-ejs-layouts');

// Загрузка данных
const dataPath = path.join(__dirname, 'data/data.json');
const govData = require(dataPath);

const users = require('./data/users');
const approvals = require('./data/approvals');
const session = require('express-session');

// Настройки
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Настройка сессий ДО маршрутов
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // true для HTTPS
}));

// Middleware для проверки аутентификации
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Требуется аутентификация' });
    }
};

// Маршруты аутентификации
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        req.session.user = user;
        res.json({ success: true, user: { id: user.id, name: user.name, role: user.role, oiv_id: user.oiv_id } });
    } else {
        res.status(401).json({ success: false, error: 'Неверные учетные данные' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/current-user', (req, res) => {
    res.json(req.session.user || null);
});

// Маршруты для акцептации
app.post('/api/approve', requireAuth, (req, res) => {
    const { entity_type, entity_id, status, comment } = req.body;
    const user = req.session.user;
    
    // Логика сохранения акцептации
    const approval = {
        id: `${entity_type}_${entity_id}_${user.id}`,
        entity_type,
        entity_id,
        status,
        comment: status === 'rejected' ? comment : '',
        approved_by: user.id,
        approved_by_name: user.name,
        oiv_id: user.oiv_id,
        approved_at: new Date().toISOString()
    };
    
    // Сохраняем в соответствующем массиве
    approvals[entity_type + 's'].push(approval);
    
    res.json({ success: true, approval });
});

app.get('/api/approvals/:entity_type/:entity_id', (req, res) => {
    const { entity_type, entity_id } = req.params;
    const approval = approvals[entity_type + 's'].find(a => a.entity_id === entity_id);
    res.json(approval || null);
});

// Основные маршруты (ПОСЛЕ API маршрутов)
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});