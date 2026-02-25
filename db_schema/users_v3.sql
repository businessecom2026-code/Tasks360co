-- Script SQL (PostgreSQL) para Tabela de Usuários v3

-- Garante que a tabela seja recriada do zero
DROP TABLE IF EXISTS users CASCADE;

-- Definição da tabela com os campos especificados
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Armazena o hash da senha
    role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'Admin da Empresa', 'Usuário')),
    company_tenant TEXT NOT NULL
);

-- Índices para performance de busca
CREATE INDEX idx_users_email_lower_v3 ON users(lower(email));
CREATE INDEX idx_users_company_tenant_v3 ON users(company_tenant);

-- Inserção do usuário SUPER_ADMIN
-- A senha 'admin123' deve ser hasheada pelo backend antes da inserção
INSERT INTO users (full_name, email, password_hash, role, company_tenant)
VALUES 
    ('Super Admin', 'admin@ecom360.co', 'hash_da_senha_aqui', 'SUPER_ADMIN', 'Ecom360');

-- Confirmação
SELECT 'Tabela users (v3) criada e populada com SUPER_ADMIN.' as result;
