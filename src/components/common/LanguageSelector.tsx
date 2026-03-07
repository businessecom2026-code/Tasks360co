import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { LOCALES, LOCALE_CODES, type LocaleCode } from '../../lib/i18n/locales';

export function LanguageSelector() {
  const { locale, setLocale } = useLocaleStore();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const current = LOCALES[locale];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition-colors
          dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800
          text-gray-500 hover:text-gray-900 hover:bg-gray-200"
        aria-label="Language"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline text-xs font-medium">{locale.split('-')[0].toUpperCase()}</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1 max-h-80 overflow-y-auto
          animate-in fade-in slide-in-from-top-1 duration-150">
          {LOCALE_CODES.map((code: LocaleCode) => {
            const loc = LOCALES[code];
            const isActive = code === locale;
            return (
              <button
                key={code}
                onClick={() => {
                  setLocale(code);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-3 px-3 py-2 w-full text-left text-sm transition-colors
                  ${isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
              >
                <span className="text-base leading-none">{loc.flag}</span>
                <span className="flex-1">{loc.label}</span>
                {isActive && <Check size={14} className="text-blue-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
