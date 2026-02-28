import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { BillingDashboard } from '../components/admin/BillingDashboard';
import { UserManagement } from '../components/admin/UserManagement';
import { InviteModal } from '../components/workspace/InviteModal';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { UserPlus } from 'lucide-react';

type Tab = 'billing' | 'members';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('billing');
  const [showInvite, setShowInvite] = useState(false);
  const { currentWorkspace } = useWorkspaceStore();

  const tabs: { id: Tab; label: string }[] = [
    { id: 'billing', label: 'Faturamento' },
    { id: 'members', label: 'Membros' },
  ];

  return (
    <>
      <Header title="Administração" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Tab bar + invite button */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus size={16} /> Convidar
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'billing' && <BillingDashboard />}
        {activeTab === 'members' && <UserManagement />}
      </div>

      {/* Invite modal */}
      <InviteModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        workspaceId={currentWorkspace?.id || ''}
      />
    </>
  );
}
