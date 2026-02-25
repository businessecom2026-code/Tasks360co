-- Script SQL (PostgreSQL) para Tabela de Usuários v2

-- Garante que a tabela seja recriada do zero
DROP TABLE IF EXISTS users CASCADE;

-- Definição da tabela com os campos especificados
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO')),
    company_tenant TEXT NOT NULL
);

-- Índices para performance de busca
CREATE INDEX idx_users_email_lower ON users(lower(email));
CREATE INDEX idx_users_company_tenant ON users(company_tenant);

-- Inserção do usuário SUPER_ADMIN
INSERT INTO users (id, full_name, email, role, company_tenant)
VALUES 
    ('sa_001', 'Super Admin', 'admin@ecom360.co', 'SUPER_ADMIN', 'Ecom360');

-- Confirmação
SELECT 'Tabela users (v2) criada e populada com SUPER_ADMIN.' as result;
