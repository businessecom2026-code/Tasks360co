import { Router } from 'express';
import pg from 'pg'; // Usando a biblioteca pg

// Configuração do Pool de Conexão com o PostgreSQL
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const router = Router();

// Middleware para simular autenticação e obter tenant_id
const getTenant = (req, res, next) => {
  // Em um app real, isso viria de um token JWT
  const userEmail = req.headers['x-user-email'] || 'admin@ecom360.co'; // Default para SUPER_ADMIN
  if (userEmail === 'admin@ecom360.co') {
    req.isSuperAdmin = true;
    req.tenantId = null; // SUPER_ADMIN não tem filtro de tenant
  } else {
    req.isSuperAdmin = false;
    req.tenantId = req.headers['x-tenant-id'] || 'default_tenant'; // Tenant do usuário logado
  }
  next();
};

// ROTA GET: Buscar usuários respeitando o tenant
router.get('/api/users', getTenant, async (req, res) => {
  try {
    let query = 'SELECT id, name, email, role, company_tenant, avatar FROM users';
    const params = [];
    
    if (!req.isSuperAdmin) {
      query += ' WHERE company_tenant = $1';
      params.push(req.tenantId);
    }
    
    const { rows } = await pool.query(query, params);
    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).send('Erro no servidor');
  }
});

// ROTA POST: Salvar novo usuário
router.post('/api/users', async (req, res) => {
  const { name, email, password, role, company_tenant } = req.body;
  // IMPORTANTE: Em produção, a senha deve ser hasheada com bcrypt
  // const salt = await bcrypt.genSalt(10);
  // const hashedPassword = await bcrypt.hash(password, salt);
  
  try {
    const query = `
      INSERT INTO users (id, name, email, password, role, company_tenant, avatar)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, '') RETURNING id, name, email, role, company_tenant, avatar;
    `;
    // Usando a senha provisória diretamente (apenas para este exemplo)
    const { rows } = await pool.query(query, [name, email, password, role, company_tenant]);
    res.status(201).json(rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao salvar usuário');
  }
});

export default router;
