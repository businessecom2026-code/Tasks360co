// Arquivo com exemplo de método de busca seguro (.find())

/**
 * Função segura para encontrar um objeto em um array pelo ID.
 * Substitui o acesso direto e inseguro por colchetes (ex: tasks[index]).
 *
 * @param {Array<Object>} array - O array a ser pesquisado.
 * @param {string} id - O ID do objeto a ser encontrado.
 * @returns {Object|undefined} - O objeto encontrado ou undefined se não existir.
 */
function findById(array, id) {
    // .find() retorna o objeto diretamente ou undefined, evitando erros de índice.
    const item = array.find(element => element && typeof element.id !== 'undefined' && element.id === id);
    
    if (!item) {
        console.warn(`Segurança: Objeto com ID '${id}' não foi encontrado.`);
    }
    
    return item;
}

// Exemplo de uso:
// let tasks = [{ id: 'task1', title: 'Tarefa Um' }];
// const task = findById(tasks, 'task1');
// if (task) {
//     console.log(task.title); // Acesso seguro
// }

// const nonExistentTask = findById(tasks, 'task2');
// console.log(nonExistentTask); // Retorna undefined, sem erro
