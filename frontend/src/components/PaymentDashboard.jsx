import React, { useState, useEffect } from 'react';
import { Activity, Clock, CheckCircle2, XCircle, RefreshCw, Copy, Check } from 'lucide-react';

export default function PaymentDashboard() {
  const [payments, setPayments] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copiedId, setCopiedId] = useState('');

  useEffect(() => {
    fetchPayments();
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchPayments();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/payments');
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const stats = {
    total: payments.length,
    pending: payments.filter((p) => p.status === 'pending').length,
    paid: payments.filter((p) => p.status === 'paid').length,
    cancel: payments.filter((p) => p.status === 'cancel').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">Jami To'lovlar</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <Activity className="w-8 h-8 text-blue-400" />
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">Kutilayotgan (Pending)</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.pending}</p>
          </div>
          <Clock className="w-8 h-8 text-yellow-400" />
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">To'langan (Paid)</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{stats.paid}</p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">Bekor bo'lgan (Cancel)</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{stats.cancel}</p>
          </div>
          <XCircle className="w-8 h-8 text-red-400" />
        </div>
      </div>

      {/* Payment Records Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" /> Real-vaqt To'lovlar Monitoringi
          </h2>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-gray-900 border-gray-700"
              />
              Avto-yangilash (3s)
            </label>

            <button
              onClick={fetchPayments}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition"
              title="Yangilash"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-900/60 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Payment ID</th>
                <th className="px-4 py-3">Summa</th>
                <th className="px-4 py-3">Biriktirilgan Karta</th>
                <th className="px-4 py-3">Holat</th>
                <th className="px-4 py-3">Yaratilgan Vaqt</th>
                <th className="px-4 py-3 rounded-r-lg text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    Hozircha to'lovlar yaratilmagan.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const dateStr = new Date(p.created_at * 1000).toLocaleTimeString();
                  return (
                    <tr key={p.id} className="hover:bg-gray-700/30 transition">
                      <td className="px-4 py-3 font-mono font-semibold text-blue-400">
                        {p.payment_id}
                      </td>
                      <td className="px-4 py-3 font-bold text-white">
                        {p.amount.toLocaleString()} UZS
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-300">
                        {p.card_number ? (
                          <span>
                            {p.card_name || 'KARTA'} (*{p.card_number})
                          </span>
                        ) : (
                          <span className="text-gray-500 italic">Har qanday karta</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.status === 'pending' && (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-900/50 text-yellow-300 border border-yellow-700/60">
                            PENDING
                          </span>
                        )}
                        {p.status === 'paid' && (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-900/50 text-green-300 border border-green-700/60">
                            PAID
                          </span>
                        )}
                        {p.status === 'cancel' && (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-900/50 text-red-300 border border-red-700/60">
                            CANCEL
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{dateStr}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => copyToClipboard(p.payment_id)}
                          className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition inline-flex items-center gap-1 text-xs"
                          title="ID nushasini olish"
                        >
                          {copiedId === p.payment_id ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
