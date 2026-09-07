import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Plus, Trash2, AlertCircle, CheckCircle, RefreshCw, Store, Sparkles, ShieldCheck } from 'lucide-react';
import Pagination from './Pagination';

export default function CardManager() {
  const { activeStore } = useAuth();
  const [cards, setCards] = useState([]);
  const [name, setName] = useState('HUMOCARD');
  const [cardNumber, setCardNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  useEffect(() => {
    fetchCards();
  }, [activeStore]);

  const fetchCards = async () => {
    try {
      const url = activeStore ? `/api/cards?store_id=${activeStore.id}` : '/api/cards';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCards(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!cardNumber.trim()) {
      setError("Karta raqami kiritilishi shart");
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim().toUpperCase(),
          card_number: cardNumber.trim(),
          store_id: activeStore ? activeStore.id : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Karta qo`shishda xatolik');

      setSuccess('Karta muvaffaqiyatli qo`shildi!');
      setCardNumber('');
      fetchCards();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (id) => {
    if (!confirm('Kartani o`chirmoqchimisiz?')) return;
    try {
      const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCards();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const paginatedCards = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return cards.slice(start, start + pageSize);
  }, [cards, currentPage, pageSize]);

  const formatCardDisplayNumber = (num) => {
    const clean = num.replace(/\s+/g, '');
    if (clean.length === 16) {
      return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)} ${clean.slice(12, 16)}`;
    }
    return num;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Active Store Banner */}
      {activeStore ? (
        <div className="bg-gradient-to-r from-champion to-creole text-white rounded-2xl p-4 sm:p-5 shadow-xl border border-limeshade/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-limeshade/20 rounded-xl text-limeshade">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-300 font-mono uppercase tracking-wider">Do'kon Kartalari</p>
              <h2 className="text-lg sm:text-xl font-bold font-display text-white">{activeStore.name}</h2>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15 text-xs text-limeshade font-mono font-bold">
            Ushbu do'kon uchun kartalar
          </div>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-600 dark:text-amber-400 font-medium">
          ⚠️ Do'kon tanlanmagan. Kartalaringizni alohida do'konlarga biriktirish uchun yuqoridan do'kon tanlang.
        </div>
      )}

      {/* Add Card Form */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-champion/10 dark:bg-limeshade/10 rounded-2xl text-champion dark:text-limeshade">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-display font-black text-gray-900 dark:text-white">Yangi Bank Kartasi Qo'shish</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">HUMO / UZCARD to'lov kartalarini biriktiring</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleAddCard} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Karta Turi / Nomi</label>
            <select
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-gray-900 dark:text-gray-100 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-limeshade"
              value={name}
              onChange={(e) => setName(e.target.value)}
            >
              <option value="HUMO">HUMO</option>
              <option value="UZCARD">UZCARD</option>
              <option value="HUMOCARD">HUMOCARD</option>
              <option value="VISA">VISA / MASTERCARD</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Karta Raqami</label>
            <input
              type="text"
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-gray-900 dark:text-gray-100 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-limeshade"
              placeholder="8600 1234 5678 9012"
              maxLength={25}
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              required
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-champion dark:bg-limeshade text-limeshade dark:text-creole font-bold px-6 py-3 rounded-2xl flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50 text-sm hover:scale-[1.02]"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Karta Qo'shish
            </button>
          </div>
        </form>
      </div>

      {/* Cards Visual Grid List */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-champion dark:text-limeshade" /> Faol Bank Kartalari ({cards.length})
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">To'lovlar avtomatik ushbu kartalarga taqsimlanadi</p>
          </div>
          <button
            onClick={fetchCards}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
            title="Yangilash"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {cards.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm font-medium">
            Ushbu do'konga karta biriktirilmagan. (Aks holda default rejimda barcha tushumlar qabul qilinadi).
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCards.map((c) => {
              const isHumo = c.name.includes('HUMO');
              return (
                <div
                  key={c.id}
                  className={`relative overflow-hidden rounded-3xl p-6 shadow-xl border transition-all duration-300 hover:scale-[1.03] ${
                    isHumo
                      ? 'bg-gradient-to-br from-champion via-champion-card to-masterpiece text-white border-limeshade/30'
                      : 'bg-gradient-to-br from-creole via-creole-light to-champion text-white border-lavender/30'
                  }`}
                >
                  {/* Subtle Background Pattern */}
                  <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />

                  {/* Top Header: Brand & Delete */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-black text-sm tracking-wider uppercase text-limeshade">
                        {c.name}
                      </span>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <button
                      onClick={() => handleDeleteCard(c.id)}
                      className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white/80 hover:text-white transition backdrop-blur-md"
                      title="Kartani o'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Chip Icon Graphic */}
                  <div className="w-10 h-7 rounded-md bg-amber-400/90 border border-amber-200/50 mb-6 flex items-center justify-center shadow-inner">
                    <div className="w-8 h-4 border border-amber-700/40 rounded-sm" />
                  </div>

                  {/* Card Number */}
                  <div className="font-mono text-lg font-bold tracking-widest text-white mb-6">
                    {formatCardDisplayNumber(c.card_number)}
                  </div>

                  {/* Cardholder Footer */}
                  <div className="flex justify-between items-end text-[10px] uppercase font-mono text-gray-300">
                    <div>
                      <span className="block text-gray-400 text-[9px]">Do'kon</span>
                      <span className="font-bold text-limeshade truncate max-w-[140px] block">
                        {activeStore ? activeStore.name : "Umumiy Do'kon"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-gray-400 text-[9px]">Holat</span>
                      <span className="font-bold text-emerald-400">FAOL</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalItems={cards.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
        />
      </div>
    </div>
  );
}
