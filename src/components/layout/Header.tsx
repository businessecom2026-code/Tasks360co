import { useEffect } from 'react';
import { Bell, Search } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { NotificationPanel } from '../notifications/NotificationPanel';
import { ThemeToggle } from '../common/ThemeToggle';

interface Props {
  title: string;
}

export function Header({ title }: Props) {
  const { currentWorkspace } = useWorkspaceStore();
  const { unreadCount, isOpen, setOpen, fetchUnreadCount, connectSSE, disconnectSSE } =
    useNotificationStore();

  useEffect(() => {
    fetchUnreadCount();
    connectSSE();
    return () => disconnectSSE();
  }, [fetchUnreadCount, connectSSE, disconnectSSE]);

  return (
    <header className="h-14 md:h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:px-6 shrink-0">
      <div>
        <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {currentWorkspace && (
          <p className="text-xs text-gray-500">{currentWorkspace.name}</p>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="relative hidden sm:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar..."
            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-48"
          />
        </div>

        <button className="sm:hidden text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2">
          <Search size={18} />
        </button>

        <ThemeToggle />

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setOpen(!isOpen)}
            className="relative text-gray-400 hover:text-white transition-colors p-2"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-[10px] text-white font-bold leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </span>
            )}
          </button>
          <NotificationPanel />
        </div>
      </div>
    </header>
  );
}
