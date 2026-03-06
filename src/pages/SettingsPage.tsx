import { useState, useEffect } from 'react';
import { Save, User, CreditCard, RefreshCw, Link, Unlink, Loader2, ExternalLink, Calendar } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useAuthStore } from '../stores/useAuthStore';
import { api } from '../lib/api';
import type { Subscription } from '../types';

export function SettingsPage() {
  const { user, fetchMe } = useAuthStore();
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
      setSyncResult('Google Tasks conectado com sucesso!');
      window.history.replaceState({}, '', '/settings');
    }
    if (params.get('google_error')) {
      setSyncResult('Erro ao conectar Google Tasks. Tente novamente.');
      window.history.replaceState({}, '', '/settings');
    }
    // Google Calendar callbacks
    if (params.get('google_cal_connected') === 'true') {
      fetchMe();
      setCalResult('Google Calendar conectado com sucesso!');
      window.history.replaceState({}, '', '/settings');
    }
    if (params.get('google_cal_error')) {
      setCalResult('Erro ao conectar Google Calendar. Tente novamente.');
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
        setCheckoutMsg(`Modo sandbox: pagamento de ${res.data.amount.toFixed(2)} EUR simulado com sucesso.`);
      } else {
        window.open(res.data.checkoutUrl, '_blank');
        setCheckoutMsg('Checkout Revolut aberto em nova aba. Complete o pagamento.');
      }
    } else {
      setCheckoutMsg(res.error || 'Erro ao criar checkout');
    }
  };

  return (
    <>
      <Header title="Configurações" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
        {/* Profile */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={18} className="text-blue-400" />
            <h3 className="text-gray-900 dark:text-white font-semibold">Perfil</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">E-mail</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-gray-500 text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Função</label>
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
              {isSaving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Perfil'}
            </button>
          </div>
        </div>

        {/* Subscription settings */}
        {subscription && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={18} className="text-green-400" />
              <h3 className="text-gray-900 dark:text-white font-semibold">Assinatura</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div>
                  <p className="text-gray-900 dark:text-white text-sm font-medium">Renovação Automática</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {subscription.autoRenew
                      ? 'Sua assinatura será renovada automaticamente no fim do ciclo'
                      : 'Sua assinatura expirará no fim do ciclo atual'}
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
                <span className="text-gray-400">Total Mensal</span>
                <span className="text-gray-900 dark:text-white font-medium">{subscription.totalMonthlyValue.toFixed(2)} EUR</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span className="text-xs bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded">
                  {subscription.status}
                </span>
              </div>

              {subscription.currentPeriodEnd && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Próxima cobrança</span>
                  <span className="text-gray-300">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
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
                    Pagar Plano
                  </button>
                  <button
                    onClick={() => handleCheckout('renew')}
                    disabled={isCheckingOut}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {isCheckingOut ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                    Renovar
                  </button>
                </div>
                {checkoutMsg && (
                  <p className={`text-sm ${checkoutMsg.includes('Erro') ? 'text-red-400' : 'text-green-400'}`}>
                    {checkoutMsg}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Pagamento processado via Revolut Business. Checkout seguro com HMAC-SHA256.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Google Sync settings */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw size={18} className="text-purple-400" />
            <h3 className="text-gray-900 dark:text-white font-semibold">Google Tasks Sync</h3>
          </div>

          {user?.googleConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-green-900/20 border border-green-800 rounded-lg p-3">
                <Link size={16} className="text-green-400" />
                <span className="text-green-400 text-sm font-medium">Google Tasks conectado</span>
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
                      setSyncResult(`Sincronizado! ${s.synced} processadas, ${s.created} criadas, ${s.updated} atualizadas`);
                    } else {
                      setSyncResult(res.error || 'Erro ao sincronizar');
                    }
                  }}
                  disabled={isSyncing}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                </button>

                <button
                  onClick={async () => {
                    setIsConnectingGoogle(true);
                    const res = await api.delete('/auth/google');
                    setIsConnectingGoogle(false);
                    if (res.success) {
                      fetchMe();
                      setSyncResult('Google Tasks desconectado');
                    }
                  }}
                  disabled={isConnectingGoogle}
                  className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-700 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Unlink size={16} />
                  Desconectar
                </button>
              </div>

              {syncResult && (
                <p className="text-sm text-blue-400">{syncResult}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Conecte sua conta Google para sincronizar tarefas bidirecionalmente com o Google Tasks.
              </p>
              <button
                onClick={async () => {
                  setIsConnectingGoogle(true);
                  const res = await api.get<{ url: string }>('/auth/google');
                  setIsConnectingGoogle(false);
                  if (res.success && res.data?.url) {
                    window.location.href = res.data.url;
                  } else {
                    setSyncResult(res.error || 'Google OAuth não disponível');
                  }
                }}
                disabled={isConnectingGoogle}
                className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isConnectingGoogle ? <Loader2 size={16} className="animate-spin" /> : <Link size={16} />}
                Conectar Google Account
              </button>
              {syncResult && (
                <p className="text-sm text-yellow-400">{syncResult}</p>
              )}
              <p className="text-xs text-gray-600">
                Integração via OAuth 2.0 com resolução de conflitos "Last Write Wins".
              </p>
            </div>
          )}
        </div>

        {/* Google Calendar settings */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-orange-400" />
            <h3 className="text-gray-900 dark:text-white font-semibold">Google Calendar</h3>
          </div>

          {user?.googleCalConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <Link size={16} className="text-green-600 dark:text-green-400" />
                <span className="text-green-600 dark:text-green-400 text-sm font-medium">Google Calendar conectado</span>
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
                      setCalResult(`Sincronizado! ${s.synced} processados, ${s.created} criados, ${s.updated} atualizados, ${s.deleted} removidos`);
                    } else {
                      setCalResult(res.error || 'Erro ao sincronizar');
                    }
                  }}
                  disabled={calSyncing}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {calSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  {calSyncing ? 'Sincronizando...' : 'Sincronizar Agenda'}
                </button>

                <button
                  onClick={async () => {
                    setCalSyncing(true);
                    const res = await api.post('/calendar/watch', {});
                    setCalSyncing(false);
                    if (res.success) {
                      setCalResult('Push notifications ativadas. Eventos serão sincronizados automaticamente.');
                    } else {
                      setCalResult(res.error || 'Erro ao ativar push');
                    }
                  }}
                  disabled={calSyncing}
                  className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <ExternalLink size={16} />
                  Ativar Push
                </button>

                <button
                  onClick={async () => {
                    setIsConnectingCal(true);
                    const res = await api.delete('/calendar/disconnect');
                    setIsConnectingCal(false);
                    if (res.success) {
                      fetchMe();
                      setCalResult('Google Calendar desconectado');
                    }
                  }}
                  disabled={isConnectingCal}
                  className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-700 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Unlink size={16} />
                  Desconectar
                </button>
              </div>

              {calResult && (
                <p className={`text-sm ${calResult.includes('Erro') ? 'text-red-400' : 'text-blue-400'}`}>{calResult}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Conecte o Google Calendar para visualizar e criar eventos diretamente do Task360.
              </p>
              <button
                onClick={async () => {
                  setIsConnectingCal(true);
                  const res = await api.get<{ url: string }>('/calendar/auth');
                  setIsConnectingCal(false);
                  if (res.success && res.data?.url) {
                    window.location.href = res.data.url;
                  } else {
                    setCalResult(res.error || 'Google OAuth não disponível');
                  }
                }}
                disabled={isConnectingCal}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isConnectingCal ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                Conectar Google Calendar
              </button>
              {calResult && (
                <p className="text-sm text-yellow-400">{calResult}</p>
              )}
              <p className="text-xs text-gray-500">
                Scopes: calendar.events (ler/criar) + calendar.readonly. Tokens criptografados com AES-256-GCM.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
