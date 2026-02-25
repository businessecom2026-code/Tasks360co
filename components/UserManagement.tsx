import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Plus, X, Save, Building2, UserCircle, Shield, Mail } from 'lucide-react';

interface UserManagementProps {
  currentUser: User;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser, users, setUsers }) => {
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    company: '',
    role: 'COLLABORATOR' as UserRole
  });
  const [loading, setLoading] = useState(false);

  // Filter users based on role
  const filteredUsers = currentUser.role === 'SUPER_ADMIN' 
    ? users 
    : users.filter(u => u.company === currentUser.company);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.company) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao criar usuário');
      }

      const createdUser = await res.json();
      setUsers(prev => [...prev, createdUser]);
      setIsAddingUser(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        company: '',
        role: 'COLLABORATOR'
      });
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'ADMIN': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'MANAGER': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'COLLABORATOR': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'CLIENT': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Usuários & Empresas</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {currentUser.role === 'SUPER_ADMIN' 
              ? 'Painel exclusivo do Super Admin' 
              : `Gerenciando usuários de ${currentUser.company}`}
          </p>
        </div>
        
        {!isAddingUser && (
          <button 
            onClick={() => setIsAddingUser(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={18} /> Novo Usuário
          </button>
        )}
      </div>

      {isAddingUser && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Adicionar Novo Usuário</h3>
            <button onClick={() => setIsAddingUser(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Nome Completo</label>
              <input 
                type="text" 
                name="name"
                value={newUser.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">E-mail</label>
              <input 
                type="email" 
                name="email"
                value={newUser.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                placeholder="Ex: joao@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Senha Provisória</label>
              <input 
                type="password" 
                name="password"
                value={newUser.password}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Empresa (Tenant)</label>
              <input 
                type="text" 
                name="company"
                value={newUser.company}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                placeholder="Ex: Ecom360, Cliente X"
                disabled={currentUser.role !== 'SUPER_ADMIN'} // Only Super Admin can set company freely? Or maybe Admin can only add to their own company?
              />
              {currentUser.role !== 'SUPER_ADMIN' && (
                <p className="text-xs text-gray-500">Vinculado automaticamente à sua empresa.</p>
              )}
            </div>

            <div className="col-span-1 md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Cargo</label>
              <select 
                name="role"
                value={newUser.role}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
              >
                <option value="COLLABORATOR">Colaborador</option>
                <option value="MANAGER">Gerente</option>
                <option value="ADMIN">Admin da Empresa</option>
                <option value="CLIENT">Cliente (Visualização)</option>
                {currentUser.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
            <button 
              onClick={() => setIsAddingUser(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white font-medium transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSaveUser}
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Salvar Usuário'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Empresa</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold overflow-hidden shrink-0">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          user.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Building2 size={16} className="text-gray-400" />
                      <span className="font-medium">{user.company}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadgeColor(user.role)} flex items-center gap-1 w-fit`}>
                      <Shield size={12} />
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-teal-600 transition-colors opacity-0 group-hover:opacity-100">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Nenhum usuário encontrado.
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
