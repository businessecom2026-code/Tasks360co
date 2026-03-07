import { useState, useEffect } from 'react';
import { Save, User, CreditCard, RefreshCw, Link, Unlink, Loader2, ExternalLink, Calendar } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useAuthStore } from '../stores/useAuthStore';
import { useLocaleStore } from '../stores/useLocaleStore';
import { formatCurrency, formatDate } from '../lib/i18n/formatters';
import { api } from '../lib/api';
import type { Subscription } from '../types';

export function SettingsPage() {
  const { user, fetchMe } = useAuthStore();
  const { t, locale } = useLocaleStore();
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);
  const [isConnectingCal, setIsConnectingCal] = useState(false);
  const [calSyncing, setCalSyncing] = useState(false);
  const [calResult, setCalResult] = useState<string | null>(null);

  useEffect(() => {
    api.get<Subscription>('/billing/subscription').then((res) => {
      if (res.success && res.data) setSubscription(res.data);
    });

    // Check for Google callback success
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === 'true') {
      fetchMe();
      setSyncResult(t('settings.googleTasks.connectedSuccess'));
      window.history.replaceState({}, '', '/settings');
    }
    if (params.get('google_error')) {
      setSyncResult(t('settings.googleTasks.connectedError'));
      window.history.replaceState({}, '', '/settings');
    }
    // Google Calendar callbacks
    if (params.get('google_cal_connected') === 'true') {
      fetchMe();
      setCalResult(t('settings.googleCalendar.connectedSuccess'));
      window.history.replaceState({}, '', '/settings');
    }
    if (params.get('google_cal_error')) {
      setCalResult(t('settings.googleCalendar.connectedError'));
      window.history.replaceState({}, '', '/settings');
    }
  }, [fetchMe]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const res = await api.patch('/auth/me', { name });
    setIsSaving(false);
    if (res.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleToggleAutoRenew = async () => {
    if (!subscription) return;
    const newValue = !subscription.autoRenew;
    const res = await api.patch<Subscription>('/billing/subscription', { autoRenew: newValue });
    if (res.success && res.data) {
      setSubscription(res.data);
    }
  };

  const handleCheckout = async (type: 'checkout' | 'renew') => {
    setIsCheckingOut(true);
    setCheckoutMsg(null);
    const res = await api.post<{ checkoutUrl: string; amount: number; orderId: string }>(
      `/billing/${type}`, {}
    );
    setIsCheckingOut(false);
    if (res.success && res.data?.checkoutUrl) {
      if (res.data.checkoutUrl.includes('stub=true')) {
        setCheckoutMsg(t('settings.subscription.checkoutSandbox', { amount: formatCurrency(res.data.amount, locale) }));
      } else {
        window.open(res.data.checkoutUrl, '_blank');
        setCheckoutMsg(t('settings.subscription.checkoutOpened'));
      }
    } else {
      setCheckoutMsg(res.error || t('settings.subscription.checkoutError'));
    }
  };

  return (
    <>
      <Header title={t('settings.title')} />
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
        {/* Profile */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={18} className="text-blue-400" />
            <h3 className="text-gray-900 dark:text-white font-semibold">{t('settings.profile.title')}</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{t('settings.profile.nameLabel')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{t('settings.profile.emailLabel')}</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-gray-500 text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{t('settings.profile.roleLabel')}</label>
              <input
                type="text"
                value={user?.role || ''}
                disabled
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-gray-500 text-sm cursor-not-allowed"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Save size={16} />
              {isSaving ? t('settings.profile.saving') : saved ? t('settings.profile.saved') : t('settings.profile.saveButton')}
            </button>
          </div>
        </div>

        {/* Subscription settings */}
        {subscription && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={18} className="text-green-400" />
              <h3 className="text-gray-900 dark:text-white font-semibold">{t('settings.subscription.title')}</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div>
                  <p className="text-gray-900 dark:text-white text-sm font-medium">{t('settings.subscription.autoRenew')}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {subscription.autoRenew
                      ? t('settings.subscription.autoRenewOnDesc')
                      : t('settings.subscription.autoRenewOffDesc')}
                  </p>
                </div>
                <button
                  onClick={handleToggleAutoRenew}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    subscription.autoRenew ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      subscription.autoRenew ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{t('settings.subscription.monthlyTotal')}</span>
                <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(subscription.totalMonthlyValue, locale)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{t('settings.subscription.status')}</span>
                <span className="text-xs bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded">
                  {subscription.status}
                </span>
              </div>

              {subscription.currentPeriodEnd && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{t('settings.subscription.nextCharge')}</span>
                  <span className="text-gray-300">
                    {formatDate(subscription.currentPeriodEnd, locale)}
                  </span>
                </div>
              )}

              {/* Checkout / Renew buttons */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCheckout('checkout')}
                    disabled={isCheckingOut}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {isCheckingOut ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                    {t('settings.subscription.payPlan')}
                  </button>
                  <button
                    onClick={() => handleCheckout('renew')}
                    disabled={isCheckingOut}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {isCheckingOut ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                    {t('settings.subscription.renew')}
                  </button>
                </div>
                {checkoutMsg && (
                  <p className={`text-sm ${checkoutMsg.includes('Erro') ? 'text-red-400' : 'text-green-400'}`}>
                    {checkoutMsg}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  {t('settings.subscription.paymentNote')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Google Sync settings */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw size={18} className="text-purple-400" />
            <h3 className="text-gray-900 dark:text-white font-semibold">{t('settings.googleTasks.title')}</h3>
          </div>

          {user?.googleConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-green-900/20 border border-green-800 rounded-lg p-3">
                <Link size={16} className="text-green-400" />
                <span className="text-green-400 text-sm font-medium">{t('settings.googleTasks.connected')}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setIsSyncing(true);
                    setSyncResult(null);
                    const res = await api.post<{ stats: { synced: number; created: number; updated: number; skipped: number } }>('/auth/google/sync', {});
                    setIsSyncing(false);
                    if (res.success && res.data) {
                      const s = res.data.stats;
                      setSyncResult(t('settings.googleTasks.syncResult', { synced: s.synced, created: s.created, updated: s.updated }));
                    } else {
                      setSyncResult(res.error || t('settings.googleTasks.syncError'));
                    }
                  }}
                  disabled={isSyncing}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  {isSyncing ? t('settings.googleTasks.syncing') : t('settings.googleTasks.syncNow')}
                </button>

                <button
                  onClick={async () => {
                    setIsConnectingGoogle(true);
                    const res = await api.delete('/auth/google');
                    setIsConnectingGoogle(false);
                    if (res.success) {
                      fetchMe();
                      setSyncResult(t('settings.googleTasks.disconnected'));
                    }
                  }}
                  disabled={isConnectingGoogle}
                  className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-700 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Unlink size={16} />
                  {t('settings.googleTasks.disconnect')}
                </button>
              </div>

              {syncResult && (
                <p className="text-sm text-blue-400">{syncResult}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t('settings.googleTasks.description')}
              </p>
              <button
                onClick={async () => {
                  setIsConnectingGoogle(true);
                  const res = await api.get<{ url: string }>('/auth/google');
                  setIsConnectingGoogle(false);
                  if (res.success && res.data?.url) {
                    window.location.href = res.data.url;
                  } else {
                    setSyncResult(res.error || t('settings.googleTasks.oauthNotAvailable'));
                  }
                }}
                disabled={isConnectingGoogle}
                className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isConnectingGoogle ? <Loader2 size={16} className="animate-spin" /> : <Link size={16} />}
                {t('settings.googleTasks.connectButton')}
              </button>
              {syncResult && (
                <p className="text-sm text-yellow-400">{syncResult}</p>
              )}
              <p className="text-xs text-gray-600">
                {t('settings.googleTasks.oauthNote')}
              </p>
            </div>
          )}
        </div>

        {/* Google Calendar settings */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-orange-400" />
            <h3 className="text-gray-900 dark:text-white font-semibold">{t('settings.googleCalendar.title')}</h3>
          </div>

          {user?.googleCalConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <Link size={16} className="text-green-600 dark:text-green-400" />
                <span className="text-green-600 dark:text-green-400 text-sm font-medium">{t('settings.googleCalendar.connected')}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setCalSyncing(true);
                    setCalResult(null);
                    const res = await api.post<{ stats: { synced: number; created: number; updated: number; deleted: number } }>('/calendar/sync', {});
                    setCalSyncing(false);
                    if (res.success && res.data) {
                      const s = res.data.stats;
                      setCalResult(t('settings.googleCalendar.syncResult', { synced: s.synced, created: s.created, updated: s.updated, deleted: s.deleted }));
                    } else {
                      setCalResult(res.error || t('settings.googleCalendar.syncError'));
                    }
                  }}
                  disabled={calSyncing}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {calSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  {calSyncing ? t('settings.googleCalendar.syncing') : t('settings.googleCalendar.syncNow')}
                </button>

                <button
                  onClick={async () => {
                    setCalSyncing(true);
                    const res = await api.post('/calendar/watch', {});
                    setCalSyncing(false);
                    if (res.success) {
                      setCalResult(t('settings.googleCalendar.pushSuccess'));
                    } else {
                      setCalResult(res.error || t('settings.googleCalendar.pushError'));
                    }
                  }}
                  disabled={calSyncing}
                  className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <ExternalLink size={16} />
                  {t('settings.googleCalendar.activatePush')}
                </button>

                <button
                  onClick={async () => {
                    setIsConnectingCal(true);
                    const res = await api.delete('/calendar/disconnect');
                    setIsConnectingCal(false);
                    if (res.success) {
                      fetchMe();
                      setCalResult(t('settings.googleCalendar.disconnected'));
                    }
                  }}
                  disabled={isConnectingCal}
                  className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-700 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Unlink size={16} />
                  {t('settings.googleCalendar.disconnect')}
                </button>
              </div>

              {calResult && (
                <p className={`text-sm ${calResult.includes('Erro') ? 'text-red-400' : 'text-blue-400'}`}>{calResult}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t('settings.googleCalendar.description')}
              </p>
              <button
                onClick={async () => {
                  setIsConnectingCal(true);
                  const res = await api.get<{ url: string }>('/calendar/auth');
                  setIsConnectingCal(false);
                  if (res.success && res.data?.url) {
                    window.location.href = res.data.url;
                  } else {
                    setCalResult(res.error || t('settings.googleCalendar.oauthNotAvailable'));
                  }
                }}
                disabled={isConnectingCal}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isConnectingCal ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                {t('settings.googleCalendar.connectButton')}
              </button>
              {calResult && (
                <p className="text-sm text-yellow-400">{calResult}</p>
              )}
              <p className="text-xs text-gray-500">
                {t('settings.googleCalendar.scopeNote')}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
