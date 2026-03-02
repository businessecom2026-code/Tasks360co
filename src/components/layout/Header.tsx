import { Bell, Search } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

interface Props {
  title: string;
}

export function Header({ title }: Props) {
  const { currentWorkspace } = useWorkspaceStore();

  return (
    <header className="h-14 md:h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 md:px-6 shrink-0">
      <div>
        <h2 className="text-base md:text-lg font-semibold text-white">{title}</h2>
        {currentWorkspace && (
          <p className="text-xs text-gray-500">{currentWorkspace.name}</p>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="relative hidden sm:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar..."
            className="bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-48"
          />
        </div>

        <button className="sm:hidden text-gray-400 hover:text-white transition-colors p-2">
          <Search size={18} />
        </button>

        <button className="relative text-gray-400 hover:text-white transition-colors p-2">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
