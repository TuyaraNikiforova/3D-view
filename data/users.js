const users = [
    {
        id: 1,
        username: 'admin',
        password: 'admin123', // В реальном приложении используйте хеширование!
        name: 'Администратор',
        role: 'admin',
        oiv_id: null // null для администратора - видит все
    },
    {
        id: 2,
        username: 'user1',
        password: 'user1123',
        name: 'Иванов И.И.',
        role: 'user',
        oiv_id: 'OIV001' // Привязан к конкретному ОИВ
    },
    {
        id: 3,
        username: 'user2',
        password: 'user2123',
        name: 'Петров П.П.',
        role: 'user',
        oiv_id: 'OIV002'
    }
];

module.exports = users;