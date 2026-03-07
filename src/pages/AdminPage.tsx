import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { BillingDashboard } from '../components/admin/BillingDashboard';
import { UserManagement } from '../components/admin/UserManagement';
import { InviteModal } from '../components/workspace/InviteModal';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useLocaleStore } from '../stores/useLocaleStore';
import { UserPlus } from 'lucide-react';

type Tab = 'billing' | 'members';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [showInvite, setShowInvite] = useState(false);
  const { currentWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();
  const { t } = useLocaleStore();

  const workspaceRole = currentWorkspace?.membership?.roleInWorkspace;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isGestor = workspaceRole === 'GESTOR';
  const isCliente = workspaceRole === 'CLIENTE' && !isSuperAdmin;
  const canSeeTabs = isSuperAdmin || isGestor;
  // Only SUPER_ADMIN has the global Faturamento tab
  const canSeeBilling = isSuperAdmin;

  const tabs: { id: Tab; label: string }[] = [
    ...(canSeeBilling ? [{ id: 'billing' as Tab, label: t('admin.tabs.billing') }] : []),
    { id: 'members' as Tab, label: t('admin.tabs.members') },
  ];

  return (
    <>
      <Header title={t('admin.title')} />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* CLIENTE view: only invite button, no tabs */}
        {isCliente && !canSeeTabs ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <p className="text-gray-400 text-sm">
              {t('admin.clienteHint')}
            </p>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <UserPlus size={16} /> {t('admin.addGuest')}
            </button>
          </div>
        ) : (
          <>
            {/* Tab bar + invite button */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-800">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
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
                <UserPlus size={16} /> {t('admin.invite')}
              </button>
            </div>

            {/* Tab content */}
            {activeTab === 'billing' && canSeeBilling && <BillingDashboard />}
            {activeTab === 'members' && <UserManagement />}
          </>
        )}
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
