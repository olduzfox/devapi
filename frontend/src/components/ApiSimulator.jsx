import React, { useState } from 'react';
import { Terminal, Play, Search, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ApiSimulator() {
  // Create Payment State
  const [createAmount, setCreateAmount] = useState(100000);
  const [createResult, setCreateResult] = useState(null);
  const [createError, setCreateError] = useState('');

  // Status Check State
  const [checkId, setCheckId] = useState('');
  const [statusResult, setStatusResult] = useState(null);

  // Telegram Message Simulator State
  const [simText, setSimText] = useState(
    "HumoCard bot\nTo'ldirish: 100.000,00 UZS\n💳 *4271\nSana: 07.09.2026 11:42"
  );
  const [simResult, setSimResult] = useState(null);

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    setCreateResult(null);
    setCreateError('');

    try {
      const formData = new FormData();
      formData.append('amount', createAmount);

      const res = await fetch('/create', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'To`lov yaratishda xatolik');

      setCreateResult(data);
      if (data.payment_id) {
        setCheckId(data.payment_id);
      }
    } catch (err) {
      setCreateError(err.message);
    }
  };

  const handleCheckStatus = async (e) => {
    e.preventDefault();
    setStatusResult(null);

    try {
      const res = await fetch(`/status/${checkId.trim()}`);
      const data = await res.json();
      setStatusResult(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateTelegram = async (e) => {
    e.preventDefault();
    setSimResult(null);

    try {
      const res = await fetch('/api/simulate-telegram-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: simText }),
      });
      const data = await res.json();
      setSimResult(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Create Payment API Test */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Play className="w-5 h-5 text-green-400" /> 1. To'lov Yaratish (POST /create)
          </h3>

          <form onSubmit={handleCreatePayment} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">To'lov Summasi (amount)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white font-bold focus:outline-none focus:border-green-500"
                  value={createAmount}
                  onChange={(e) => setCreateAmount(parseInt(e.target.value) || 0)}
                  required
                />
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-500 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition"
                >
                  <Play className="w-4 h-4" /> Yaratish
                </button>
              </div>
            </div>
          </form>

          {createError && (
            <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-lg text-sm">
              {createError}
            </div>
          )}

          {createResult && (
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 border border-gray-700 overflow-x-auto">
              <pre>{JSON.stringify(createResult, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* 2. Check Status API Test */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-400" /> 2. Holatni Tekshirish (GET /status/{'{payment_id}'})
          </h3>

          <form onSubmit={handleCheckStatus} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Payment ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  placeholder="payment_id kiring..."
                  value={checkId}
                  onChange={(e) => setCheckId(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition"
                >
                  <Search className="w-4 h-4" /> Tekshirish
                </button>
              </div>
            </div>
          </form>

          {statusResult && (
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-blue-300 border border-gray-700 overflow-x-auto">
              <pre>{JSON.stringify(statusResult, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      {/* 3. Telegram Message Parser Test Simulator */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-purple-400" /> 3. Telegram @humocardbot Xabarini Simulyatsiya Qilish
        </h3>
        <p className="text-xs text-gray-400">
          Ushbu simulator Telegram humocardbot xabarini avtomatik tahlil qilib bazadagi kutilayotgan to'lov bilan moslashtiradi.
        </p>

        <form onSubmit={handleSimulateTelegram} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Telegram Xabar Matni</label>
            <textarea
              rows={4}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
              value={simText}
              onChange={(e) => setSimText(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-6 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Send className="w-4 h-4" /> Xabarni Tahlilga Yuborish
          </button>
        </form>

        {simResult && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-between">
            <div className="font-mono text-sm">
              Natija: {simResult.matched ? (
                <span className="text-green-400 font-bold">Mos to'lov topildi va PAID qilindi!</span>
              ) : (
                <span className="text-yellow-400 font-bold">Mos to'lov topilmadi.</span>
              )}
            </div>
            <pre className="text-xs text-gray-400">{JSON.stringify(simResult)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
