import React, { useState, useEffect } from 'react';
import { Activity, Smartphone, CreditCard, Terminal, ShieldCheck, Zap } from 'lucide-react';
import SessionManager from './components/SessionManager';
import CardManager from './components/CardManager';
import PaymentDashboard from './components/PaymentDashboard';
import ApiSimulator from './components/ApiSimulator';

export default function App() {
  const [activeTab, setActiveTab] = useState('payments');
  const [sessionCount, setSessionCount] = useState(0);
  const [cardCount, setCardCount] = useState(0);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const [resSess, resCards] = await Promise.all([
        fetch('/api/sessions'),
        fetch('/api/cards'),
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
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/30">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-wide">PayProvider</h1>
                <p className="text-xs text-gray-400">Telegram Payment Monitoring Provider API</p>
              </div>
            </div>

            {/* Top Quick Status */}
            <div className="hidden sm:flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-gray-300">FastAPI API Active</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700">
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-gray-300">{sessionCount} Sessiyalar</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700">
                <CreditCard className="w-3.5 h-3.5 text-green-400" />
                <span className="text-gray-300">{cardCount} Kartalar</span>
              </div>
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
            <Activity className="w-4 h-4" /> To'lovlar Monitoringi
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'sessions'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Smartphone className="w-4 h-4" /> Telegram Sessiyalari
          </button>

          <button
            onClick={() => setActiveTab('cards')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'cards'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Kartalar Boshqaruvi
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Terminal className="w-4 h-4" /> API Tester / Simulator
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'payments' && <PaymentDashboard />}
          {activeTab === 'sessions' && <SessionManager />}
          {activeTab === 'cards' && <CardManager />}
          {activeTab === 'simulator' && <ApiSimulator />}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 py-4 text-center text-xs text-gray-500">
        PayProvider Telegram Monitoring API System &copy; 2026. Telethon + FastAPI + ReactJS + MySQL.
      </footer>
    </div>
  );
}
