import React, { useState } from 'react';
import { LogIn } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // A chamada fetch usa um caminho relativo, sem domínio.
      // O proxy do Vite irá redirecionar esta chamada para o servidor na porta 3000.
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        // Login bem-sucedido
        // Aqui você pode redirecionar o usuário ou salvar o token de sessão
        window.location.href = '/dashboard'; // Exemplo de redirecionamento
      } else {
        const data = await response.json();
        setError(data.error || 'Credenciais inválidas.');
      }
    } catch (err) {
      setError('Falha na conexão com o servidor. Verifique o proxy e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-gray-800 rounded-xl shadow-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700 flex items-center gap-3">
          <LogIn className="text-teal-400" />
          <h2 className="text-xl font-bold text-white">Acessar Plataforma</h2>
        </div>
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="E-mail" 
            className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" 
            required 
          />
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="Senha" 
            className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" 
            required 
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-teal-600 text-white font-bold py-3 rounded-lg hover:bg-teal-700 transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          {error && (
            <div className="p-3 rounded-lg text-center font-bold bg-red-500/20 text-red-400">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
