import express from 'express';
import pg from 'pg';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3001;

// Verificação de segurança para o Banco de Dados no Replit
if (!process.env.DATABASE_URL) {
  console.error("❌ ERRO: A variável DATABASE_URL não foi encontrada.");
  console.error("👉 DICA: No Replit, vá na aba 'PostgreSQL' (barra lateral esquerda) e clique em 'Provision/Set up Database'.");
}

// Database Connection - Otimizado para performance
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('replit') ? false : {
    rejectUnauthorized: false
  },
  // Aumenta o tempo que a conexão pode ficar ociosa antes de fechar (evita reconexões frequentes)
  idleTimeoutMillis: 60000, 
  // Aumenta o tempo limite de conexão inicial
  connectionTimeoutMillis: 10000,
  // Limite de conexões simultâneas
  max: 10
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- Mover arquivos estáticos para depois da API para evitar I/O desnecessário ---

// Initialize Tables and Seed Super Admin
const initDB = async () => {
  // Evita crashar o app se o banco não estiver configurado no Replit
  if (!process.env.DATABASE_URL) return;

  let client;
  try {
    client = await pool.connect();
    console.log('Initializing Database...');
    await client.query('BEGIN');

    // Create Tables
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
    `);

    // Create Performance Indexes (Crucial for Login Speed)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(lower(email));`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company);`);

    // Check if Super Admin exists
    const adminCheck = await client.query("SELECT * FROM users WHERE email = 'admin@ecom360.co'");
    
    if (adminCheck.rows.length === 0) {
        console.log('Seeding Super Admin...');
        const hashedPassword = await bcrypt.hash('Admin2026*', 10);
        
        await client.query(`
            INSERT INTO users (id, name, email, password, role, company, avatar)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, ['u1', 'Super Admin', 'admin@ecom360.co', hashedPassword, 'SUPER_ADMIN', 'Ecom360', '']);

        // Seed Demo Tasks
        await client.query(`
            INSERT INTO tasks (id, title, description, status, assignee, due_date, color, company)
            VALUES 
                ('t1', 'Revisar Roadmap Q4', 'Alinhar estratégias.', 'PENDING', 'Super Admin', '2024-11-15', '#0d9488', 'Ecom360'),
                ('t2', 'Entrevista Tech Lead', 'Avaliar candidatos.', 'IN_PROGRESS', 'Super Admin', '2024-10-30', '#f97316', 'Ecom360')
            ON CONFLICT (id) DO NOTHING;
        `);

        // Seed Demo Meetings
        await client.query(`
             INSERT INTO meetings (id, title, date, time, link, platform, company)
             VALUES ('m1', 'Weekly Sync', 'Oct 25, 2024', '10:00 AM', 'https://meet.google.com/abc', 'Google Meet', 'Ecom360')
             ON CONFLICT (id) DO NOTHING;
        `);
        console.log('Super Admin & Demo Data Created.');
    } else {
        console.log('Database ready.');
    }

    await client.query('COMMIT');
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Error initializing database:', err);
  } finally {
    if (client) client.release();
  }
};

initDB();

// --- API ROUTES ---

// LOGIN (With Bcrypt)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Timer Logs para Debug
  console.time('Login Total');
  
  try {
    console.time('DB Query');
    // Adicionado LIMIT 1 para performance
    const result = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1', [email]);
    console.timeEnd('DB Query');
    
    const user = result.rows[0];

    if (user) {
        console.time('Bcrypt Compare');
        const match = await bcrypt.compare(password, user.password);
        console.timeEnd('Bcrypt Compare');
        
        if (match) {
          // Don't send password back
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
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    console.timeEnd('Login Total');
  }
});

// USERS
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, company, avatar FROM users');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
  const { id, name, email, password, role, company, avatar } = req.body;
  try {
    // Hash password for new users
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (id, name, email, password, role, company, avatar) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
      [id, name, email, hashedPassword, role, company, avatar || '']
    );
    res.json({ message: 'User created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// TASKS
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, title, description, status, assignee, due_date as "dueDate", image, color, company FROM tasks ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tasks', async (req, res) => {
  const { id, title, description, status, assignee, dueDate, image, color, company } = req.body;
  try {
    await pool.query(
      `INSERT INTO tasks (id, title, description, status, assignee, due_date, image, color, company) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET 
       title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status, 
       assignee = EXCLUDED.assignee, due_date = EXCLUDED.due_date, image = EXCLUDED.image, color = EXCLUDED.color`,
      [id, title, description, status, assignee, dueDate, image, color, company]
    );
    res.json({ message: 'Task saved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// MEETINGS
app.get('/api/meetings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM meetings ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/meetings', async (req, res) => {
  const { id, title, date, time, link, platform, company } = req.body;
  try {
    await pool.query(
      'INSERT INTO meetings (id, title, date, time, link, platform, company) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, title, date, time, link, platform, company]
    );
    res.json({ message: 'Meeting created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Serve static files AFTER API routes to ensure API priority and speed
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Replit precisa ouvir em 0.0.0.0
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});