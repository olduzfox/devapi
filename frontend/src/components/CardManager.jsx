import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Plus, Trash2, AlertCircle, CheckCircle, RefreshCw, Store } from 'lucide-react';

export default function CardManager() {
  const { activeStore } = useAuth();
  const [cards, setCards] = useState([]);
  const [name, setName] = useState('HUMOCARD');
  const [cardNumber, setCardNumber] = useState('8600123456789012');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          card_number: cardNumber.trim(),
          store_id: activeStore ? activeStore.id : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Karta qo`shishda xatolik');

      setSuccess('Karta muvaffaqiyatli qo`shildi!');
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

  return (
    <div className="space-y-6">
      {/* Active Store Banner */}
      {activeStore && (
        <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3 flex items-center gap-2 text-xs text-blue-200">
          <Store className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span>Hozirda <b>"{activeStore.name}"</b> do'koni uchun kartalarni boshqarayapsiz</span>
        </div>
      )}

      {/* Add Card Form */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-green-400 flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5" /> Karta Qo'shish (HUMO / UZCARD)
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 text-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleAddCard} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Karta Nomi / Turi</label>
            <input
              type="text"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
              placeholder="HUMOCARD / UZCARD"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Karta Raqami (To'liq raqam yoki 4 raqam)</label>
            <input
              type="text"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500 font-mono"
              placeholder="8600123456789012"
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
              className="w-full bg-green-600 hover:bg-green-500 text-white font-medium px-6 py-2 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Karta Qo'shish
            </button>
          </div>
        </form>
      </div>

      {/* Cards List */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Faol Kartalar Ro'yxati</h3>
          <button onClick={fetchCards} className="text-gray-400 hover:text-white p-1">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {cards.length === 0 ? (
          <p className="text-gray-400 text-sm">
            Hozircha kartalar qo'shilmagan. (Bo'sh bo'lsa barcha kelgan SMS/bot to'lovlari default rejimda qabul qilinadi).
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((c) => (
              <div
                key={c.id}
                className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4 flex justify-between items-center shadow"
              >
                <div>
                  <div className="text-xs text-gray-400 font-semibold">{c.name}</div>
                  <div className="text-sm font-mono font-bold text-white tracking-wider mt-1">
                    {c.card_number.length > 4 ? c.card_number : `•••• *${c.card_number}`}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteCard(c.id)}
                  className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-gray-700 transition"
                  title="Kartani o'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
