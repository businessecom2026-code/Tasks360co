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
  Globe
} from 'lucide-react';
import { UserRole, ViewState, Task, TaskStatus, Language } from './types';
import Dashboard from './components/Dashboard';
import KanbanBoard from './components/KanbanBoard';
import MeetingRoom from './components/MeetingRoom';
import ChatWindow from './components/ChatWindow';
import { translations } from './i18n';

// Initial Mock Data
const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'Design Landing Page', status: TaskStatus.DONE, description: 'Figma mockups', dueDate: '2023-10-15' },
  { id: '2', title: 'Integrate Gemini API', status: TaskStatus.IN_PROGRESS, description: 'Use Live API for meetings', dueDate: '2023-10-20' },
  { id: '3', title: 'Client Review', status: TaskStatus.PENDING, description: 'Weekly sync with client', dueDate: '2023-10-22' },
];

const INITIAL_MEETINGS = [
    { id: 1, title: 'Weekly Product Sync', date: 'Oct 24, 2023', time: '10:00 AM', platform: 'Google Meet', link: 'https://meet.google.com/abc-defg-hij' },
    { id: 2, title: 'Client Onboarding', date: 'Oct 25, 2023', time: '02:30 PM', platform: 'Google Meet', link: 'https://meet.google.com/xyz-uvwx-yz' }
];

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [language, setLanguage] = useState<Language>('pt');
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [meetings, setMeetings] = useState(INITIAL_MEETINGS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [apiKey, setApiKey] = useState(process.env.API_KEY || '');
  const [isCalendarSynced, setIsCalendarSynced] = useState(false);
  
  const t = translations[language];

  // Try to get key from window if env not working (for demo purposes if needed)
  useEffect(() => {
    if (!apiKey && (window as any).geminiApiKey) {
        setApiKey((window as any).geminiApiKey);
    }
  }, []);

  const handleAddTask = (task: Task) => {
    setTasks(prev => [...prev, task]);
  };

  const handleConnectCalendar = () => {
      // Simulate connection
      setIsCalendarSynced(true);
      alert("Google Calendar Successfully Connected!");
  };

  const handleCreateMeeting = () => {
      const title = prompt("Meeting Title:");
      if (title) {
          const newMeeting = {
              id: Date.now(),
              title: title,
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              platform: 'Google Meet',
              link: `https://meet.google.com/${Math.random().toString(36).substring(7)}` // Mock link
          };
          setMeetings(prev => [newMeeting, ...prev]);
      }
  };

  const navItems = [
    { id: 'DASHBOARD', label: t.sidebar.dashboard, icon: LayoutDashboard, roles: ['ADMIN', 'COLLABORATOR'] },
    { id: 'KANBAN', label: t.sidebar.tasks, icon: CheckSquare, roles: ['ADMIN', 'COLLABORATOR'] },
    { id: 'MEETINGS', label: t.sidebar.meetings, icon: Video, roles: ['ADMIN', 'COLLABORATOR', 'CLIENT'] },
    { id: 'CHAT', label: t.sidebar.chat, icon: MessageSquare, roles: ['ADMIN', 'COLLABORATOR', 'CLIENT'] },
  ];

  const renderContent = () => {
    switch (view) {
      case 'DASHBOARD': return <Dashboard tasks={tasks} role={role} language={language} />;
      case 'KANBAN': return <KanbanBoard tasks={tasks} setTasks={setTasks} role={role} language={language} />;
      case 'MEETINGS': 
        return (
          <div className="p-6 space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">{t.meetings.title}</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={handleCreateMeeting}
                        className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm flex items-center gap-2"
                    >
                       <Plus size={16} /> {t.meetings.schedule}
                    </button>
                    <button onClick={() => setView('LIVE_MEETING')} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition shadow-sm flex items-center gap-2">
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
                         <h4 className="font-bold text-gray-800">{t.meetings.integrationTitle}</h4>
                         <p className="text-sm text-gray-500">
                             {isCalendarSynced ? t.meetings.synced : t.meetings.connect}
                         </p>
                     </div>
                 </div>
                 {isCalendarSynced ? (
                     <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
                         <RefreshCw size={14} /> Synced
                     </div>
                 ) : (
                     <button onClick={handleConnectCalendar} className="text-sm font-medium text-teal-600 hover:text-teal-800 border border-teal-200 bg-teal-50 px-4 py-2 rounded-lg transition-colors">
                         {t.meetings.connectBtn}
                     </button>
                 )}
             </div>

             {/* Meeting List */}
             <div className="space-y-4">
               <h3 className="font-semibold text-gray-700">{t.meetings.upcoming}</h3>
               <div className="grid gap-4">
                 {meetings.map(m => (
                   <div key={m.id} className="bg-white p-5 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex items-start gap-4">
                          <div className="bg-slate-100 p-3 rounded-lg text-center min-w-[60px]">
                              <div className="text-xs text-slate-500 uppercase font-bold">{m.date.split(' ')[0]}</div>
                              <div className="text-xl font-bold text-slate-800">{m.date.split(' ')[1].replace(',', '')}</div>
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 group-hover:text-teal-600 transition-colors">{m.title}</h4>
                            <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                <span>{m.time}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><Video size={12} /> {m.platform}</span>
                            </p>
                          </div>
                      </div>
                      <div className="flex gap-3">
                          <a href={m.link} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                              {t.meetings.copyLink}
                          </a>
                          <a href={m.link} target="_blank" rel="noreferrer" className="text-sm font-medium text-white bg-teal-600 px-3 py-2 rounded-lg hover:bg-teal-700 transition-colors shadow-sm">
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

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-800 font-sans">
      
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
          {navItems.filter(item => item.roles.includes(role)).map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewState)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                view === item.id 
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Profile / Role Switcher */}
        <div className="p-4 border-t border-slate-800">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400">
              <UserCircle size={20} />
            </div>
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{t.sidebar.user}</p>
                <select 
                  value={role} 
                  onChange={(e) => {
                    setRole(e.target.value as UserRole);
                    setView('DASHBOARD'); // Reset view on role change
                  }}
                  className="text-xs text-slate-400 bg-transparent border-none focus:ring-0 p-0 cursor-pointer hover:text-white transition-colors"
                >
                  <option value="ADMIN" className="text-black">Admin</option>
                  <option value="COLLABORATOR" className="text-black">Collab</option>
                  <option value="CLIENT" className="text-black">Client</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#f8fafc]">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:text-gray-800 transition-colors">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="flex items-center gap-6">
             {/* Language Selector */}
             <div className="flex items-center gap-2">
                <Globe size={16} className="text-gray-400" />
                <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="text-sm text-gray-600 bg-transparent border-none focus:ring-0 cursor-pointer hover:text-teal-600 transition-colors"
                >
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="it">Italiano</option>
                </select>
             </div>

             {!apiKey && (
                 <span className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-100">{t.common.apiKeyMissing}</span>
             )}
             <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase bg-gray-100 px-2 py-1 rounded">{role} {t.sidebar.view}</span>
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