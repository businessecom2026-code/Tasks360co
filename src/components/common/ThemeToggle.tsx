import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo escuro'}
      className="p-2 rounded-lg transition-colors
        dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800
        text-gray-500 hover:text-gray-900 hover:bg-gray-200"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
