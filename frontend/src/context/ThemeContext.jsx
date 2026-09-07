import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.className = "bg-gray-950 text-gray-100 antialiased selection:bg-limeshade selection:text-creole min-h-screen transition-colors duration-300 font-sans";
    } else {
      root.classList.remove('dark');
      document.body.className = "bg-dirtywhite text-gray-900 antialiased selection:bg-champion selection:text-white min-h-screen transition-colors duration-300 font-sans";
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
