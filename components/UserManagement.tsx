import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Trash2, Plus, Building2, Shield, User as UserIcon } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, setUsers }) => {
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ADMIN' as UserRole,
    company: ''
  });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      avatar: '',
      ...newUser
    };
    
    // Optimistic Update
    setUsers([...users, user]);
    setShowForm(false);
    setNewUser({ name: '', email: '', password: '', role: 'ADMIN', company: '' });

    // API Call
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
    } catch (err) {
      console.error("Failed to add user", err);
      // Rollback logic could go here
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este usuário?')) {
      // Optimistic Update
      setUsers(users.filter(u => u.id !== id));
      
      // API Call
      try {
        await fetch(`/api/users/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error("Failed to delete user", err);
      }
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-black">Gestão de Usuários & Empresas</h2>
            <p className="text-gray-600 text-sm">Painel exclusivo do Super Admin</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-700 transition shadow-lg shadow-teal-600/20 font-medium"
        >
          <Plus size={18} /> Novo Usuário
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg animate-fade-in">
          <h3 className="font-bold text-lg mb-4 text-black">Adicionar Novo Usuário</h3>
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Nome Completo</label>
              <input required type="text" className="w-full border border-gray-300 rounded-lg p-2 text-black" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">E-mail</label>
              <input required type="email" className="w-full border border-gray-300 rounded-lg p-2 text-black" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Senha Provisória</label>
              <input required type="text" className="w-full border border-gray-300 rounded-lg p-2 text-black" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Empresa (Tenant)</label>
              <input required type="text" placeholder="Ex: Ecom360, Cliente X" className="w-full border border-gray-300 rounded-lg p-2 text-black" value={newUser.company} onChange={e => setNewUser({...newUser, company: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Cargo</label>
              <select className="w-full border border-gray-300 rounded-lg p-2 text-black" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}>
                <option value="ADMIN">Admin da Empresa</option>
                <option value="COLLABORATOR">Colaborador</option>
                <option value="CLIENT">Cliente (Visualizador)</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700">Salvar Usuário</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 border-b border-gray-200 text-gray-700 uppercase text-xs font-bold">
            <tr>
              <th className="p-4">Usuário</th>
              <th className="p-4">Empresa</th>
              <th className="p-4">Cargo</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 transition">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold">
                      {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full" /> : user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-black">{user.name}</div>
                      <div className="text-gray-600 text-xs">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-gray-800 font-medium">
                    <Building2 size={16} className="text-gray-500" /> {user.company}
                  </div>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                    user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                    user.role === 'ADMIN' ? 'bg-teal-100 text-teal-800 border-teal-200' :
                    'bg-gray-100 text-gray-800 border-gray-200'
                  }`}>
                    {user.role === 'SUPER_ADMIN' ? <Shield size={12}/> : <UserIcon size={12}/>}
                    {user.role}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {user.role !== 'SUPER_ADMIN' && (
                    <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition">
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;