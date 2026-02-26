import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';

const UserRegistrationForm: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState<'Admin' | 'Colaborador'>('Colaborador');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      const response = await fetch('/api/admin/register-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, password, company, role }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Usuário cadastrado com sucesso!' });
        // Limpar formulário
        setFullName('');
        setEmail('');
        setPassword('');
        setCompany('');
        setRole('Colaborador');
      } else {
        setMessage({ type: 'error', text: data.error || 'Falha ao cadastrar usuário.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão. Tente novamente.' });
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-gray-800 rounded-xl shadow-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700 flex items-center gap-3">
          <UserPlus className="text-teal-400" />
          <h2 className="text-xl font-bold text-white">Cadastrar Novo Usuário</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nome Completo" className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" required />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" required />
          <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Empresa (Company)" className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" required />
          <select value={role} onChange={e => setRole(e.target.value as 'Admin' | 'Colaborador')} className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="Colaborador">Colaborador</option>
            <option value="Admin">Admin</option>
          </select>
          <button type="submit" className="w-full bg-teal-600 text-white font-bold py-3 rounded-lg hover:bg-teal-700 transition-transform transform hover:scale-105">Cadastrar</button>
          {message && (
            <div className={`p-3 rounded-lg text-center font-bold ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {message.text}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default UserRegistrationForm;
