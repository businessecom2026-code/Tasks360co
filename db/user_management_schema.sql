-- Script SQL (PostgreSQL) para a Tabela de Usuários

-- Ativa a extensão pgcrypto se não estiver ativa, para usar gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Remove a tabela existente para garantir uma recriação limpa
DROP TABLE IF EXISTS users CASCADE;

-- Criação da tabela `users`
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Em um ambiente real, este campo deve armazenar um hash
    role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO')),
    company_tenant TEXT NOT NULL,
    avatar TEXT
);

-- Índices para otimizar consultas
CREATE INDEX idx_users_on_email ON users(lower(email));
CREATE INDEX idx_users_on_company_tenant ON users(company_tenant);

-- Inserção do usuário SUPER_ADMIN
INSERT INTO users (name, email, password, role, company_tenant, avatar)
VALUES 
    ('Super Admin', 'admin@ecom360.co', 'senha_super_segura_hash', 'SUPER_ADMIN', 'Ecom360', '');

-- Confirmação de que o script foi executado
SELECT 'Tabela de usuários criada e SUPER_ADMIN inserido com sucesso.' as status;
