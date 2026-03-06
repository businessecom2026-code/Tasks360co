import { useState, useEffect } from 'react';
import { Save, User, CreditCard, RefreshCw, Link, Unlink, Loader2 } from 'lucide-react';
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
      </div>
    </>
  );
}
