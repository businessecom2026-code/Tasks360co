import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';

export function CheckoutResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const isSuccess = location.pathname.includes('success');
  const isCancelled = location.pathname.includes('cancelled');
  const orderId = searchParams.get('order_id') || searchParams.get('orderId') || '';
  const isStub = searchParams.get('stub') === 'true';

  const [status, setStatus] = useState<'loading' | 'paid' | 'pending' | 'failed' | 'cancelled'>(
    isCancelled ? 'cancelled' : 'loading'
  );

  useEffect(() => {
    if (isCancelled) return;

    if (isStub) {
      setStatus('paid');
      return;
    }

    if (!orderId) {
      setStatus(isSuccess ? 'paid' : 'pending');
      return;
    }

    // Poll for payment confirmation
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes

    const check = async () => {
      const res = await api.get<{ paymentStatus: string }>(`/billing/checkout-status/${orderId}`);
      if (res.success && res.data) {
        if (res.data.paymentStatus === 'PAID') {
          setStatus('paid');
          return true;
        }
        if (res.data.paymentStatus === 'FAILED') {
          setStatus('failed');
          return true;
        }
      }
      return false;
    };

    const poll = async () => {
      const done = await check();
      if (done) return;

      const interval = setInterval(async () => {
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setStatus(isSuccess ? 'paid' : 'pending');
          return;
        }
        const done = await check();
        if (done) clearInterval(interval);
      }, 5000);

      return () => clearInterval(interval);
    };

    poll();
  }, [orderId, isSuccess, isCancelled, isStub]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg max-w-md w-full p-8 text-center space-y-4">

        {status === 'loading' && (
          <>
            <Loader2 size={48} className="mx-auto text-blue-500 animate-spin" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Verificando Pagamento...</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Aguarde enquanto confirmamos seu pagamento com a Revolut.
            </p>
          </>
        )}

        {status === 'paid' && (
          <>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={32} className="text-green-600 dark:text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Pagamento Confirmado!</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              O assento foi ativado com sucesso. O membro convidado já pode acessar o workspace.
            </p>
          </>
        )}

        {status === 'pending' && (
          <>
            <Loader2 size={48} className="mx-auto text-yellow-500 animate-spin" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Pagamento em Processamento</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Seu pagamento está sendo processado. O convite será ativado automaticamente após a confirmação.
            </p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-600/20 rounded-full flex items-center justify-center mx-auto">
              <XCircle size={32} className="text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Pagamento Falhou</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Não foi possível processar o pagamento. Tente novamente pelo painel de administração.
            </p>
          </>
        )}

        {status === 'cancelled' && (
          <>
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto">
              <XCircle size={32} className="text-gray-500 dark:text-gray-400" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Checkout Cancelado</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              O processo de pagamento foi cancelado. O convite permanece pendente e pode ser reprocessado.
            </p>
          </>
        )}

        <button
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar ao Painel
        </button>
      </div>
    </div>
  );
}
