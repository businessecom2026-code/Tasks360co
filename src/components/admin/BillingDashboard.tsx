import { useEffect, useState } from 'react';
import { DollarSign, Users, CreditCard, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api';
import type { BillingOverview } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';

export function BillingDashboard() {
  const [billings, setBillings] = useState<BillingOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBilling = async () => {
      const res = await api.get<BillingOverview[]>('/billing/overview');
      if (res.success && res.data) {
        setBillings(res.data);
      }
      setIsLoading(false);
    };
    fetchBilling();
  }, []);

  const totalRevenue = billings.reduce((sum, b) => sum + b.totalMonthly, 0);
  const totalSeats = billings.reduce((sum, b) => sum + b.activeSeats, 0);

  if (isLoading) return <LoadingSpinner className="h-64" text="Carregando faturamento..." />;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Receita Mensal Total</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalRevenue.toFixed(2)} EUR</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Assentos Ativos</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalSeats}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Workspaces Ativos</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{billings.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Billing table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-gray-900 dark:text-white font-semibold">Faturamento por Gestor</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 font-medium">Workspace</th>
                <th className="px-4 py-3 font-medium">Gestor</th>
                <th className="px-4 py-3 font-medium text-right">Base</th>
                <th className="px-4 py-3 font-medium text-right">Assentos</th>
                <th className="px-4 py-3 font-medium text-right">Custo Assento</th>
                <th className="px-4 py-3 font-medium text-right">Total/Mês</th>
                <th className="px-4 py-3 font-medium text-center">Auto-Renovar</th>
                <th className="px-4 py-3 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {billings.map((b) => (
                <tr key={b.workspaceId} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{b.workspaceName}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.gestorName}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{b.basePrice.toFixed(2)} EUR</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{b.activeSeats}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{b.seatCost.toFixed(2)} EUR</td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-medium">{b.totalMonthly.toFixed(2)} EUR</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${b.autoRenew ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'}`}>
                      {b.autoRenew ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        api.post('/billing/manual-charge', { workspaceId: b.workspaceId });
                      }}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                    >
                      <CreditCard size={12} className="inline mr-1" />
                      Cobrar
                    </button>
                  </td>
                </tr>
              ))}
              {billings.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Nenhum workspace com assinatura ativa
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formula explanation */}
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <p className="text-xs text-gray-500">
          <strong className="text-gray-600 dark:text-gray-400">Fórmula:</strong> Total = Plano Base (5,00 EUR) + (Convites Ativos × 3,00 EUR)
        </p>
      </div>
    </div>
  );
}
