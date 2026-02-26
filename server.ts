import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Task, Column, User, Meeting } from './types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory storage (simulating PostgreSQL)
  let tasks: Task[] = [];
  let meetings: Meeting[] = [];
  let columns: Column[] = [
    { id: 'PENDING', title: 'Pendente', color: '#f59e0b' },
    { id: 'IN_PROGRESS', title: 'Em Curso', color: '#3b82f6' },
    { id: 'DONE', title: 'Concluído', color: '#10b981' }
  ];
  let users: User[] = [
    { 
      id: '1', 
      name: 'Admin', 
      email: 'admin@ecom360.co', 
      role: 'ADMIN', 
      company: 'Ecom360',
      password: 'Admin2026*' // In a real app, this would be hashed
    }
  ];

  // Auth Routes
  app.get('/api/users', (req, res) => {
    const requestingUserEmail = req.query.requestingUserEmail as string;
    
    // If no requesting user specified, return empty or public info (for safety in this demo context, returning all but filtered in frontend is less secure)
    // However, existing app logic might rely on getting all users for login/assignment.
    // Let's keep backward compatibility: if no param, return all (as it was).
    // If param provided, apply filter.
    
    let filteredUsers = users;

    if (requestingUserEmail) {
      const requester = users.find(u => u.email === requestingUserEmail);
      if (requester) {
        if (requester.role !== 'SUPER_ADMIN') {
          filteredUsers = users.filter(u => u.company === requester.company);
        }
      }
    }

    // Return users without passwords
    const safeUsers = filteredUsers.map(u => {
      const { password, ...userWithoutPass } = u as any;
      return userWithoutPass;
    });
    res.json(safeUsers);
  });

  app.post('/api/users', (req, res) => {
    const { name, email, password, company, role } = req.body;

    if (users.find(u => u.email === email)) {
      return res.status(400).json({ success: false, error: 'Email já cadastrado' });
    }

    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      role: role || 'COLLABORATOR',
      company,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    };

    // Store password (in memory only for demo)
    (newUser as any).password = password;

    users.push(newUser);

    const { password: _, ...userWithoutPass } = newUser as any;
    res.json(userWithoutPass);
  });

  app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && (u as any).password === password);
    
    if (user) {
      const { password, ...userWithoutPass } = user as any;
      res.json({ success: true, user: userWithoutPass });
    } else {
      res.status(401).json({ success: false, error: 'Credenciais inválidas' });
    }
  });

  app.post('/api/register', (req, res) => {
    const { name, email, password, company } = req.body;
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ success: false, error: 'Email já cadastrado' });
    }

    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      role: 'MANAGER',
      company,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    };
    
    // Store password (in memory only for demo)
    (newUser as any).password = password;
    
    users.push(newUser);
    
    const { password: _, ...userWithoutPass } = newUser as any;
    res.json({ success: true, user: userWithoutPass });
  });

  // API Routes
  app.get('/api/tasks', (req, res) => {
    res.json(tasks);
  });

  app.post('/api/tasks', (req, res) => {
    const newTask: Task = req.body;
    tasks.push(newTask);
    res.json(newTask);
  });

  app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const updatedTask: Task = req.body;
    console.log(`Updating task ${id}:`, updatedTask.title);
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      // Em produção com PostgreSQL:
      // await db.query('UPDATE tasks SET title = $1, description = $2, status = $3, due_date = $4, members = $5, tags = $6, checklist = $7 WHERE id = $8', 
      // [updatedTask.title, updatedTask.description, updatedTask.status, updatedTask.dueDate, JSON.stringify(updatedTask.members), JSON.stringify(updatedTask.tags), JSON.stringify(updatedTask.checklist), id]);
      
      const existingTask = tasks.find(t => t.id === id);
      if (existingTask) {
        Object.assign(existingTask, updatedTask);
      }
      res.json(updatedTask);
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  });

  app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      const deletedTask = tasks.splice(index, 1)[0];
      res.json(deletedTask);
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  });

  app.get('/api/columns', (req, res) => {
    res.json(columns);
  });

  app.post('/api/columns', (req, res) => {
    const newColumn: Column = req.body;
    columns.push(newColumn);
    res.json(newColumn);
  });

  app.get('/api/meetings', (req, res) => {
    res.json(meetings);
  });

  app.post('/api/meetings', (req, res) => {
    const newMeeting: Meeting = req.body;
    meetings.push(newMeeting);
    res.json(newMeeting);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
