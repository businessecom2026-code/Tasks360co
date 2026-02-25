-- Script de Inicialização Task 360.co
-- Rode este script no painel SQL do Railway para resetar o banco.

-- 1. Limpeza (Cuidado: Apaga tudo!)
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;

-- 2. Tabela de Usuários
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    company TEXT NOT NULL,
    avatar TEXT
);

-- 3. Tabela de Tarefas
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    assignee TEXT,
    due_date TEXT,
    image TEXT,
    color TEXT,
    company TEXT
);

-- 4. Tabela de Reuniões
CREATE TABLE meetings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT,
    time TEXT,
    participants TEXT[],
    link TEXT,
    platform TEXT,
    company TEXT
);

-- 5. Índices para Performance
CREATE INDEX idx_users_email ON users(lower(email));
CREATE INDEX idx_users_company ON users(company);
CREATE INDEX idx_tasks_company ON tasks(company);

-- 6. Inserir SUPER ADMIN
-- Senha: 'Admin2026*' (Hash válida gerada via bcrypt cost 10)
INSERT INTO users (id, name, email, password, role, company, avatar)
VALUES (
    'u1', 
    'Super Admin', 
    'admin@ecom360.co', 
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
    'SUPER_ADMIN', 
    'Ecom360', 
    ''
);
