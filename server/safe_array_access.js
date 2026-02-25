// Arquivo com exemplos de métodos de busca seguros

/**
 * Função segura para encontrar e atualizar um objeto em um array.
 * Substitui o acesso direto e inseguro por colchetes (ex: array[index]).
 *
 * @param {Array<Object>} array - O array a ser modificado.
 * @param {string} id - O ID do objeto a ser atualizado.
 * @param {Object} updates - As atualizações a serem aplicadas.
 * @returns {Object|null} - O objeto atualizado ou null se não for encontrado.
 */
function findAndUpdate(array, id, updates) {
    const itemIndex = array.findIndex(item => item && typeof item.id !== 'undefined' && item.id === id);

    // Valida se o índice é um número válido e se o objeto existe
    if (typeof itemIndex === 'number' && itemIndex >= 0 && array[itemIndex]) {
        const updatedItem = { ...array[itemIndex], ...updates };
        array[itemIndex] = updatedItem;
        return updatedItem;
    } else {
        console.warn(`Segurança: Objeto com ID '${id}' não encontrado para atualização.`);
        return null; // Retorna null para indicar que a operação falhou
    }
}

// Exemplo de uso:
// let mockTasks = [{ id: 'task1', title: 'Tarefa Inicial' }];
// findAndUpdate(mockTasks, 'task1', { title: 'Tarefa Atualizada' });
// findAndUpdate(mockTasks, 'task2', { title: 'Nova Tarefa' }); // Irá falhar com segurança
