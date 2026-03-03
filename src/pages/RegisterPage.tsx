import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { api } from '../lib/api';
import type { LoginResponse } from '../types';

export function RegisterPage() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setIsLoading(true);

    const res = await api.post<LoginResponse>('/auth/register', { name, email, password });

    if (res.success && res.data) {
      setSuccess(true);
      // Auto-login after registration
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      useAuthStore.setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      setTimeout(() => navigate('/dashboard'), 1500);
    } else {
      setError(res.error || 'Erro ao registrar');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Task<span className="text-blue-500">360</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Criar nova conta</p>
        </div>

        {success ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-green-600/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} className="text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Conta criada!</h3>
              <p className="text-gray-400 text-sm">
                A redirecionar para o dashboard...
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4"
          >
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Confirmar Senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              <UserPlus size={16} />
              {isLoading ? 'Criando conta...' : 'Criar Conta'}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-gray-500 hover:text-blue-400 transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft size={14} />
                Já tenho conta
              </Link>
            </div>
          </form>
        )}

        <p className="text-center text-xs text-gray-600 mt-4">
          Task360 Engine &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
