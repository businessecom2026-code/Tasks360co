// Exemplo de como o backend poderia ser ajustado

// Função de atualização segura para tasks
function updateTask(tasks, taskId, updatedTask) {
    // Valida se o índice é um número e se o objeto existe
    const index = tasks.findIndex(t => t.id === taskId);
    if (typeof index === 'number' && index >= 0 && tasks[index]) {
        tasks[index] = { ...tasks[index], ...updatedTask };
        return tasks[index];
    } else {
        throw new Error('Task não encontrada ou índice inválido.');
    }
}

// Exemplo de uso
// let tasks = [{ id: 't1', title: 'Task Antiga' }];
// updateTask(tasks, 't1', { title: 'Task Atualizada' });

// Rota de API para buscar usuários (respeitando o tenant)
app.get('/api/users', (req, res) => {
    const user = req.user; // Obtido do middleware de autenticação

    if (user.email === 'admin@ecom360.co') {
        // SUPER_ADMIN: busca todos os usuários
        db.query('SELECT * FROM users', (err, results) => {
            res.json(results.rows);
        });
    } else {
        // Outros admins: busca apenas usuários do mesmo company_tenant
        db.query('SELECT * FROM users WHERE company_tenant = $1', [user.company_tenant], (err, results) => {
            res.json(results.rows);
        });
    }
});
