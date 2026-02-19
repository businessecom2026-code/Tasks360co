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
  Users,
  Bell,
  AlertCircle
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
  // Changed default loading to false to show Landing Page immediately
  const [loading, setLoading] = useState(false);
  

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // @ts-ignore
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_API_KEY || '');

  const [isCalendarSynced, setIsCalendarSynced] = useState(false);

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  
  const t = translations[language];

  // Load API Key if available globally
  useEffect(() => {
    if (!apiKey && (window as any).geminiApiKey) {
        setApiKey((window as any).geminiApiKey);
    }
  }, []);

  // Handle window resize for sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        // Desktop: Restore expanded state if desired, or keep user preference
      } else {
        setIsSidebarOpen(false); // Mobile: Always collapse on resize to small
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchAppData = async () => {
      setLoading(true);
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

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setView('DASHBOARD');
    // Fetch data only after successful login
    fetchAppData();
  };

  // Check for pending tasks to show popup
  useEffect(() => {
    if (currentUser && tasks.length > 0) {
      const myPending = tasks.filter(t => t.assignee === currentUser.name && t.status !== 'DONE');
      if (myPending.length > 0) {
        setShowPopup(true);
        // Auto hide popup after 5 seconds
        const timer = setTimeout(() => setShowPopup(false), 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser, tasks]);

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

      try {
        // Persist first
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        });

        // Then login and fetch fresh data
        handleLoginSuccess(newUser);
      } catch (e) {
        console.error("Failed to save user", e);
        alert("Erro ao criar conta. Tente novamente.");
      }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setView('DASHBOARD');
    // Clear data on logout
    setTasks([]);
    setMeetings([]);
    setUsers([]);
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

  // Get My Notifications
  const myPendingTasks = currentUser 
      ? getFilteredTasks().filter(t => t.assignee === currentUser.name && t.status !== 'DONE') 
      : [];

  const navItems = [
    { id: 'DASHBOARD', label: t.sidebar.dashboard, icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'COLLABORATOR'] },
    { id: 'KANBAN', label: t.sidebar.tasks, icon: CheckSquare, roles: ['SUPER_ADMIN', 'ADMIN', 'COLLABORATOR'] },
    { id: 'MEETINGS', label: t.sidebar.meetings, icon: Video, roles: ['SUPER_ADMIN', 'ADMIN', 'COLLABORATOR', 'CLIENT'] },
    { id: 'CHAT', label: t.sidebar.chat, icon: MessageSquare, roles: ['SUPER_ADMIN', 'ADMIN', 'COLLABORATOR', 'CLIENT'] },
    { id: 'USER_MANAGEMENT', label: 'Gestão de Usuários', icon: Users, roles: ['SUPER_ADMIN'] },
  ];

  const renderContent = () => {
    if (!currentUser) return null;
    
    // Show spinner ONLY when logged in and waiting for data
    if (loading) {
      return <div className="flex h-full items-center justify-center bg-gray-50"><div className="animate-spin text-teal-600"><RefreshCw size={32} /></div></div>;
    }

    switch (view) {
      case 'DASHBOARD': return <Dashboard tasks={getFilteredTasks()} role={currentUser.role} language={language} />;
      case 'KANBAN': return (
        <KanbanBoard 
          tasks={getFilteredTasks()} 
          setTasks={setTasks} 
          role={currentUser.role} 
          language={language} 
          users={users} 
          currentCompany={currentUser.company} 
        />
      );
      case 'USER_MANAGEMENT': return <UserManagement users={users} setUsers={setUsers} />;
      case 'MEETINGS': 
        return (
          <div className="p-4 md:p-6 space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900">{t.meetings.title}</h2>
                <div className="flex gap-2 w-full md:w-auto">
                    <button 
                        onClick={handleCreateMeeting}
                        className="flex-1 md:flex-none justify-center bg-white border border-gray-300 text-gray-800 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm flex items-center gap-2"
                    >
                       <Plus size={16} /> {t.meetings.schedule}
                    </button>
                    <button onClick={() => setView('LIVE_MEETING')} className="flex-1 md:flex-none justify-center bg-teal-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-teal-700 transition shadow-sm flex items-center gap-2">
                       <Video size={16} /> <span className="hidden sm:inline">{t.meetings.startAI}</span><span className="sm:hidden">AI</span>
                    </button>
                </div>
             </div>

             {/* Integration Status Card */}
             <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
                     <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1 rounded-full text-sm font-bold w-full md:w-auto justify-center">
                         <RefreshCw size={14} /> Synced
                     </div>
                 ) : (
                     <button onClick={() => setIsCalendarSynced(true)} className="w-full md:w-auto text-sm font-bold text-teal-700 hover:text-teal-900 border border-teal-200 bg-teal-50 px-4 py-2 rounded-lg transition-colors">
                         {t.meetings.connectBtn}
                     </button>
                 )}
             </div>

             {/* Meeting List */}
             <div className="space-y-4">
               <h3 className="font-bold text-gray-800">{t.meetings.upcoming}</h3>
               <div className="grid gap-4">
                 {getFilteredMeetings().map(m => (
                   <div key={m.id} className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm hover:shadow-md transition-shadow group gap-4">
                      <div className="flex items-start gap-4 w-full md:w-auto">
                          <div className="bg-slate-100 p-3 rounded-lg text-center min-w-[60px]">
                              <div className="text-xs text-slate-600 uppercase font-bold">{m.date.split(' ')[0]}</div>
                              <div className="text-xl font-bold text-slate-900">{m.date.split(' ')[1].replace(',', '')}</div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 group-hover:text-teal-700 transition-colors">{m.title}</h4>
                            <p className="text-sm text-gray-600 flex items-center gap-2 mt-1 font-medium flex-wrap">
                                <span>{m.time}</span>
                                <span className="hidden sm:inline">•</span>
                                <span className="flex items-center gap-1 w-full sm:w-auto"><Video size={12} /> {m.platform}</span>
                            </p>
                            {currentUser.role === 'SUPER_ADMIN' && (
                                <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded mt-1 inline-block font-medium">
                                    {m.company}
                                </span>
                            )}
                          </div>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                          <a href={m.link} target="_blank" rel="noreferrer" className="flex-1 md:flex-none text-center text-sm font-bold text-gray-700 bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                              {t.meetings.copyLink}
                          </a>
                          <a href={m.link} target="_blank" rel="noreferrer" className="flex-1 md:flex-none text-center text-sm font-bold text-white bg-teal-600 px-3 py-2 rounded-lg hover:bg-teal-700 transition-colors shadow-sm">
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
      case 'CHAT': return <div className="p-4 md:p-6"><ChatWindow apiKey={apiKey} language={language} /></div>;
      default: return <div className="p-6">Select a module</div>;
    }
  };

  // If not authenticated, render landing page
  if (!isAuthenticated || !currentUser) {
    return <LandingPage onLoginSuccess={handleLoginSuccess} onRegister={handleRegister} />;
  }

  // Sidebar Component Logic
  const SidebarContent = () => (
    <>
        <div className="h-16 flex items-center justify-center border-b border-slate-800 shrink-0">
           {isSidebarOpen ? (
             <span className="font-bold text-xl text-white tracking-tight flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-teal-500"></div>
               Task 360.co
             </span>
           ) : (
             <span className="font-bold text-xl text-teal-500">360</span>
           )}
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.filter(item => item.roles.includes(currentUser.role)).map(item => (
            <button
              key={item.id}
              onClick={() => {
                  setView(item.id as ViewState);
                  if (window.innerWidth <= 768) setIsSidebarOpen(false); // Close on mobile after click
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                view === item.id 
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/50' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} className="shrink-0" />
              {isSidebarOpen && <span className="font-bold text-sm truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Profile / Role Switcher */}
        <div className="p-4 border-t border-slate-800 shrink-0">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 font-bold overflow-hidden shrink-0">
              {currentUser.avatar ? <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover" /> : <UserCircle size={20} />}
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
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-900 font-sans animate-fade-in">
      
      {/* ALERT POPUP (Toast) */}
      {showPopup && (
        <div className="fixed top-20 right-4 z-50 max-w-sm w-full bg-white border border-l-4 border-l-orange-500 border-gray-200 rounded-lg shadow-xl p-4 animate-fade-in slide-in-from-right flex gap-3">
          <div className="text-orange-500 shrink-0">
            <AlertCircle size={24} />
          </div>
          <div className="flex-1">
             <h4 className="font-bold text-gray-900 text-sm">Atenção, {currentUser.name.split(' ')[0]}!</h4>
             <p className="text-xs text-gray-600 mt-1">
               Você tem <span className="font-bold text-orange-600">{myPendingTasks.length} tarefas pendentes</span> aguardando conclusão.
             </p>
             <button 
                onClick={() => {setView('KANBAN'); setShowPopup(false);}}
                className="text-xs font-bold text-teal-600 hover:underline mt-2"
             >
               Ver minhas tarefas &rarr;
             </button>
          </div>
          <button onClick={() => setShowPopup(false)} className="text-gray-400 hover:text-gray-600 self-start">
             <X size={16} />
          </button>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
      )}

      {/* Sidebar - Responsive Logic */}
      <aside 
        className={`
            fixed md:relative inset-y-0 left-0 z-30
            bg-slate-900 border-r border-slate-800 shadow-xl
            transition-all duration-300 ease-in-out flex flex-col
            ${isSidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20'}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#f8fafc] w-full">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shadow-sm shrink-0 z-10">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="text-gray-500 hover:text-black transition-colors p-2 -ml-2 rounded-lg active:bg-gray-100"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="flex items-center gap-3 md:gap-6">
             {/* Notification Bell */}
             <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-gray-500 hover:text-teal-700 hover:bg-gray-100 rounded-lg transition-colors relative"
                >
                   <Bell size={20} />
                   {myPendingTasks.length > 0 && (
                     <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-white">
                       {myPendingTasks.length}
                     </span>
                   )}
                </button>
                
                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                      <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                         <h4 className="font-bold text-xs text-gray-500 uppercase tracking-wider">Notificações</h4>
                         {myPendingTasks.length > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{myPendingTasks.length} Pendentes</span>}
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {myPendingTasks.length === 0 ? (
                           <div className="p-8 text-center text-gray-400 text-sm">
                              Tudo limpo! Nenhuma tarefa pendente.
                           </div>
                        ) : (
                           myPendingTasks.map(task => (
                             <div key={task.id} onClick={() => {setView('KANBAN'); setShowNotifications(false);}} className="p-3 border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors group">
                                <div className="flex justify-between items-start mb-1">
                                   <span className="font-bold text-sm text-gray-800 group-hover:text-teal-800 line-clamp-1">{task.title}</span>
                                   <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{task.dueDate || 'Sem data'}</span>
                                </div>
                                <p className="text-xs text-gray-500">Você é o responsável por esta tarefa.</p>
                             </div>
                           ))
                        )}
                      </div>
                  </div>
                )}
             </div>

             {/* Language Selector */}
             <div className="flex items-center gap-2">
                <Globe size={16} className="text-gray-500 hidden sm:block" />
                <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="text-sm text-gray-700 font-medium bg-transparent border-none focus:ring-0 cursor-pointer hover:text-black transition-colors"
                >
                    <option value="pt">PT</option>
                    <option value="en">EN</option>
                    <option value="es">ES</option>
                    <option value="it">IT</option>
                </select>
             </div>

             {!apiKey && (
                 <span className="text-[10px] md:text-xs text-red-600 bg-red-50 px-2 md:px-3 py-1 rounded-full border border-red-200 font-bold whitespace-nowrap">{t.common.apiKeyMissing}</span>
             )}
             <span className="hidden md:inline-block text-xs font-bold tracking-wider text-gray-500 uppercase bg-gray-100 px-2 py-1 rounded">{currentUser.role}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;