-- Adicionar colunas para suporte a membros, etiquetas e checklist
-- Como estamos usando JSONB, podemos armazenar arrays de objetos ou strings diretamente.

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS members JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb;

-- Exemplo de inserção de dados:
-- UPDATE tasks SET members = '["user_id_1", "user_id_2"]' WHERE id = 'task_id';
-- UPDATE tasks SET tags = '["Urgente", "Design"]' WHERE id = 'task_id';
-- UPDATE tasks SET checklist = '[{"id": "1", "text": "Item 1", "isCompleted": false}]' WHERE id = 'task_id';
