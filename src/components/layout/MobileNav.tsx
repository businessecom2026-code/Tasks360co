import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Columns3,
  Video,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { WorkspaceSwitcher } from '../workspace/WorkspaceSwitcher';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'bg-blue-600', textColor: 'text-blue-400' },
  { to: '/kanban', icon: Columns3, label: 'Kanban', color: 'bg-purple-600', textColor: 'text-purple-400' },
  { to: '/meetings', icon: Video, label: 'Reuniões', color: 'bg-green-600', textColor: 'text-green-400' },
  { to: '/admin', icon: Shield, label: 'Admin', color: 'bg-yellow-600', textColor: 'text-yellow-400', roles: ['SUPER_ADMIN', 'GESTOR'] as const },
  { to: '/settings', icon: Settings, label: 'Definições', color: 'bg-gray-600', textColor: 'text-gray-400' },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuthStore();

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between h-14 px-4 bg-gray-900 border-b border-gray-800 shrink-0">
        <h1 className="text-lg font-bold text-white">
          Task<span className="text-blue-500">360</span>
        </h1>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile app dashboard panel */}
      <div
        className={`md:hidden fixed inset-x-0 top-14 bottom-0 z-50 bg-gray-950 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : '-translate-y-full pointer-events-none'
        }`}
      >
        <div className="flex flex-col h-full px-4 pt-6 pb-4 overflow-y-auto">
          {/* Workspace Switcher */}
          <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <WorkspaceSwitcher />
          </div>

          {/* App grid */}
          <div className="grid grid-cols-3 gap-4 mb-auto">
            {navItems.map((item) => {
              if (item.roles && user && !item.roles.includes(user.role as 'SUPER_ADMIN' | 'GESTOR')) {
                return null;
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${
                      isActive
                        ? 'bg-gray-800 ring-1 ring-blue-500/40'
                        : 'bg-gray-900 hover:bg-gray-800'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                          isActive ? item.color : 'bg-gray-800'
                        } transition-colors`}
                      >
                        <item.icon
                          size={26}
                          className={isActive ? 'text-white' : item.textColor}
                        />
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          isActive ? 'text-white' : 'text-gray-400'
                        }`}
                      >
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* User card at bottom */}
          <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-gray-800"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
