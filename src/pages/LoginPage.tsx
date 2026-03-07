import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useLocaleStore } from '../stores/useLocaleStore';

export function LoginPage() {
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const { t } = useLocaleStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login(email, password);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Task<span className="text-blue-500">360</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">{t('auth.tagline')}</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{t('auth.login.emailLabel')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.login.emailPlaceholder')}
              required
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{t('auth.login.passwordLabel')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.login.passwordPlaceholder')}
              required
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
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
            <LogIn size={16} />
            {isLoading ? t('auth.login.submitting') : t('auth.login.submitButton')}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          {t('auth.login.noAccount')}{' '}
          <Link to="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
            {t('auth.login.createAccount')}
          </Link>
        </p>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-3">
          {t('common.copyrightShort', { year: new Date().getFullYear() })}
        </p>
      </div>
    </div>
  );
}
