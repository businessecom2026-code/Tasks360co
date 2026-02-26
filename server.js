  import express from 'express';
  import pg from 'pg';
  import cors from 'cors';
  import path from 'path';
  import { fileURLToPath } from 'url';
  import bcrypt from 'bcryptjs';
  import 'dotenv/config';

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  async function startServer() {
    const app = express();
    const port = process.env.PORT || 3000;

    app.use(cors());
    app.use(express.json({ limit: '50mb' }));

    // --- DATABASE CONFIGURATION ---
    let pool = null;
    let isUsingPostgres = false;

    const mockUsers = [];
    const mockTasks = [];
    const mockMeetings = [];
    const mockResets = {};

    if (process.env.DATABASE_URL) {
      pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('replit') ? false : { rejectUnauthorized: false },
      });
      isUsingPostgres = true;
      console.log("✅ Database URL found.");
    }

    // --- DB INIT ---
    const initDB = async () => {
      const adminEmail = 'admin@ecom360.co';
      const hashedAdminPass = await bcrypt.hash('Admin2026*', 10);

      if (isUsingPostgres && pool) {
        try {
          const client = await pool.connect();
          await client.query(`
            CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT, company TEXT, avatar TEXT);
            CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, title TEXT, description TEXT, status TEXT DEFAULT 'PENDING', assignee TEXT, due_date TEXT, image TEXT, color TEXT, company TEXT);
            CREATE TABLE IF NOT EXISTS meetings (id TEXT PRIMARY KEY, title TEXT, date TEXT, time TEXT, participants TEXT[], link TEXT, platform TEXT, company TEXT);
            CREATE TABLE IF NOT EXISTS password_resets (email TEXT PRIMARY KEY, token TEXT, expires_at TIMESTAMP);
          `);
          const res = await client.query("SELECT * FROM users WHERE email = $1", [adminEmail]);
          if (res.rows.length === 0) {
            await client.query("INSERT INTO users (id, name, email, password, role, company) VALUES ($1, $2, $3, $4, $5, $6)", 
            ['u1', 'Admin', adminEmail, hashedAdminPass, 'SUPER_ADMIN', 'Ecom360']);
          }
          client.release();
          console.log("✅ Database Initialized.");
        } catch (err) {
          console.error("❌ DB Error:", err);
        }
      }
    };

    await initDB();

    // --- API ROUTES (Login Simples para teste) ---
    app.post('/api/login', async (req, res) => {
      const { email, password } = req.body;
      try {
        let user;
        if (isUsingPostgres && pool) {
          const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
          user = result.rows[0];
        }
        if (user && await bcrypt.compare(password, user.password)) {
          res.json({ success: true, user });
        } else {
          res.status(401).json({ success: false, error: 'Credenciais inválidas' });
        }
      } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // --- SERVE STATIC FILES (A parte principal) ---
    app.use(express.static(path.join(__dirname, 'dist')));

    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });

    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  }

  startServer();