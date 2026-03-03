import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Columns3,
  Video,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { WorkspaceSwitcher } from '../workspace/WorkspaceSwitcher';

interface AppItem {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  color: string;
  iconColor: string;
  activeRing: string;
  roles?: readonly ('SUPER_ADMIN' | 'GESTOR')[];
}

const appItems: AppItem[] = [
  {
    to: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    color: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
    activeRing: 'ring-emerald-500/50',
  },
  {
    to: '/kanban',
    icon: Columns3,
    label: 'Kanban',
    color: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
    activeRing: 'ring-blue-500/50',
  },
  {
    to: '/meetings',
    icon: Video,
    label: 'Reunioes',
    color: 'bg-purple-500/15',
    iconColor: 'text-purple-400',
    activeRing: 'ring-purple-500/50',
  },
  {
    to: '/settings',
    icon: Settings,
    label: 'Config',
    color: 'bg-slate-500/15',
    iconColor: 'text-slate-400',
    activeRing: 'ring-slate-500/50',
  },
  {
    to: '/admin',
    icon: Shield,
    label: 'Admin',
    color: 'bg-red-500/15',
    iconColor: 'text-red-400',
    activeRing: 'ring-red-500/50',
    roles: ['SUPER_ADMIN', 'GESTOR'],
  },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const visibleItems = appItems.filter((item) => {
    if (item.roles && user && !item.roles.includes(user.role as 'SUPER_ADMIN' | 'GESTOR')) {
      return false;
    }
    return true;
  });

  return (
    <>
      {/* ─── Mobile top bar ─── */}
      <div className="md:hidden flex items-center justify-between h-14 px-4 bg-slate-900 border-b border-slate-800/60 shrink-0 relative z-50">
        <h1 className="text-lg font-bold text-white tracking-tight">
          Task<span className="text-emerald-400">360</span>
        </h1>

        <div className="flex items-center gap-1">
          <button className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
            <Bell size={20} />
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`p-2 rounded-xl transition-all duration-200 ${
              isOpen
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ─── Backdrop overlay ─── */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* ─── App Dashboard Panel (slide up from bottom) ─── */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: 'calc(100vh - 56px)' }}
      >
        <div
          className="bg-slate-950 rounded-t-3xl border-t border-slate-800/60 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 56px)' }}
        >
          {/* Pull indicator bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-700" />
          </div>

          <div className="px-5 pb-6 pt-2">
            {/* Workspace Switcher */}
            <div className="mb-5 bg-slate-900/80 border border-slate-800/60 rounded-2xl overflow-hidden">
              <WorkspaceSwitcher />
            </div>

            {/* ─── App Grid (iOS/Android style) ─── */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {visibleItems.map((item, index) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="group flex flex-col items-center gap-1.5 outline-none"
                >
                  {({ isActive }) => (
                    <div
                      className={`flex flex-col items-center gap-1.5 w-full ${isOpen ? 'animate-app-bounce-in' : ''}`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Icon badge */}
                      <div className={`
                        relative w-14 h-14 rounded-[18px] flex items-center justify-center
                        transition-all duration-200 active:scale-90
                        ${isActive
                          ? `${item.color} ring-2 ${item.activeRing} shadow-lg`
                          : 'bg-slate-800/80 group-hover:bg-slate-800 group-hover:scale-105'
                        }
                      `}>
                        <item.icon
                          size={24}
                          strokeWidth={1.8}
                          className={`transition-colors ${isActive ? item.iconColor : 'text-slate-400 group-hover:text-slate-200'}`}
                        />
                      </div>

                      {/* Label */}
                      <span className={`text-[11px] font-medium truncate max-w-full transition-colors ${
                        isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                      }`}>
                        {item.label}
                      </span>
                    </div>
                  )}
                </NavLink>
              ))}
            </div>

            {/* ─── Quick Actions ─── */}
            <div className="flex gap-2 mb-5">
              <NavLink
                to="/kanban"
                className="flex-1 flex items-center gap-2.5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl hover:bg-emerald-500/15 transition-all active:scale-[0.98]"
              >
                <Columns3 size={18} className="text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white">Abrir Kanban</p>
                  <p className="text-[10px] text-slate-500">Gerir tarefas</p>
                </div>
              </NavLink>
              <NavLink
                to="/meetings"
                className="flex-1 flex items-center gap-2.5 px-4 py-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl hover:bg-purple-500/15 transition-all active:scale-[0.98]"
              >
                <Video size={18} className="text-purple-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white">Reunioes</p>
                  <p className="text-[10px] text-slate-500">Agendar & IA</p>
                </div>
              </NavLink>
            </div>

            {/* ─── User card ─── */}
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg shadow-emerald-500/20">
                  {user?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="p-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Sair"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
