import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Activity, Smartphone, CreditCard, Terminal, Zap, Store as StoreIcon, User, LogIn, LogOut, ChevronDown, Plus, ShieldCheck } from 'lucide-react';
import SessionManager from './components/SessionManager';
import CardManager from './components/CardManager';
import PaymentDashboard from './components/PaymentDashboard';
import ApiSimulator from './components/ApiSimulator';
import StoreManager from './components/StoreManager';
import AuthModal from './components/AuthModal';

function MainApp() {
  const { user, stores, activeStore, selectStore, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('payments');
  const [sessionCount, setSessionCount] = useState(0);
  const [cardCount, setCardCount] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Top Header */}
      <header className="bg-gray-850 border-b border-gray-700/80 sticky top-0 z-40 backdrop-blur-md bg-opacity-90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/20">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  PayProvider <span className="bg-blue-900/60 border border-blue-700 text-blue-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">SaaS</span>
                </h1>
                <p className="text-xs text-gray-400">Telegram Payment Provider Gateway</p>
              </div>
            </div>

            {/* Middle Store Selector */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setStoreMenuOpen(!storeMenuOpen)}
                  className="flex items-center gap-2 bg-gray-900 hover:bg-gray-750 border border-gray-700 text-gray-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition"
                >
                  <StoreIcon className="w-4 h-4 text-blue-400" />
                  <span className="max-w-[140px] truncate">{activeStore ? activeStore.name : "Do'kon Tanlanmagan"}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {storeMenuOpen && (
                  <div className="absolute left-0 mt-2 w-56 bg-gray-850 border border-gray-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs">
                    <div className="px-3 py-1.5 text-gray-400 font-bold uppercase text-[10px] border-b border-gray-700/60">
                      Mening Do'konlarim ({stores.length})
                    </div>
                    {stores.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { selectStore(s); setStoreMenuOpen(false); }}
                        className={`w-full text-left px-3.5 py-2 hover:bg-gray-700/50 flex items-center justify-between transition ${
                          activeStore && activeStore.id === s.id ? 'text-blue-400 font-bold bg-blue-950/30' : 'text-gray-200'
                        }`}
                      >
                        <span className="truncate">{s.name}</span>
                        {activeStore && activeStore.id === s.id && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                      </button>
                    ))}
                    <div className="border-t border-gray-700/60 mt-1 pt-1">
                      <button
                        onClick={() => { setActiveTab('stores'); setStoreMenuOpen(false); }}
                        className="w-full text-left px-3.5 py-2 text-blue-400 hover:bg-blue-950/40 flex items-center gap-2 font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" /> Yangi Do'kon Yaratish
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Right User Actions */}
            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-bold text-white leading-tight">{user.full_name || user.email}</p>
                    <p className="text-[10px] text-gray-400">{user.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 bg-gray-900 hover:bg-red-950/50 hover:text-red-400 border border-gray-700 text-gray-300 rounded-xl transition"
                    title="Tizimdan chiqish"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 transition"
                >
                  <LogIn className="w-4 h-4" /> Kirish / Ro'yxatdan O'tish
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-800 space-x-1 sm:space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'payments'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="w-4 h-4" /> To'lovlar
          </button>

          <button
            onClick={() => setActiveTab('stores')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'stores'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <StoreIcon className="w-4 h-4" /> Do'konlar & API Key
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'sessions'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Smartphone className="w-4 h-4" /> Telegram Sessiyalar ({sessionCount})
          </button>

          <button
            onClick={() => setActiveTab('cards')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'cards'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Kartalar ({cardCount})
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Terminal className="w-4 h-4" /> API Simulator & Docs
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'payments' && <PaymentDashboard />}
          {activeTab === 'stores' && <StoreManager />}
          {activeTab === 'sessions' && <SessionManager />}
          {activeTab === 'cards' && <CardManager />}
          {activeTab === 'simulator' && <ApiSimulator />}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-850 border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        PayProvider SaaS Telegram Payment Monitoring Gateway &copy; 2026. All rights reserved.
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
