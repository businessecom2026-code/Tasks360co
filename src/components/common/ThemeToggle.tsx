import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return true; // dark por default
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

  // Aplica tema no mount sem flash
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (!stored || stored === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <button
      onClick={() => setIsDark((prev) => !prev)}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo escuro'}
      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 dark:hover:bg-gray-800 light:hover:bg-gray-100 transition-colors"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
