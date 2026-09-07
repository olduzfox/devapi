import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-xl bg-gray-100 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all hover:scale-105 shadow-sm"
      aria-label="Rejimni almashtirish"
      title={theme === 'dark' ? "Yorug' rejimga o'tish" : "Tungi rejimga o'tish"}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-limeshade animate-spin-once transition-transform" />
        ) : (
          <Moon className="w-5 h-5 text-champion transition-transform" />
        )}
      </div>
    </button>
  );
}
