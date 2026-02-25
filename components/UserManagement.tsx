import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { UserPlus, Trash2, Search } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, setUsers, currentUser }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('COLLABORATOR');
  const [companyTenant, setCompanyTenant] = useState(currentUser.role === 'SUPER_ADMIN' ? '' : currentUser.company);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (currentUser.email === 'admin@ecom360.co' || currentUser.role === 'SUPER_ADMIN') {
      return matchesSearch;
    }
    return matchesSearch && user.company === currentUser.company;
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: `user_${Date.now()}`,
      name: fullName,
      email,
      role,
      company: companyTenant,
      avatar: '',
    };
    // NOTE: In a real app, this would be an API call.
    // IMPORTANT: No passwords or sensitive data are logged.
    setUsers(prev => [...prev, newUser]);
    setFullName('');
    setEmail('');
    if (currentUser.role === 'SUPER_ADMIN') setCompanyTenant('');
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser.id) {
      alert('Você não pode excluir seu próprio usuário.');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
        setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const roles: Record<UserRole, {label: string, className: string}> = {
        SUPER_ADMIN: { label: 'SUPER_ADMIN', className: 'bg-purple-100 text-purple-700' },
        ADMIN: { label: 'Admin da Empresa', className: 'bg-blue-100 text-blue-700' },
        COLLABORATOR: { label: 'Colaborador', className: 'bg-green-100 text-green-700' },
        CLIENT: { label: 'Cliente', className: 'bg-orange-100 text-orange-700' }
    };
    const roleInfo = roles[role] || { label: role, className: 'bg-gray-100 text-gray-700' };
    return <span className={`px-2 py-1 text-xs font-bold rounded-full ${roleInfo.className}`}>{roleInfo.label}</span>;
  };

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <UserPlus size={18} className="text-teal-600" />
          <h3 className="font-bold text-gray-700">Adicionar Novo Usuário</h3>
        </div>
        <form onSubmit={handleAddUser} className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nome Completo" className="w-full p-2 border border-gray-300 rounded-lg" required />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" className="w-full p-2 border border-gray-300 rounded-lg" required />
          <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full p-2 border border-gray-300 rounded-lg bg-white">
            {currentUser.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
            <option value="ADMIN">Admin da Empresa</option>
            <option value="COLLABORATOR">Colaborador</option>
            <option value="CLIENT">Cliente</option>
          </select>
          <input type="text" value={companyTenant} onChange={e => setCompanyTenant(e.target.value)} placeholder="Empresa (Tenant)" disabled={currentUser.role !== 'SUPER_ADMIN'} className="w-full p-2 border border-gray-300 rounded-lg disabled:bg-gray-100" required />
          <button type="submit" className="w-full bg-teal-600 text-white font-bold py-2 rounded-lg hover:bg-teal-700 transition col-span-1 md:col-span-2 lg:col-span-4">Criar Usuário</button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
         <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
           <h3 className="font-bold text-gray-700">Usuários do Sistema</h3>
           <div className="relative w-full md:w-72">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input type="text" placeholder="Buscar por nome ou e-mail..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 p-1.5 text-sm border border-gray-300 rounded-lg"/>
           </div>
         </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                <th className="px-6 py-3">Usuário</th>
                <th className="px-6 py-3">Empresa (Tenant)</th>
                <th className="px-6 py-3">Cargo</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-800">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.company}</td>
                  <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDeleteUser(user.id)} className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                 <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">Nenhum usuário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
