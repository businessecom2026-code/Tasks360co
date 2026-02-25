import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Search, Shield, Building, Mail } from 'lucide-react';

// Tipos de Dados
type UserRole = 'SUPER_ADMIN' | 'ADMIN_EMPRESA' | 'USUARIO';
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company_tenant: string;
  avatar: string;
}

interface UserManagementProps {
  currentUser: { id: string; email: string; company_tenant: string; };
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estado do Formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('USUARIO');
  const [companyTenant, setCompanyTenant] = useState(currentUser.email === 'admin@ecom360.co' ? '' : currentUser.company_tenant);

  const isSuperAdmin = currentUser.email === 'admin@ecom360.co';

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        // A rota da API respeitará o tenant_id no backend
        const response = await fetch('/api/users');
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Falha ao buscar usuários:', error);
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const newUser = { name, email, password, role, company_tenant: companyTenant };
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (response.ok) {
        const savedUser = await response.json();
        setUsers(prev => [...prev, savedUser]);
        // Limpar formulário
        setName(''); setEmail(''); setPassword('');
        if (isSuperAdmin) setCompanyTenant('');
      } else {
        alert('Falha ao criar usuário.');
      }
    } catch (error) {
      console.error('Erro ao adicionar usuário:', error);
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

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Formulário */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2"><UserPlus size={18} className="text-teal-600" /><h3 className="font-bold text-gray-700">Novo Usuário</h3></div>
        <form onSubmit={handleAddUser} className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome Completo" className="w-full p-2 border rounded-lg" required />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" className="w-full p-2 border rounded-lg" required />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha Provisória" className="w-full p-2 border rounded-lg" required />
            <input type="text" value={companyTenant} onChange={e => setCompanyTenant(e.target.value)} placeholder="Empresa (Tenant)" disabled={!isSuperAdmin} className="w-full p-2 border rounded-lg disabled:bg-gray-100" required />
            <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full p-2 border rounded-lg bg-white">
                {isSuperAdmin && <option value="SUPER_ADMIN">SUPER ADMIN</option>}
                <option value="ADMIN_EMPRESA">Admin da Empresa</option>
                <option value="USUARIO">Usuário</option>
            </select>
            <button type="submit" className="w-full bg-teal-600 text-white font-bold py-2 rounded-lg hover:bg-teal-700 transition md:col-start-2 lg:col-start-3">Adicionar</button>
        </form>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center"><h3 className="font-bold text-gray-700">Usuários</h3><div className="relative w-full md:w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 p-1.5 text-sm border rounded-lg"/></div></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase font-bold"><th className="px-6 py-3">Usuário</th><th className="px-6 py-3">Empresa</th><th className="px-6 py-3">Cargo</th><th className="px-6 py-3 text-right">Ações</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (<tr><td colSpan={4} className="p-12 text-center text-gray-500">Carregando...</td></tr>) : 
              filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 flex items-center gap-3"><img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name.replace(' ','+')}&background=random`} alt={user.name} className="w-8 h-8 rounded-full" /><div><p className="font-bold text-gray-800">{user.name}</p><p className="text-sm text-gray-500">{user.email}</p></div></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.company_tenant}</td>
                  <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4 text-right"><button className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50"><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
