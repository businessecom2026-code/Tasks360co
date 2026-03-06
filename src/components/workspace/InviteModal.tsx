import { useState } from 'react';
import { X, Send, CreditCard } from 'lucide-react';
import { api } from '../../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function InviteModal({ isOpen, onClose, workspaceId }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'COLABORADOR' | 'CLIENTE'>('COLABORADOR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleInvite = async () => {
    if (!email.trim()) {
      setError('E-mail obrigatório');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const res = await api.post<{ checkoutUrl?: string }>('/workspaces/invite', {
      workspaceId,
      email: email.trim(),
      roleInWorkspace: role,
    });

    setIsSubmitting(false);

    if (res.success && res.data?.checkoutUrl) {
      // If it's a real Revolut URL, redirect to checkout
      if (res.data.checkoutUrl.includes('revolut.com') || res.data.checkoutUrl.includes('checkout')) {
        window.open(res.data.checkoutUrl, '_blank');
      }
      setStep('payment');
    } else if (res.success) {
      setStep('success');
    } else {
      setError(res.error || 'Erro ao enviar convite');
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('COLABORADOR');
    setStep('form');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Convidar Membro</h2>
          <button onClick={handleClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {step === 'form' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colaborador@empresa.com"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Função</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'COLABORADOR' | 'CLIENTE')}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="COLABORADOR">Colaborador</option>
                  <option value="CLIENTE">Cliente</option>
                </select>
              </div>

              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-400 text-sm">
                  <CreditCard size={16} />
                  <span className="font-medium">Custo: 3,00 EUR/mês por assento</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Será gerado um checkout Revolut. O convite só é enviado após a confirmação do pagamento.
                </p>
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                onClick={handleInvite}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                <Send size={16} />
                {isSubmitting ? 'Processando...' : 'Gerar Checkout e Convidar'}
              </button>
            </div>
          )}

          {step === 'payment' && (
            <div className="text-center py-6 space-y-3">
              <CreditCard size={40} className="mx-auto text-blue-400" />
              <h3 className="text-gray-900 dark:text-white font-medium">Checkout Revolut Gerado</h3>
              <p className="text-gray-400 text-sm">
                Em produção, o gestor seria redirecionado para o checkout da Revolut.
                Após o pagamento, o convite será enviado automaticamente via webhook.
              </p>
              <button
                onClick={() => setStep('success')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
              >
                Simular Pagamento Aprovado
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto">
                <Send size={20} className="text-white" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-medium">Convite Enviado!</h3>
              <p className="text-gray-400 text-sm">
                Um e-mail de convite foi enviado para <strong className="text-white">{email}</strong>.
              </p>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm transition-colors"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
