import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useLocaleStore } from '../../stores/useLocaleStore';

export function OfflineBanner() {
  const { t } = useLocaleStore();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-yellow-600/20 border-b border-yellow-600/30 px-4 py-2 flex items-center justify-center gap-2 shrink-0">
      <WifiOff size={14} className="text-yellow-400" />
      <span className="text-xs text-yellow-300 font-medium">
        {t('offline.banner')}
      </span>
    </div>
  );
}
