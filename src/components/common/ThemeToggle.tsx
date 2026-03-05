import { useEffect, useState, useCallback } from 'react';
import { Sun, Moon } from 'lucide-react';

export function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggle = useCallback(() => setIsDark((prev) => !prev), []);

  return { isDark, toggle };
}

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
