import { useEffect, useRef } from 'react';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  Columns3,
  UserPlus,
  Video,
  CreditCard,
} from 'lucide-react';
import { useNotificationStore, type Notification } from '../../stores/useNotificationStore';

const typeIcons: Record<string, typeof Bell> = {
  task_assigned: Columns3,
  task_moved: Columns3,
  invite_received: UserPlus,
  meeting_created: Video,
  payment_success: CreditCard,
};

const typeColors: Record<string, string> = {
  task_assigned: 'bg-blue-600/20 text-blue-400',
  task_moved: 'bg-purple-600/20 text-purple-400',
  invite_received: 'bg-green-600/20 text-green-400',
  meeting_created: 'bg-yellow-600/20 text-yellow-400',
  payment_success: 'bg-emerald-600/20 text-emerald-400',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function NotificationItem({ notification }: { notification: Notification }) {
  const { markAsRead, deleteNotification } = useNotificationStore();
  const Icon = typeIcons[notification.type] || Bell;
  const colorClass = typeColors[notification.type] || 'bg-gray-600/20 text-gray-400';

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
        notification.read ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-gray-100 dark:bg-gray-800/70'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${notification.read ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
          )}
        </div>
        {notification.body && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-xs text-gray-600 mt-1">{timeAgo(notification.createdAt)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!notification.read && (
          <button
            onClick={() => markAsRead(notification.id)}
            className="text-gray-600 hover:text-blue-400 transition-colors p-1"
            title="Marcar como lida"
          >
            <Check size={14} />
          </button>
        )}
        <button
          onClick={() => deleteNotification(notification.id)}
          className="text-gray-600 hover:text-red-400 transition-colors p-1"
          title="Apagar"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export function NotificationPanel() {
  const { notifications, unreadCount, isOpen, setOpen, fetchNotifications, markAllAsRead } =
    useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen, setOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notificações</h3>
          {unreadCount > 0 && (
            <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-gray-500 hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              <CheckCheck size={12} />
              Ler todas
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors p-1"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto p-2 space-y-1">
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell size={24} className="text-gray-400 dark:text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-600">Sem notificações</p>
          </div>
        ) : (
          notifications.map((n) => <NotificationItem key={n.id} notification={n} />)
        )}
      </div>
    </div>
  );
}
