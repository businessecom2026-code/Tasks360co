import express from 'express';
import pg from 'pg';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // --- DATABASE CONFIGURATION & FALLBACK ---

let pool = null;
let isUsingPostgres = false;

// Mock Data Stores (Fallback when no DB provided)
const mockUsers = [];
const mockTasks = [];
const mockMeetings = [];
const mockResets = {}; // { email: { token, expires_at } }

if (process.env.DATABASE_URL) {
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('replit') ? false : { rejectUnauthorized: false },
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  isUsingPostgres = true;
  console.log("✅ PostgreSQL Database URL found. Attempting connection...");
} else {
  console.log("⚠️  NO DATABASE_URL FOUND. Switching to IN-MEMORY mode.");
  console.log("👉 Data will be lost when server restarts.");
}

// --- HELPER FUNCTIONS (DB ABSTRACTION) ---

// Initialize DB (Create tables or Seed mock data)
const initDB = async () => {
  const adminEmail = 'admin@ecom360.co';
  const adminPass = 'Admin2026*';
  const hashedAdminPass = await bcrypt.hash(adminPass, 10);

  if (isUsingPostgres && pool) {
    let client;
    try {
      client = await pool.connect();
      console.log('Initializing PostgreSQL Tables...');
      await client.query('BEGIN');

      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL,
          company TEXT NOT NULL,
          avatar TEXT
        );
        CREATE TABLE IF NOT EXISTS tasks (
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
        CREATE TABLE IF NOT EXISTS meetings (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          date TEXT,
          time TEXT,
          participants TEXT[],
          link TEXT,
          platform TEXT,
          company TEXT
        );
        CREATE TABLE IF NOT EXISTS password_resets (
          email TEXT PRIMARY KEY,
          token TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL
        );
      `);

      // Seed Admin if not exists, OR update password if exists
      const res = await client.query("SELECT * FROM users WHERE email = $1", [adminEmail]);
      if (res.rows.length === 0) {
        await client.query(`
            INSERT INTO users (id, name, email, password, role, company, avatar)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, ['u1', 'Super Admin', adminEmail, hashedAdminPass, 'SUPER_ADMIN', 'Ecom360', '']);
        
        // Seed Demo Task
        await client.query(`
            INSERT INTO tasks (id, title, description, status, assignee, due_date, color, company)
            VALUES ('t1', 'Revisar Roadmap', 'Alinhar Q4.', 'PENDING', 'Super Admin', '2024-11-15', '#0d9488', 'Ecom360')
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log("✅ Admin user created.");
      } else {
        // Force update password to ensure login works
        await client.query("UPDATE users SET password = $1 WHERE email = $2", [hashedAdminPass, adminEmail]);
        console.log("✅ Admin password enforced/reset.");
      }
      
      await client.query('COMMIT');
      console.log("✅ Database Initialized.");
    } catch (err) {
      console.error("❌ Postgres Initialization Failed:", err);
      console.log("⚠️  Falling back to In-Memory mode due to connection error.");
      isUsingPostgres = false; 
      pool = null;
      // Re-run init to seed mock data
      await initDB();
    } finally {
      if (client) client.release();
    }
  } 
  
  if (!isUsingPostgres) {
    // Initialize Mock Data
    const adminUser = mockUsers.find(u => u.email === adminEmail);
    if (!adminUser) {
      mockUsers.push({
        id: 'u1',
        name: 'Super Admin',
        email: adminEmail,
        password: hashedAdminPass,
        role: 'SUPER_ADMIN',
        company: 'Ecom360',
        avatar: ''
      });
      mockTasks.push({
        id: 't1',
        title: 'Check In-Memory Mode',
        description: 'System is running in memory mode.',
        status: 'PENDING',
        assignee: 'Super Admin',
        dueDate: '2024-12-31',
        color: '#f97316',
        company: 'Ecom360'
      });
      console.log("✅ In-Memory Data Seeded (Super Admin created).");
    } else {
      adminUser.password = hashedAdminPass;
      console.log("✅ In-Memory Admin password reset.");
    }
  }
};

initDB();

// --- API ROUTES ---

// LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    let user;

    if (isUsingPostgres && pool) {
      const result = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1', [email]);
      user = result.rows[0];
    } else {
      user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    if (user) {
        const match = await bcrypt.compare(password, user.password);
        if (match) {
          const { password: _, ...userSafe } = user;
          res.json({ success: true, user: userSafe });
        } else {
          res.status(401).json({ success: false, error: 'Senha incorreta.' });
        }
    } else {
      res.status(401).json({ success: false, error: 'Usuário não encontrado.' });
    }
  } catch (err) {
    console.error(`Login Error:`, err);
    res.status(500).json({ success: false, error: 'Erro interno no servidor.' });
  }
});

// PASSWORD RESET
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  try {
    if (isUsingPostgres && pool) {
      await pool.query(`
        INSERT INTO password_resets (email, token, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO UPDATE 
        SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at
      `, [email, pin, expiresAt]);
    } else {
      mockResets[email] = { token: pin, expiresAt };
    }

      res.json({ success: true, message: 'Código enviado (verifique console).' });
  } catch(err) {
    res.status(500).json({ error: 'Erro no reset.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, pin, newPassword } = req.body;
  
  try {
    let valid = false;
    
    if (isUsingPostgres && pool) {
       const r = await pool.query('SELECT * FROM password_resets WHERE lower(email) = lower($1) AND token = $2', [email, pin]);
       if (r.rows.length > 0 && new Date() < new Date(r.rows[0].expires_at)) valid = true;
    } else {
       const resetData = mockResets[email];
       if (resetData && resetData.token === pin && new Date() < resetData.expiresAt) valid = true;
    }

    if (!valid) return res.status(400).json({ success: false, error: 'Token inválido ou expirado.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    
    if (isUsingPostgres && pool) {
      await pool.query('UPDATE users SET password = $1 WHERE lower(email) = lower($2)', [hashed, email]);
      await pool.query('DELETE FROM password_resets WHERE lower(email) = lower($1)', [email]);
    } else {
      const u = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (u) u.password = hashed;
      delete mockResets[email];
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar senha.' });
  }
});

// USERS CRUD
app.get('/api/users', async (req, res) => {
  if (isUsingPostgres && pool) {
    const r = await pool.query('SELECT id, name, email, role, company, avatar FROM users');
    res.json(r.rows);
  } else {
    res.json(mockUsers.map(({password, ...u}) => u));
  }
});

app.post('/api/users', async (req, res) => {
  const { id, name, email, password, role, company, avatar } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    
    if (isUsingPostgres && pool) {
      await pool.query(
        'INSERT INTO users (id, name, email, password, role, company, avatar) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [id, name, email, hashed, role, company, avatar || '']
      );
    } else {
      if (mockUsers.find(u => u.email === email)) return res.status(409).json({ error: 'Email já existe.' });
      mockUsers.push({ id, name, email, password: hashed, role, company, avatar });
    }
    res.json({ message: 'User created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  if (isUsingPostgres && pool) {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  } else {
    const idx = mockUsers.findIndex(u => u.id === req.params.id);
    if (idx !== -1) mockUsers.splice(idx, 1);
  }
  res.json({ message: 'Deleted' });
});

// TASKS CRUD
app.get('/api/tasks', async (req, res) => {
  if (isUsingPostgres && pool) {
    const r = await pool.query('SELECT id, title, description, status, assignee, due_date as "dueDate", image, color, company FROM tasks');
    res.json(r.rows);
  } else {
    res.json(mockTasks);
  }
});

app.post('/api/tasks', async (req, res) => {
  const task = req.body;
  if (isUsingPostgres && pool) {
    await pool.query(
      `INSERT INTO tasks (id, title, description, status, assignee, due_date, image, color, company) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET 
       title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status, 
       assignee = EXCLUDED.assignee, due_date = EXCLUDED.due_date, image = EXCLUDED.image, color = EXCLUDED.color`,
      [task.id, task.title, task.description, task.status, task.assignee, task.dueDate, task.image, task.color, task.company]
    );
  } else {
    const idx = mockTasks.findIndex(t => t.id === task.id);
    const existingTask = mockTasks.find(t => t.id === task.id);
    if (existingTask) {
      Object.assign(existingTask, task);
    }
    else mockTasks.push(task);
  }
  res.json({ message: 'Saved' });
});

app.delete('/api/tasks/:id', async (req, res) => {
  if (isUsingPostgres && pool) {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
  } else {
    const idx = mockTasks.findIndex(t => t.id === req.params.id);
    if (idx !== -1) mockTasks.splice(idx, 1);
  }
  res.json({ message: 'Deleted' });
});

// MEETINGS CRUD
app.get('/api/meetings', async (req, res) => {
  if (isUsingPostgres && pool) {
    const r = await pool.query('SELECT * FROM meetings ORDER BY id DESC');
    res.json(r.rows);
  } else {
    res.json(mockMeetings);
  }
});

app.post('/api/meetings', async (req, res) => {
  const m = req.body;
  if (isUsingPostgres && pool) {
    await pool.query(
      'INSERT INTO meetings (id, title, date, time, link, platform, company) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [m.id, m.title, m.date, m.time, m.link, m.platform, m.company]
    );
  } else {
    mockMeetings.unshift(m);
  }
  res.json({ message: 'Created' });
});

// USER REGISTRATION (ADMIN)
app.post('/api/admin/register-user', async (req, res) => {
  // Extrai os dados do corpo da requisição
  const { full_name, email, password, company, role } = req.body;

  // Validação básica dos dados recebidos
  if (!full_name || !email || !password || !company || !role) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    // Gera o hash da senha de forma segura
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Lógica de inserção no banco de dados
    if (isUsingPostgres && pool) {
      const query = `
        INSERT INTO users (full_name, email, password_hash, company_tenant, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id;
      `;
      // Usando parâmetros para evitar SQL Injection
      const result = await pool.query(query, [full_name, email, hashedPassword, company, role]);
      res.status(201).json({ success: true, userId: result.rows[0].id });
    } else {
      // Fallback para modo em memória (não recomendado para produção)
      const newUser = {
        id: `mock_${Date.now()}`,
        full_name,
        email,
        password_hash: hashedPassword,
        company_tenant: company,
        role
      };
      // Acesso seguro ao array mockUsers
      const existingUser = mockUsers.find(u => u.email === email);
      if (existingUser) {
        return res.status(409).json({ error: 'E-mail já cadastrado.' });
      }
      mockUsers.push(newUser);
      res.status(201).json({ success: true, userId: newUser.id });
    }
  } catch (err) {
    // Tratamento de erros, como e-mail duplicado no banco
    if (err.code === '23505') { // Código de erro do Postgres para violação de unicidade
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }
    console.error('Erro ao registrar usuário:', err);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// REVOLUT WEBHOOK
app.post('/api/webhooks/revolut', async (req, res) => {
  const event = req.body;
  
  // Em produção, você deve validar a assinatura do webhook enviada pelo Revolut
  // const signature = req.headers['revolut-signature'];
  
  try {
    // Validando se o pagamento foi concluído
    if (event.event === 'ORDER_COMPLETED' || event.status === 'COMPLETED') {
      // O email geralmente vem nos metadados do pedido ou nos dados do cliente
      const userEmail = event.customer?.email || event.metadata?.email;
      
      if (!userEmail) {
        return res.status(400).json({ error: 'Email do cliente não encontrado no payload do webhook.' });
      }

      const updatedData = {
        role: 'GESTOR',
        subscription_id: 'PRO_PLAN',
        welcome_message: 'Olá! Bem-vindo ao Task 360 PRO. Seu ambiente de gestão avançada está pronto. Aproveite o Kanban Ilimitado e a Integração com Google Calendar!'
      };

      if (isUsingPostgres && pool) {
        // Atualiza a role do usuário no banco de dados
        await pool.query('UPDATE users SET role = $1 WHERE lower(email) = lower($2)', ['GESTOR', userEmail]);
        // Nota: Para salvar o subscription_id, seria necessário adicionar essa coluna na tabela users
      } else {
        const u = mockUsers.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
        if (u) {
          u.role = 'GESTOR';
          u.subscription_id = 'PRO_PLAN';
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Webhook processado com sucesso.',
        user_update: updatedData
      });
    }

    // Retorna 200 para outros eventos para que o Revolut não fique reenviando
    res.status(200).json({ received: true, status: 'ignored' });
  } catch (err) {
    console.error('Erro no Webhook Revolut:', err);
    res.status(500).json({ error: 'Erro interno ao processar webhook.' });
  }
});

// Serve Frontend
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer();