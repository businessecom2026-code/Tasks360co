import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Columns3,
  Video,
  Shield,
  Settings,
  LogOut,
} from 'lucide-react';
import { WorkspaceSwitcher } from '../workspace/WorkspaceSwitcher';
import { useAuthStore } from '../../stores/useAuthStore';
import { ThemeToggle } from '../common/ThemeToggle';
import { isAdminUser } from '../common/AdminGuard';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/kanban', icon: Columns3, label: 'Kanban' },
  { to: '/meetings', icon: Video, label: 'Reuniões' },
  { to: '/admin', icon: Shield, label: 'Admin', requiresAdminAccess: true },
  { to: '/settings', icon: Settings, label: 'Configurações' },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();

  const hasAdminAccess = isAdminUser(user?.email);

  return (
    <aside className="hidden md:flex w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col h-screen shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Task<span className="text-blue-500">360</span></h1>
        <p className="text-xs text-gray-500 mt-0.5">Engine v1.0</p>
      </div>

      {/* Workspace Switcher */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <WorkspaceSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.requiresAdminAccess && !hasAdminAccess) {
            return null;
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* User section + Theme toggle */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 dark:text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <ThemeToggle />
          <button
            onClick={logout}
            className="text-gray-500 hover:text-red-400 transition-colors shrink-0"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
