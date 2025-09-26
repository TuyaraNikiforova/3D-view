const approvals = {
    edges: [], // Акцептация связей
    objects: [], // Акцептация объектов
    parameters: [], // Акцептация параметров
    indicators: [] // Акцептация показателей
};

// Структура записи акцептации:
// {
//     id: 'unique_id',
//     entity_type: 'edge', // 'edge', 'object', 'parameter', 'indicator'
//     entity_id: 'original_id',
//     status: 'approved', // 'approved', 'rejected', 'pending'
//     comment: 'Комментарий при отклонении',
//     approved_by: 1, // user_id
//     approved_by_name: 'Иванов И.И.',
//     oiv_id: 'oiv1', // ОИВ акцептующего
//     approved_at: '2024-01-01T10:00:00Z'
// }

module.exports = approvals;