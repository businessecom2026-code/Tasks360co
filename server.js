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
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images

// Serve static files from Vite build
app.use(express.static(path.join(__dirname, 'dist')));

// Initialize Tables and Seed Super Admin
const initDB = async () => {
  try {
    await pool.query(`
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

      -- Seed the Master Admin for Ecom360 (forced update on conflict to ensure password matches)
      INSERT INTO users (id, name, email, password, role, company, avatar)
      VALUES ('u1', 'Admin Master', 'admin@ecom360.co', 'Admin2026*', 'SUPER_ADMIN', 'Ecom360', '')
      ON CONFLICT (id) DO UPDATE SET
      password = EXCLUDED.password,
      role = EXCLUDED.role,
      company = EXCLUDED.company,
      email = EXCLUDED.email;
    `);
    console.log('Database tables initialized and Super Admin seeded/updated');
  } catch (err) {
    console.error('Error initializing database', err);
  }
};
initDB();

// --- API ROUTES ---

// LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Simple query to find user by email
    const result = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
    const user = result.rows[0];

    // In production, use bcrypt.compare here. For this demo, simple string comparison.
    if (user && user.password === password) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, error: 'Credenciais inválidas.' });
    }
  } catch (err) {
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