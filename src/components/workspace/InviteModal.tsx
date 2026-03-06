import { useState, useEffect, useRef } from 'react';
import { X, Send, CreditCard, Loader2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

type Step = 'form' | 'checkout' | 'polling' | 'success' | 'failed';

export function InviteModal({ isOpen, onClose, workspaceId }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'COLABORADOR' | 'CLIENTE'>('COLABORADOR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [orderId, setOrderId] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const handleInvite = async () => {
    if (!email.trim()) {
      setError('E-mail obrigatório');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const res = await api.post<{ checkoutUrl?: string; membership?: { revolutOrderId?: string } }>(
      '/workspaces/invite',
      { workspaceId, email: email.trim(), roleInWorkspace: role }
    );

    setIsSubmitting(false);

    if (res.success && res.data?.checkoutUrl) {
      const url = res.data.checkoutUrl;
      const oid = res.data.membership?.revolutOrderId || '';
      setCheckoutUrl(url);
      setOrderId(oid);

      // If real Revolut URL or stub success URL, redirect
      if (url.includes('revolut.com') || url.includes('checkout.revolut.com')) {
        window.open(url, '_blank');
        setStep('polling');
        startPolling(oid);
      } else if (url.includes('stub=true') || url.includes('stub_checkout')) {
        // Stub mode: simulate immediate success
        setStep('success');
      } else {
        window.open(url, '_blank');
        setStep('checkout');
      }
    } else if (res.success) {
      setStep('success');
    } else {
      setError(res.error || 'Erro ao enviar convite');
    }
  };

  const startPolling = (oid: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    let attempts = 0;
    const maxAttempts = 60; // 5 minutes (every 5s)

    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts >= maxAttempts) {
        if (pollRef.current) clearInterval(pollRef.current);
        setStep('failed');
        setError('Tempo limite excedido. O pagamento pode ainda ser processado via webhook.');
        return;
      }

      const statusRes = await api.get<{ paymentStatus: string; inviteAccepted: boolean }>(
        `/billing/checkout-status/${oid}`
      );

      if (statusRes.success && statusRes.data) {
        if (statusRes.data.paymentStatus === 'PAID') {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep('success');
        } else if (statusRes.data.paymentStatus === 'FAILED') {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep('failed');
          setError('O pagamento falhou. Tente novamente.');
        }
      }
    }, 5000);
  };

  const handleClose = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setEmail('');
    setRole('COLABORADOR');
    setStep('form');
    setError('');
    setCheckoutUrl('');
    setOrderId('');
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
          {/* Step 1: Form */}
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

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-sm">
                  <CreditCard size={16} />
                  <span className="font-medium">Custo: 3,00 EUR/mês por assento</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Será gerado um checkout Revolut. O convite só é ativado após a confirmação do pagamento.
                </p>
              </div>

              {error && (
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              )}

              <button
                onClick={handleInvite}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Gerar Checkout e Convidar
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Checkout opened — user redirected to Revolut */}
          {step === 'checkout' && (
            <div className="text-center py-6 space-y-3">
              <CreditCard size={40} className="mx-auto text-blue-500" />
              <h3 className="text-gray-900 dark:text-white font-medium">Checkout Revolut Aberto</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Complete o pagamento na janela aberta. Após a confirmação, o convite será ativado automaticamente.
              </p>
              {checkoutUrl && (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  <ExternalLink size={14} />
                  Reabrir checkout
                </a>
              )}
              <div className="pt-2">
                <button
                  onClick={() => { setStep('polling'); startPolling(orderId); }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                >
                  Já paguei — verificar status
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Polling — waiting for webhook confirmation */}
          {step === 'polling' && (
            <div className="text-center py-6 space-y-3">
              <Loader2 size={40} className="mx-auto text-blue-500 animate-spin" />
              <h3 className="text-gray-900 dark:text-white font-medium">Aguardando Confirmação</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Verificando pagamento junto à Revolut... Isso pode levar alguns segundos.
              </p>
              {checkoutUrl && (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  <ExternalLink size={14} />
                  Reabrir checkout
                </a>
              )}
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={24} className="text-green-600 dark:text-white" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-medium">Convite Ativado!</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Pagamento confirmado. O membro <strong className="text-gray-900 dark:text-white">{email}</strong> agora tem acesso ao workspace.
              </p>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm transition-colors"
              >
                Fechar
              </button>
            </div>
          )}

          {/* Step 5: Failed */}
          {step === 'failed' && (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-600/20 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={24} className="text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-medium">Pagamento não Confirmado</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {error || 'Não foi possível confirmar o pagamento. Tente novamente.'}
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => { setStep('form'); setError(''); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  Tentar Novamente
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
