import { useEffect, useState } from 'react';
import { Users, Shield, UserPlus, Trash2, Check, X as XIcon } from 'lucide-react';
import { api } from '../../lib/api';
import type { Membership } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';

export function UserManagement() {
  const [members, setMembers] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      const res = await api.get<Membership[]>('/workspaces/members');
      if (res.success && res.data) {
        setMembers(res.data);
      }
      setIsLoading(false);
    };
    fetchMembers();
  }, []);

  const handleRemove = async (membershipId: string) => {
    const res = await api.delete(`/workspaces/members/${membershipId}`);
    if (res.success) {
      setMembers((prev) => prev.filter((m) => m.id !== membershipId));
    }
  };

  const roleLabels: Record<string, string> = {
    GESTOR: 'Gestor',
    COLABORADOR: 'Colaborador',
    CLIENTE: 'Cliente',
  };

  const roleBadgeColors: Record<string, string> = {
    GESTOR: 'bg-purple-900/40 text-purple-400',
    COLABORADOR: 'bg-blue-900/40 text-blue-400',
    CLIENTE: 'bg-gray-700 text-gray-300',
  };

  if (isLoading) return <LoadingSpinner className="h-64" text="Carregando membros..." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-blue-400" />
          <h3 className="text-white font-semibold">Membros do Workspace</h3>
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
            {members.length}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                {member.user?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-sm text-white">{member.user?.name || member.invitedEmail || 'Pendente'}</p>
                <p className="text-xs text-gray-500">{member.user?.email || member.invitedEmail}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded ${roleBadgeColors[member.roleInWorkspace] || 'bg-gray-700 text-gray-300'}`}>
                {member.roleInWorkspace === 'GESTOR' && <Shield size={10} className="inline mr-1" />}
                {roleLabels[member.roleInWorkspace] || member.roleInWorkspace}
              </span>

              <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
                member.inviteAccepted
                  ? 'bg-green-900/40 text-green-400'
                  : 'bg-yellow-900/40 text-yellow-400'
              }`}>
                {member.inviteAccepted ? <Check size={10} /> : <UserPlus size={10} />}
                {member.inviteAccepted ? 'Ativo' : 'Pendente'}
              </span>

              <span className="text-xs text-gray-500">
                {member.costPerSeat.toFixed(2)} EUR/mês
              </span>

              <button
                onClick={() => handleRemove(member.id)}
                className="text-gray-500 hover:text-red-400 transition-colors"
                title="Remover membro"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <XIcon size={24} className="mx-auto mb-2" />
            Nenhum membro encontrado
          </div>
        )}
      </div>
    </div>
  );
}
