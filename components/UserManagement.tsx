import React, { useState } from 'react';
import { UserPlus, Trash2, Search } from 'lucide-react';

// Tipos de dados alinhados com as especificações
type UserRole = 'SUPER_ADMIN' | 'ADMIN_EMPRESA' | 'USUARIO';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  company_tenant: string;
}

interface UserManagementProps {
  // Simula o usuário logado e a lista de usuários
  currentUser: { email: string; company_tenant: string; };
  initialUsers: User[];
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser, initialUsers }) => {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado do formulário
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('USUARIO');
  const [companyTenant, setCompanyTenant] = useState(currentUser.email === 'admin@ecom360.co' ? '' : currentUser.company_tenant);

  const isSuperAdmin = currentUser.email === 'admin@ecom360.co';

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (isSuperAdmin) {
      return matchesSearch;
    }
    return matchesSearch && user.company_tenant === currentUser.company_tenant;
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: `user_${Date.now()}`,
      full_name: fullName,
      email,
      role,
      company_tenant: companyTenant,
    };
    // IMPORTANTE: Sem console.log de dados sensíveis.
    setUsers(prev => [...prev, newUser]);
    // Limpa o formulário após o envio
    setFullName('');
    setEmail('');
    if (isSuperAdmin) setCompanyTenant('');
  };

  const handleDeleteUser = (id: string) => {
    if (window.confirm('Tem certeza que deseja apagar este usuário?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const roles = {
      SUPER_ADMIN: { label: 'SUPER ADMIN', className: 'bg-purple-100 text-purple-700' },
      ADMIN_EMPRESA: { label: 'Admin da Empresa', className: 'bg-blue-100 text-blue-700' },
      USUARIO: { label: 'Usuário', className: 'bg-green-100 text-green-700' },
    };
    const { label, className } = roles[role];
    return <span className={`px-2 py-1 text-xs font-bold rounded-full ${className}`}>{label}</span>;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Formulário de Novo Usuário */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <UserPlus size={18} className="text-teal-600" />
          <h3 className="font-bold text-gray-700">Adicionar Novo Usuário</h3>
        </div>
        <form onSubmit={handleAddUser} className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nome Completo" className="w-full p-2 border rounded-lg" required />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" className="w-full p-2 border rounded-lg" required />
          <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full p-2 border rounded-lg bg-white">
            {isSuperAdmin && <option value="SUPER_ADMIN">SUPER ADMIN</option>}
            <option value="ADMIN_EMPRESA">Admin da Empresa</option>
            <option value="USUARIO">Usuário</option>
          </select>
          <input type="text" value={companyTenant} onChange={e => setCompanyTenant(e.target.value)} placeholder="Empresa (Tenant)" disabled={!isSuperAdmin} className="w-full p-2 border rounded-lg disabled:bg-gray-100" required />
          <button type="submit" className="w-full bg-teal-600 text-white font-bold py-2 rounded-lg hover:bg-teal-700 transition col-span-1 md:col-span-2 lg:col-span-4">Adicionar</button>
        </form>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-700">Usuários</h3>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 p-1.5 text-sm border rounded-lg"/>
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
                    <p className="font-bold text-gray-800">{user.full_name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.company_tenant}</td>
                  <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDeleteUser(user.id)} className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                 <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">Nenhum resultado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
