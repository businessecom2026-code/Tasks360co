import express from 'express';
import pg from 'pg';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Database Connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // Ensure enough connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased from 2000 to 10000 to prevent timeouts on slow networks
});

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images

// Serve static files from Vite build
app.use(express.static(path.join(__dirname, 'dist')));

// Initialize Tables and Seed Super Admin + Demo Data
const initDB = async () => {
  const client = await pool.connect();
  try {
    console.time('DB_INIT');
    await client.query('BEGIN');

    // Create Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        password TEXT,
        role TEXT,
        company TEXT,
        avatar TEXT
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        status TEXT,
        assignee TEXT,
        due_date TEXT,
        image TEXT,
        color TEXT,
        company TEXT
      );
      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        title TEXT,
        date TEXT,
        time TEXT,
        participants TEXT[],
        link TEXT,
        platform TEXT,
        company TEXT
      );
    `);

    // Create Indexes for Performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);
      CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company);
      CREATE INDEX IF NOT EXISTS idx_meetings_company ON meetings(company);
    `);

    // --- SECURITY CLEANUP & SEED ---
    console.log('Running Full Security Reset...');

    // 1. DELETE ALL USERS (Fresh Start)
    // TRUNCATE is faster than DELETE for full cleanup
    await client.query('TRUNCATE TABLE users CASCADE'); 
    console.log('All previous user profiles deleted (TRUNCATE).');
    
    // 2. Insert ONLY the Super Admin
    // This ensures only admin@ecom360.co exists for this company initially.
    await client.query(`
      INSERT INTO users (id, name, email, password, role, company, avatar)
      VALUES ('u1', 'Admin Master', 'admin@ecom360.co', 'Admin2026*', 'SUPER_ADMIN', 'Ecom360', '')
    `);

    // Seed Demo Tasks for Ecom360 context (so the admin dashboard is not empty)
    await client.query(`
      INSERT INTO tasks (id, title, description, status, assignee, due_date, color, company)
      VALUES 
        ('t1', 'Revisar Roadmap Q4', 'Alinhar estratégias de marketing e produto para o final do ano.', 'PENDING', 'Admin Master', '2024-11-15', '#0d9488', 'Ecom360'),
        ('t2', 'Entrevista Tech Lead', 'Avaliar candidatos para a vaga de liderança técnica.', 'IN_PROGRESS', 'Admin Master', '2024-10-30', '#f97316', 'Ecom360'),
        ('t3', 'Atualizar Landing Page', 'Implementar nova seção de IA no site principal.', 'DONE', 'Admin Master', '2024-10-20', '#3b82f6', 'Ecom360')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Seed Demo Meeting for Ecom360
    await client.query(`
      INSERT INTO meetings (id, title, date, time, link, platform, company)
      VALUES 
        ('m1', 'Weekly Sync Global', 'Oct 25, 2024', '10:00 AM', 'https://meet.google.com/abc-defg-hij', 'Google Meet', 'Ecom360')
      ON CONFLICT (id) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.timeEnd('DB_INIT');
    console.log('Database initialized. Only Super Admin exists.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error initializing database', err);
  } finally {
    client.release();
  }
};

// Run init asynchronously but don't block server start, however login might wait for table locks if heavy
initDB();

// --- API ROUTES ---

// LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const start = Date.now();
  console.log(`[LOGIN START] Email: ${email}`);
  
  try {
    // Simple query to find user by email
    const result = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
    const queryTime = Date.now() - start;
    console.log(`[LOGIN QUERY] Took ${queryTime}ms`);

    const user = result.rows[0];

    if (user) {
        // In production, use bcrypt.compare here. For this demo, simple string comparison.
        if (user.password === password) {
          console.log(`[LOGIN SUCCESS] User: ${user.email} (Total: ${Date.now() - start}ms)`);
          res.json({ success: true, user });
        } else {
          console.log(`[LOGIN FAIL] Password mismatch (Total: ${Date.now() - start}ms)`);
          res.status(401).json({ success: false, error: 'Senha incorreta.' });
        }
    } else {
      console.log(`[LOGIN FAIL] User not found (Total: ${Date.now() - start}ms)`);
      res.status(401).json({ success: false, error: 'Usuário não encontrado.' });
    }
  } catch (err) {
    console.error(`[LOGIN ERROR]`, err);
    res.status(500).json({ error: err.message });
  }
});

// USERS
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
  const { id, name, email, password, role, company, avatar } = req.body;
  try {
    await pool.query(
      'INSERT INTO users (id, name, email, password, role, company, avatar) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
      [id, name, email, password, role, company, avatar || '']
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
    // Map due_date back to dueDate for frontend
    const result = await pool.query('SELECT id, title, description, status, assignee, due_date as "dueDate", image, color, company FROM tasks');
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
    const result = await pool.query('SELECT * FROM meetings');
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

// Catch-all for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});