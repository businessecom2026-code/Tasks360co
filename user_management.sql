-- Script SQL para criação da tabela de usuários (PostgreSQL)

-- Apaga a tabela se ela já existir, para evitar conflitos
DROP TABLE IF EXISTS users CASCADE;

-- Cria a nova tabela de usuários com os campos solicitados
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL, -- Ex: 'SUPER_ADMIN', 'ADMIN', 'COLLABORATOR', 'CLIENT'
    company_tenant TEXT NOT NULL
);

-- Índices para otimizar as buscas
CREATE INDEX idx_users_email ON users(lower(email));
CREATE INDEX idx_users_company_tenant ON users(company_tenant);

-- Inserção do SUPER_ADMIN (sem senha, pois não foi solicitada no schema)
INSERT INTO users (id, full_name, email, role, company_tenant)
VALUES (
    'super_admin_01',
    'Super Admin',
    'admin@ecom360.co',
    'SUPER_ADMIN',
    'Ecom360'
);

-- Mensagem de sucesso
SELECT 'Tabela users criada e SUPER_ADMIN inserido com sucesso.' as status;
