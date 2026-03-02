/**
 * Mock Server — In-memory backend for preview/testing
 * Runs without PostgreSQL or Prisma. All data is in memory.
 *
 * Usage: node server.mock.js
 */
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = 3000;
const JWT_SECRET = 'mock-secret-task360';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ─── In-Memory Database ──────────────────────────────────

const db = {
  users: [],
  workspaces: [],
  memberships: [],
  tasks: [],
  meetings: [],
  subscriptions: [],
};

let idCounter = 1;
const genId = () => `mock-${idCounter++}`;

// ─── Seed Data ───────────────────────────────────────────

async function seed() {
  const adminPass = await bcrypt.hash('admin123', 10);
  const gestorPass = await bcrypt.hash('gestor123', 10);

  const admin = { id: genId(), name: 'Admin Task360', email: 'admin@ecom360.co', password: adminPass, role: 'SUPER_ADMIN', avatar: null, activeWorkspaceId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const gestor = { id: genId(), name: 'Maria Gestora', email: 'maria@empresa.com', password: gestorPass, role: 'GESTOR', avatar: null, activeWorkspaceId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const colab = { id: genId(), name: 'João Colaborador', email: 'joao@empresa.com', password: gestorPass, role: 'COLABORADOR', avatar: null, activeWorkspaceId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  db.users.push(admin, gestor, colab);

  const ws1 = { id: genId(), name: 'Ecom360', slug: 'ecom360', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const ws2 = { id: genId(), name: 'Projeto Alpha', slug: 'projeto-alpha', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  db.workspaces.push(ws1, ws2);

  admin.activeWorkspaceId = ws1.id;
  gestor.activeWorkspaceId = ws1.id;

  db.memberships.push(
    { id: genId(), userId: admin.id, workspaceId: ws1.id, roleInWorkspace: 'GESTOR', inviteAccepted: true, paymentStatus: 'PAID', costPerSeat: 0, invitedEmail: null, paidAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: genId(), userId: gestor.id, workspaceId: ws1.id, roleInWorkspace: 'GESTOR', inviteAccepted: true, paymentStatus: 'PAID', costPerSeat: 3.0, invitedEmail: null, paidAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: genId(), userId: colab.id, workspaceId: ws1.id, roleInWorkspace: 'COLABORADOR', inviteAccepted: true, paymentStatus: 'PAID', costPerSeat: 3.0, invitedEmail: null, paidAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: genId(), userId: admin.id, workspaceId: ws2.id, roleInWorkspace: 'GESTOR', inviteAccepted: true, paymentStatus: 'PAID', costPerSeat: 0, invitedEmail: null, paidAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  );

  db.subscriptions.push(
    { id: genId(), workspaceId: ws1.id, basePrice: 5.0, seatCount: 3, totalMonthlyValue: 11.0, autoRenew: true, status: 'ACTIVE', currentPeriodEnd: '2026-04-01T00:00:00Z', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: genId(), workspaceId: ws2.id, basePrice: 5.0, seatCount: 1, totalMonthlyValue: 5.0, autoRenew: true, status: 'ACTIVE', currentPeriodEnd: '2026-04-01T00:00:00Z', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  );

  const now = new Date();
  db.tasks.push(
    { id: genId(), title: 'Configurar pipeline CI/CD', description: 'Setup GitHub Actions para deploy automático', status: 'DONE', assigneeId: colab.id, workspaceId: ws1.id, dueDate: null, color: 'green', googleTaskId: null, lastSyncedAt: null, version: 1, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: genId(), title: 'Implementar Kanban drag-and-drop', description: 'Usar dnd-kit para arrastar cards entre colunas', status: 'IN_PROGRESS', assigneeId: gestor.id, workspaceId: ws1.id, dueDate: '2026-03-07T00:00:00Z', color: 'blue', googleTaskId: 'g-task-1', lastSyncedAt: now.toISOString(), version: 3, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: genId(), title: 'Integrar Google Tasks API', description: 'OAuth2 + sync bi-direcional', status: 'PENDING', assigneeId: admin.id, workspaceId: ws1.id, dueDate: '2026-03-10T00:00:00Z', color: 'purple', googleTaskId: null, lastSyncedAt: null, version: 1, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: genId(), title: 'Testar fluxo Revolut', description: 'Checkout session + webhook de pagamento', status: 'PENDING', assigneeId: null, workspaceId: ws1.id, dueDate: '2026-03-14T00:00:00Z', color: 'orange', googleTaskId: null, lastSyncedAt: null, version: 1, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: genId(), title: 'Criar landing page', description: 'Design responsivo com Tailwind', status: 'REVIEW', assigneeId: colab.id, workspaceId: ws1.id, dueDate: '2026-03-05T00:00:00Z', color: 'yellow', googleTaskId: null, lastSyncedAt: null, version: 2, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: genId(), title: 'Documentar API endpoints', description: 'Swagger/OpenAPI spec', status: 'PENDING', assigneeId: gestor.id, workspaceId: ws1.id, dueDate: null, color: 'red', googleTaskId: null, lastSyncedAt: null, version: 1, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: genId(), title: 'Setup monitoring (Sentry)', description: null, status: 'IN_PROGRESS', assigneeId: admin.id, workspaceId: ws1.id, dueDate: '2026-03-12T00:00:00Z', color: 'blue', googleTaskId: null, lastSyncedAt: null, version: 1, createdAt: now.toISOString(), updatedAt: now.toISOString() },
  );

  db.meetings.push(
    { id: genId(), title: 'Sprint Planning - Semana 10', date: '2026-03-03', time: '09:00', participants: ['Admin Task360', 'Maria Gestora', 'João Colaborador'], link: null, platform: 'Google Meet', workspaceId: ws1.id, recordingUrl: null, summary: null, suggestedTasks: null, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: genId(), title: 'Review de Arquitetura', date: '2026-03-05', time: '14:00', participants: ['Admin Task360', 'Maria Gestora'], link: null, platform: 'Google Meet', workspaceId: ws1.id, recordingUrl: null, summary: 'Discutida a migração para Prisma e a estrutura multi-tenant. Decidido usar Zustand para gerenciamento de workspace.', suggestedTasks: [{ title: 'Criar migration Prisma', deadline: '2026-03-06' }, { title: 'Testar tenant isolation', deadline: '2026-03-07' }], createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: genId(), title: 'Daily Standup', date: '2026-03-02', time: '09:30', participants: ['Admin Task360', 'João Colaborador'], link: null, platform: 'Zoom', workspaceId: ws1.id, recordingUrl: null, summary: null, suggestedTasks: null, createdAt: now.toISOString(), updatedAt: now.toISOString() },
  );

  console.log(`Seeded: ${db.users.length} users, ${db.workspaces.length} workspaces, ${db.tasks.length} tasks, ${db.meetings.length} meetings`);
}

// ─── Auth Helpers ────────────────────────────────────────

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch { return res.status(401).json({ error: 'Token inválido' }); }
}

function safeUser(u) {
  const { password, ...rest } = u;
  return rest;
}

// ─── Auth Routes ─────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find((u) => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  res.json({ token: generateToken(user), user: safeUser(user) });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (db.users.find((u) => u.email === email)) return res.status(409).json({ error: 'E-mail já cadastrado' });
  const user = { id: genId(), name, email, password: await bcrypt.hash(password, 10), role: 'COLABORADOR', avatar: null, activeWorkspaceId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  db.users.push(user);
  res.status(201).json({ token: generateToken(user), user: safeUser(user) });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(safeUser(user));
});

app.patch('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (req.body.name) user.name = req.body.name;
  if (req.body.activeWorkspaceId) user.activeWorkspaceId = req.body.activeWorkspaceId;
  user.updatedAt = new Date().toISOString();
  res.json(safeUser(user));
});

// ─── Workspace Routes ────────────────────────────────────

app.get('/api/workspaces', authMiddleware, (req, res) => {
  const memberships = db.memberships.filter((m) => m.userId === req.user.id);
  const workspaces = memberships.map((m) => {
    const ws = db.workspaces.find((w) => w.id === m.workspaceId);
    const memberCount = db.memberships.filter((x) => x.workspaceId === m.workspaceId).length;
    return { ...ws, membership: { ...m }, memberCount };
  });
  res.json(workspaces);
});

app.post('/api/workspaces', authMiddleware, (req, res) => {
  const { name } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
  const ws = { id: genId(), name, slug, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  db.workspaces.push(ws);
  const membership = { id: genId(), userId: req.user.id, workspaceId: ws.id, roleInWorkspace: 'GESTOR', inviteAccepted: true, paymentStatus: 'PAID', costPerSeat: 0, invitedEmail: null, paidAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  db.memberships.push(membership);
  db.subscriptions.push({ id: genId(), workspaceId: ws.id, basePrice: 5.0, seatCount: 1, totalMonthlyValue: 5.0, autoRenew: true, status: 'ACTIVE', currentPeriodEnd: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const user = db.users.find((u) => u.id === req.user.id);
  if (user) user.activeWorkspaceId = ws.id;
  res.status(201).json({ ...ws, membership, memberCount: 1 });
});

app.post('/api/workspaces/invite', authMiddleware, (req, res) => {
  const { workspaceId, email, roleInWorkspace } = req.body;
  const membership = { id: genId(), userId: 'pending', workspaceId, roleInWorkspace: roleInWorkspace || 'COLABORADOR', inviteAccepted: false, paymentStatus: 'PENDING', costPerSeat: 3.0, invitedEmail: email, paidAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  db.memberships.push(membership);
  res.status(201).json({ membership, checkoutUrl: `https://checkout.revolut.com/stub?workspace=${workspaceId}&email=${email}` });
});

app.get('/api/workspaces/members', authMiddleware, (req, res) => {
  const workspaceId = req.headers['x-workspace-id'];
  const members = db.memberships.filter((m) => m.workspaceId === workspaceId).map((m) => {
    const user = db.users.find((u) => u.id === m.userId);
    return { ...m, user: user ? safeUser(user) : null };
  });
  res.json(members);
});

app.delete('/api/workspaces/members/:id', authMiddleware, (req, res) => {
  const idx = db.memberships.findIndex((m) => m.id === req.params.id);
  if (idx >= 0) db.memberships.splice(idx, 1);
  res.json({ success: true });
});

// ─── Task Routes ─────────────────────────────────────────

app.get('/api/tasks', authMiddleware, (req, res) => {
  const workspaceId = req.headers['x-workspace-id'];
  const tasks = db.tasks.filter((t) => t.workspaceId === workspaceId).map((t) => {
    const assignee = t.assigneeId ? db.users.find((u) => u.id === t.assigneeId) : null;
    return { ...t, assignee: assignee ? safeUser(assignee) : null };
  });
  res.json(tasks);
});

app.post('/api/tasks', authMiddleware, (req, res) => {
  const workspaceId = req.headers['x-workspace-id'];
  const task = { id: genId(), ...req.body, workspaceId, status: req.body.status || 'PENDING', googleTaskId: null, lastSyncedAt: null, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  db.tasks.push(task);
  res.status(201).json(task);
});

app.patch('/api/tasks/:id', authMiddleware, (req, res) => {
  const task = db.tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
  Object.assign(task, req.body, { version: task.version + 1, updatedAt: new Date().toISOString() });
  const assignee = task.assigneeId ? db.users.find((u) => u.id === task.assigneeId) : null;
  res.json({ ...task, assignee: assignee ? safeUser(assignee) : null });
});

app.delete('/api/tasks/:id', authMiddleware, (req, res) => {
  const idx = db.tasks.findIndex((t) => t.id === req.params.id);
  if (idx >= 0) db.tasks.splice(idx, 1);
  res.json({ success: true });
});

// ─── Meeting Routes ──────────────────────────────────────

app.get('/api/meetings', authMiddleware, (req, res) => {
  const workspaceId = req.headers['x-workspace-id'];
  res.json(db.meetings.filter((m) => m.workspaceId === workspaceId));
});

app.post('/api/meetings', authMiddleware, (req, res) => {
  const workspaceId = req.headers['x-workspace-id'];
  const meeting = { id: genId(), ...req.body, workspaceId, recordingUrl: null, summary: null, suggestedTasks: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  db.meetings.push(meeting);
  res.status(201).json(meeting);
});

app.post('/api/meetings/process', authMiddleware, (req, res) => {
  // Gemini 1.5 Flash stub
  const aiResult = {
    summary: 'Reunião sobre planejamento do sprint. Foram discutidos os próximos passos do projeto, incluindo melhorias no Kanban, integração com Google Tasks e configuração do billing. A equipe decidiu priorizar a estabilidade antes de novas features.',
    suggestedTasks: [
      { title: 'Implementar drag-and-drop no Kanban', deadline: '2026-03-07' },
      { title: 'Configurar OAuth Google Tasks', deadline: '2026-03-10' },
      { title: 'Testar fluxo de pagamento Revolut', deadline: '2026-03-14' },
      { title: 'Criar testes E2E para fluxo de convite', deadline: '2026-03-12' },
    ],
  };
  if (req.body.meetingId) {
    const meeting = db.meetings.find((m) => m.id === req.body.meetingId);
    if (meeting) { meeting.summary = aiResult.summary; meeting.suggestedTasks = aiResult.suggestedTasks; }
  }
  res.json(aiResult);
});

app.delete('/api/meetings/:id', authMiddleware, (req, res) => {
  const idx = db.meetings.findIndex((m) => m.id === req.params.id);
  if (idx >= 0) db.meetings.splice(idx, 1);
  res.json({ success: true });
});

// ─── Billing Routes ──────────────────────────────────────

app.get('/api/billing/subscription', authMiddleware, (req, res) => {
  const workspaceId = req.headers['x-workspace-id'];
  const sub = db.subscriptions.find((s) => s.workspaceId === workspaceId);
  if (!sub) return res.status(404).json({ error: 'Assinatura não encontrada' });
  res.json(sub);
});

app.patch('/api/billing/subscription', authMiddleware, (req, res) => {
  const workspaceId = req.headers['x-workspace-id'];
  const sub = db.subscriptions.find((s) => s.workspaceId === workspaceId);
  if (!sub) return res.status(404).json({ error: 'Assinatura não encontrada' });
  if (req.body.autoRenew !== undefined) sub.autoRenew = req.body.autoRenew;
  sub.updatedAt = new Date().toISOString();
  res.json(sub);
});

app.get('/api/billing/overview', authMiddleware, (req, res) => {
  const overview = db.subscriptions.map((sub) => {
    const ws = db.workspaces.find((w) => w.id === sub.workspaceId);
    const gestorMembership = db.memberships.find((m) => m.workspaceId === sub.workspaceId && m.roleInWorkspace === 'GESTOR');
    const gestorUser = gestorMembership ? db.users.find((u) => u.id === gestorMembership.userId) : null;
    return {
      workspaceId: sub.workspaceId,
      workspaceName: ws?.name || 'N/A',
      gestorName: gestorUser?.name || 'N/A',
      basePrice: sub.basePrice,
      activeSeats: sub.seatCount,
      seatCost: Math.max(0, (sub.seatCount - 1) * 3.0),
      totalMonthly: sub.totalMonthlyValue,
      autoRenew: sub.autoRenew,
    };
  });
  res.json(overview);
});

app.post('/api/billing/manual-charge', authMiddleware, (req, res) => {
  res.json({ success: true, message: 'Cobrança manual enviada (mock)' });
});

// ─── Webhooks (no auth) ─────────────────────────────────

app.post('/api/webhooks/revolut', (req, res) => {
  console.log('[Webhook:Revolut]', req.body);
  res.json({ received: true });
});

app.post('/api/webhooks/google-tasks', (req, res) => {
  console.log('[Webhook:GoogleTasks]', req.body);
  res.json({ action: 'no_action' });
});

// ─── Start ───────────────────────────────────────────────

await seed();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nMock server running on http://localhost:${PORT}`);
  console.log('\nContas de teste:');
  console.log('  admin@ecom360.co / admin123  (SUPER_ADMIN)');
  console.log('  maria@empresa.com / gestor123 (GESTOR)');
  console.log('  joao@empresa.com / gestor123  (COLABORADOR)\n');
});
