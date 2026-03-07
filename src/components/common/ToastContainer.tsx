import { useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToastStore, type ToastType } from '../../stores/useToastStore';

const ICON_MAP: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLOR_MAP: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/80',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    icon: 'text-emerald-500 dark:text-emerald-400',
    text: 'text-emerald-800 dark:text-emerald-200',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950/80',
    border: 'border-red-200 dark:border-red-800/60',
    icon: 'text-red-500 dark:text-red-400',
    text: 'text-red-800 dark:text-red-200',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/80',
    border: 'border-amber-200 dark:border-amber-800/60',
    icon: 'text-amber-500 dark:text-amber-400',
    text: 'text-amber-800 dark:text-amber-200',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/80',
    border: 'border-blue-200 dark:border-blue-800/60',
    icon: 'text-blue-500 dark:text-blue-400',
    text: 'text-blue-800 dark:text-blue-200',
  },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to latest toast
  useEffect(() => {
    if (containerRef.current && toasts.length > 0) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [toasts.length]);

  if (toasts.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-h-[50vh] overflow-y-auto pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const Icon = ICON_MAP[toast.type];
        const colors = COLOR_MAP[toast.type];

        return (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg
              min-w-[300px] max-w-[420px] animate-toast-enter
              ${colors.bg} ${colors.border}
            `}
            role="alert"
          >
            <Icon size={18} className={`mt-0.5 flex-shrink-0 ${colors.icon}`} />
            <p className={`text-sm flex-1 ${colors.text}`}>{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className={`flex-shrink-0 mt-0.5 opacity-60 hover:opacity-100 transition-opacity ${colors.text}`}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
