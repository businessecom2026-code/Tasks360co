-- Script SQL (PostgreSQL) para Tabela de Usuários v5

DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- O hash da senha será gerado e inserido pelo backend
    role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'Admin da Empresa', 'Usuário')),
    company_tenant TEXT NOT NULL
);

CREATE INDEX idx_users_company_tenant_v5 ON users(company_tenant);

-- Inserção do SUPER_ADMIN sem senha hardcoded.
-- O backend deve criar este usuário no primeiro boot com uma senha segura.
INSERT INTO users (full_name, email, password_hash, role, company_tenant)
VALUES 
    ('Super Admin', 'admin@ecom360.co', 'A_SER_DEFINIDO_PELO_BACKEND', 'SUPER_ADMIN', 'ecom360_master_tenant');

SELECT 'Tabela users (v5) criada. Lembre-se de gerar o hash da senha do SUPER_ADMIN no backend.' as result;
