import { useEffect } from 'react';
import { ChevronDown, Building2 } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useLocaleStore } from '../../stores/useLocaleStore';

export function WorkspaceSwitcher() {
  const { workspaces, currentWorkspace, fetchWorkspaces, switchWorkspace, isLoading } =
    useWorkspaceStore();
  const { t } = useLocaleStore();

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  if (isLoading) {
    return (
      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-500 animate-pulse">
        {t('workspace.switcher.loading')}
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-500">
        {t('workspace.switcher.empty')}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-3 py-2">
        <Building2 size={16} className="text-blue-400 shrink-0" />
        <select
          value={currentWorkspace?.id || ''}
          onChange={(e) => switchWorkspace(e.target.value)}
          className="bg-transparent text-gray-900 dark:text-white text-sm font-medium w-full appearance-none cursor-pointer focus:outline-none truncate"
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              {w.name}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="text-gray-400 shrink-0" />
      </div>
    </div>
  );
}
