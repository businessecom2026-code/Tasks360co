import { useState, useEffect } from 'react';
import { Save, User, CreditCard, RefreshCw } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useAuthStore } from '../stores/useAuthStore';
import { api } from '../lib/api';
import type { Subscription } from '../types';

export function SettingsPage() {
  const { user } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    api.get<Subscription>('/billing/subscription').then((res) => {
      if (res.success && res.data) setSubscription(res.data);
    });
  }, []);

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
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={18} className="text-blue-400" />
            <h3 className="text-white font-semibold">Perfil</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">E-mail</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-500 text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Função</label>
              <input
                type="text"
                value={user?.role || ''}
                disabled
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-500 text-sm cursor-not-allowed"
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
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={18} className="text-green-400" />
              <h3 className="text-white font-semibold">Assinatura</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4">
                <div>
                  <p className="text-white text-sm font-medium">Renovação Automática</p>
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
                <span className="text-white font-medium">{subscription.totalMonthlyValue.toFixed(2)} EUR</span>
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
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw size={18} className="text-purple-400" />
            <h3 className="text-white font-semibold">Google Tasks Sync</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Conecte sua conta Google para sincronizar tarefas bidirecionalmente com o Google Tasks.
          </p>
          <button className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Conectar Google Account
          </button>
          <p className="text-xs text-gray-600 mt-2">
            Integração via OAuth 2.0 com resolução de conflitos "Last Write Wins".
          </p>
        </div>
      </div>
    </>
  );
}
