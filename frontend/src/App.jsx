import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Activity, Smartphone, CreditCard, Terminal, Zap, Store as StoreIcon, LogIn, LogOut, ChevronDown, Plus, Moon, Sun, Layers } from 'lucide-react';
import SessionManager from './components/SessionManager';
import CardManager from './components/CardManager';
import PaymentDashboard from './components/PaymentDashboard';
import ApiSimulator from './components/ApiSimulator';
import StoreManager from './components/StoreManager';
import AuthModal from './components/AuthModal';
import ThemeToggle from './components/ThemeToggle';

function MainApp() {
  const { user, stores, activeStore, selectStore, logout } = useAuth();
  const [sessionCount, setSessionCount] = useState(0);
  const [cardCount, setCardCount] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [activeStore]);

  const fetchStats = async () => {
    try {
      const storeParam = activeStore ? `?store_id=${activeStore.id}` : '';
      const [resSess, resCards] = await Promise.all([
        fetch(`/api/sessions${storeParam}`),
        fetch(`/api/cards${storeParam}`),
      ]);
      if (resSess.ok) {
        const sess = await resSess.json();
        setSessionCount(sess.length);
      }
      if (resCards.ok) {
        const cards = await resCards.json();
        setCardCount(cards.length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
      isActive
        ? 'bg-champion text-limeshade dark:bg-limeshade dark:text-creole shadow-md shadow-limeshade/10 scale-[1.02] font-bold'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200/60 dark:hover:bg-gray-900'
    }`;

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300">
      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Top Editorial Header */}
      <header className="bg-white/80 dark:bg-gray-950/80 border-b border-gray-200/80 dark:border-gray-800/80 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Brand Logo */}
            <NavLink to="/main" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-champion dark:bg-limeshade text-limeshade dark:text-creole flex items-center justify-center shadow-lg shadow-limeshade/20 group-hover:scale-105 transition-transform duration-200">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h1 className="text-xl font-display font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                  PayProvider <span className="bg-limeshade/20 text-champion dark:bg-limeshade dark:text-creole text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-limeshade/40">PRO v2.5</span>
                </h1>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Telegram Payment Monitoring & SaaS</p>
              </div>
            </NavLink>

            {/* Middle Store Selector (For Logged in Users) */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setStoreMenuOpen(!storeMenuOpen)}
                  className="flex items-center gap-2.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 px-3.5 py-2 rounded-xl text-xs font-semibold hover:border-limeshade/50 transition-all shadow-sm"
                >
                  <StoreIcon className="w-4 h-4 text-champion dark:text-limeshade" />
                  <span className="max-w-[130px] truncate">{activeStore ? activeStore.name : "Do'kon Tanlanmagan"}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${storeMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {storeMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl py-2 z-50 text-xs">
                    <div className="px-4 py-2 text-gray-400 font-mono font-bold uppercase text-[10px] border-b border-gray-100 dark:border-gray-800/80">
                      Do'konlarim ({stores.length})
                    </div>
                    <div className="max-h-48 overflow-y-auto py-1">
                      {stores.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => { selectStore(s); setStoreMenuOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 flex items-center justify-between transition ${
                            activeStore && activeStore.id === s.id
                              ? 'text-champion dark:text-limeshade font-bold bg-limeshade/10 dark:bg-limeshade/10'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <span className="truncate">{s.name}</span>
                          {activeStore && activeStore.id === s.id && (
                            <span className="w-2 h-2 rounded-full bg-champion dark:bg-limeshade"></span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-800/80 pt-1 mt-1">
                      <button
                        onClick={() => { navigate('/stores'); setStoreMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-champion dark:text-limeshade hover:bg-limeshade/20 flex items-center gap-2 font-bold"
                      >
                        <Plus className="w-4 h-4" /> Yangi Do'kon Qo'shish
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Right Controls: Theme Toggle & User Account */}
            <div className="flex items-center gap-3">
              <ThemeToggle />

              {user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden md:block text-right">
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-tight">{user.full_name || user.email}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">{user.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                    title="Tizimdan chiqish"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="bg-champion dark:bg-limeshade text-limeshade dark:text-creole text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:scale-105 transition-all flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" /> Kirish / Ro'yxatdan O'tish
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Navigation Subheader / Domain URLs Navigation */}
      <div className="bg-white/50 dark:bg-gray-950/50 border-b border-gray-200/60 dark:border-gray-800/60 py-2 sticky top-16 sm:top-20 z-30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1">
            <NavLink to="/main" className={navLinkClass}>
              <Activity className="w-4 h-4" /> To'lovlar
            </NavLink>
            <NavLink to="/stores" className={navLinkClass}>
              <StoreIcon className="w-4 h-4" /> Do'konlar & API
            </NavLink>
            <NavLink to="/sessions" className={navLinkClass}>
              <Smartphone className="w-4 h-4" /> Telegram Sessiyalar
              <span className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold">
                {sessionCount}
              </span>
            </NavLink>
            <NavLink to="/cards" className={navLinkClass}>
              <CreditCard className="w-4 h-4" /> Kartalar
              <span className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold">
                {cardCount}
              </span>
            </NavLink>
            <NavLink to="/docs" className={navLinkClass}>
              <Terminal className="w-4 h-4" /> API Simulator & Docs
            </NavLink>
          </nav>
        </div>
      </div>

      {/* Page Content View Router */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/main" replace />} />
          <Route path="/main" element={<PaymentDashboard />} />
          <Route path="/stores" element={<StoreManager />} />
          <Route path="/sessions" element={<SessionManager />} />
          <Route path="/cards" element={<CardManager />} />
          <Route path="/docs" element={<ApiSimulator />} />
          <Route path="*" element={<Navigate to="/main" replace />} />
        </Routes>
      </main>

      {/* Editorial SaaS Footer */}
      <footer className="border-t border-gray-200/80 dark:border-gray-800/80 py-6 bg-white dark:bg-gray-950 text-xs text-gray-500 dark:text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-display font-bold text-gray-800 dark:text-gray-200">
            <Zap className="w-4 h-4 text-champion dark:text-limeshade" />
            <span>PayProvider SaaS Payment Engine &copy; 2026</span>
          </div>
          <div className="flex items-center gap-4 text-gray-500">
            <span>Domen: istep.uz</span>
            <span>•</span>
            <span>Barcha huquqlar himoyalangan</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
