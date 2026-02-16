import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Video, 
  MessageSquare, 
  LogOut, 
  Menu,
  X,
  UserCircle,
  Calendar,
  RefreshCw,
  Plus,
  Globe,
  Users
} from 'lucide-react';
import { UserRole, ViewState, Task, Language, User, Meeting } from './types';
import Dashboard from './components/Dashboard';
import KanbanBoard from './components/KanbanBoard';
import MeetingRoom from './components/MeetingRoom';
import ChatWindow from './components/ChatWindow';
import LandingPage from './components/LandingPage';
import UserManagement from './components/UserManagement';
import { translations } from './i18n';

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // App State
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [language, setLanguage] = useState<Language>('pt');
  
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [apiKey, setApiKey] = useState(process.env.API_KEY || '');
  const [isCalendarSynced, setIsCalendarSynced] = useState(false);
  
  const t = translations[language];

  // Fetch Initial Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, tasksRes, meetingsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/tasks'),
          fetch('/api/meetings')
        ]);
        
        if (usersRes.ok) setUsers(await usersRes.json());
        if (tasksRes.ok) setTasks(await tasksRes.json());
        if (meetingsRes.ok) setMeetings(await meetingsRes.json());
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    if (!apiKey && (window as any).geminiApiKey) {
        setApiKey((window as any).geminiApiKey);
    }
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setView('DASHBOARD');
  };

  const handleRegister = async (name: string, email: string, pass: string, company: string) => {
      const newUser: User = {
          id: Date.now().toString(),
          name,
          email,
          password: pass,
          company,
          role: 'ADMIN',
          avatar: ''
      };

      // Optimistic update
      setUsers(prev => [...prev, newUser]);
      handleLoginSuccess(newUser);

      // Persist
      try {
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        });
      } catch (e) {
        console.error("Failed to save user", e);
      }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setView('DASHBOARD');
  };

  const handleAddTask = async (task: Task) => {
    const taskWithCompany = { ...task, company: currentUser?.company };
    
    setTasks(prev => [...prev, taskWithCompany]);
    
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskWithCompany)
    });
  };

  const handleCreateMeeting = async () => {
      const title = prompt("Meeting Title:");
      if (title) {
          const newMeeting: Meeting = {
              id: Date.now().toString(),
              title: title,
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              platform: 'Google Meet',
              link: `https://meet.google.com/${Math.random().toString(36).substring(7)}`,
              company: currentUser?.company
          };
          
          setMeetings(prev => [newMeeting, ...prev]);

          await fetch('/api/meetings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newMeeting)
          });
      }
  };

  // Filter Data based on Company (Multi-tenancy)
  const getFilteredTasks = () => {
      if (!currentUser) return [];
      if (currentUser.role === 'SUPER_ADMIN') return tasks;
      return tasks.filter(t => t.company === currentUser.company || !t.company);
  };

  const getFilteredMeetings = () => {
      if (!currentUser) return [];
      if (currentUser.role === 'SUPER_ADMIN') return meetings;
      return meetings.filter(m => m.company === currentUser.company || !m.company);
  };

  const navItems = [
    { id: 'DASHBOARD', label: t.sidebar.dashboard, icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'COLLABORATOR'] },
    { id: 'KANBAN', label: t.sidebar.tasks, icon: CheckSquare, roles: ['SUPER_ADMIN', 'ADMIN', 'COLLABORATOR'] },
    { id: 'MEETINGS', label: t.sidebar.meetings, icon: Video, roles: ['SUPER_ADMIN', 'ADMIN', 'COLLABORATOR', 'CLIENT'] },
    { id: 'CHAT', label: t.sidebar.chat, icon: MessageSquare, roles: ['SUPER_ADMIN', 'ADMIN', 'COLLABORATOR', 'CLIENT'] },
    { id: 'USER_MANAGEMENT', label: 'Gestão de Usuários', icon: Users, roles: ['SUPER_ADMIN'] },
  ];

  const renderContent = () => {
    if (!currentUser) return null;

    switch (view) {
      case 'DASHBOARD': return <Dashboard tasks={getFilteredTasks()} role={currentUser.role} language={language} />;
      case 'KANBAN': return <KanbanBoard tasks={getFilteredTasks()} setTasks={setTasks} role={currentUser.role} language={language} />;
      case 'USER_MANAGEMENT': return <UserManagement users={users} setUsers={setUsers} />;
      case 'MEETINGS': 
        return (
          <div className="p-6 space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">{t.meetings.title}</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={handleCreateMeeting}
                        className="bg-white border border-gray-300 text-gray-800 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm flex items-center gap-2"
                    >
                       <Plus size={16} /> {t.meetings.schedule}
                    </button>
                    <button onClick={() => setView('LIVE_MEETING')} className="bg-teal-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-teal-700 transition shadow-sm flex items-center gap-2">
                       <Video size={16} /> {t.meetings.startAI}
                    </button>
                </div>
             </div>

             {/* Integration Status Card */}
             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                 <div className="flex items-center gap-4">
                     <div className="p-3 bg-teal-50 rounded-full text-teal-600">
                         <Calendar size={24} />
                     </div>
                     <div>
                         <h4 className="font-bold text-gray-900">{t.meetings.integrationTitle}</h4>
                         <p className="text-sm text-gray-600">
                             {isCalendarSynced ? t.meetings.synced : t.meetings.connect}
                         </p>
                     </div>
                 </div>
                 {isCalendarSynced ? (
                     <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1 rounded-full text-sm font-bold">
                         <RefreshCw size={14} /> Synced
                     </div>
                 ) : (
                     <button onClick={() => setIsCalendarSynced(true)} className="text-sm font-bold text-teal-700 hover:text-teal-900 border border-teal-200 bg-teal-50 px-4 py-2 rounded-lg transition-colors">
                         {t.meetings.connectBtn}
                     </button>
                 )}
             </div>

             {/* Meeting List */}
             <div className="space-y-4">
               <h3 className="font-bold text-gray-800">{t.meetings.upcoming}</h3>
               <div className="grid gap-4">
                 {getFilteredMeetings().map(m => (
                   <div key={m.id} className="bg-white p-5 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex items-start gap-4">
                          <div className="bg-slate-100 p-3 rounded-lg text-center min-w-[60px]">
                              <div className="text-xs text-slate-600 uppercase font-bold">{m.date.split(' ')[0]}</div>
                              <div className="text-xl font-bold text-slate-900">{m.date.split(' ')[1].replace(',', '')}</div>
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 group-hover:text-teal-700 transition-colors">{m.title}</h4>
                            <p className="text-sm text-gray-600 flex items-center gap-2 mt-1 font-medium">
                                <span>{m.time}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><Video size={12} /> {m.platform}</span>
                            </p>
                            {currentUser.role === 'SUPER_ADMIN' && (
                                <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded mt-1 inline-block font-medium">
                                    {m.company}
                                </span>
                            )}
                          </div>
                      </div>
                      <div className="flex gap-3">
                          <a href={m.link} target="_blank" rel="noreferrer" className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                              {t.meetings.copyLink}
                          </a>
                          <a href={m.link} target="_blank" rel="noreferrer" className="text-sm font-bold text-white bg-teal-600 px-3 py-2 rounded-lg hover:bg-teal-700 transition-colors shadow-sm">
                              {t.meetings.join}
                          </a>
                      </div>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        );
      case 'LIVE_MEETING':
        return <MeetingRoom apiKey={apiKey} onClose={() => setView('MEETINGS')} onAddTask={handleAddTask} language={language} />;
      case 'CHAT': return <div className="p-6"><ChatWindow apiKey={apiKey} language={language} /></div>;
      default: return <div className="p-6">Select a module</div>;
    }
  };

  if (loading) {
      return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin text-teal-600"><RefreshCw size={32} /></div></div>;
  }

  // If not authenticated, render landing page
  if (!isAuthenticated || !currentUser) {
    return <LandingPage onLoginSuccess={handleLoginSuccess} onRegister={handleRegister} users={users} />;
  }

  // If authenticated, render main app
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-900 font-sans animate-fade-in">
      
      {/* Sidebar - Dark Theme for Enterprise Feel */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col z-20 shadow-xl`}>
        <div className="h-16 flex items-center justify-center border-b border-slate-800">
           {isSidebarOpen ? (
             <span className="font-bold text-xl text-white tracking-tight flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-teal-500"></div>
               Task 360.co
             </span>
           ) : (
             <span className="font-bold text-xl text-teal-500">360</span>
           )}
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.filter(item => item.roles.includes(currentUser.role)).map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewState)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                view === item.id 
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/50' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="font-bold text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Profile / Role Switcher */}
        <div className="p-4 border-t border-slate-800">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 font-bold overflow-hidden">
              {currentUser.avatar ? <img src={currentUser.avatar} alt="Me" /> : <UserCircle size={20} />}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-white truncate" title={currentUser.name}>{currentUser.name}</p>
                <div className="flex flex-col">
                    <span className="text-xs text-teal-500 truncate font-medium">{currentUser.company}</span>
                    <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1 mt-1 font-medium">
                        <LogOut size={10} /> Sair
                    </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#f8fafc]">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:text-black transition-colors">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="flex items-center gap-6">
             {/* Language Selector */}
             <div className="flex items-center gap-2">
                <Globe size={16} className="text-gray-500" />
                <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="text-sm text-gray-700 font-medium bg-transparent border-none focus:ring-0 cursor-pointer hover:text-black transition-colors"
                >
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="it">Italiano</option>
                </select>
             </div>

             {!apiKey && (
                 <span className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200 font-bold">{t.common.apiKeyMissing}</span>
             )}
             <span className="text-xs font-bold tracking-wider text-gray-500 uppercase bg-gray-100 px-2 py-1 rounded">{currentUser.role}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;