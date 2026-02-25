-- Script SQL (PostgreSQL) para Tabela de Usuários v4

DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'Admin da Empresa')),
    tenant_id TEXT NOT NULL -- Coluna para separação de dados
);

CREATE INDEX idx_users_tenant_id_v4 ON users(tenant_id);

INSERT INTO users (full_name, email, password_hash, role, tenant_id)
VALUES 
    ('Super Admin', 'admin@ecom360.co', 'hash_placeholder', 'SUPER_ADMIN', 'ecom360_master_tenant');

SELECT 'Tabela users (v4) criada com sucesso.' as result;
