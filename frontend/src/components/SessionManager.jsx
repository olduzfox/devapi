import React, { useState, useEffect } from 'react';
import { Send, Key, Smartphone, CheckCircle, Trash2, AlertCircle, RefreshCw } from 'lucide-react';

export default function SessionManager() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1 Form
  const [phone, setPhone] = useState('+998');
  const [apiId, setApiId] = useState('24511179');
  const [apiHash, setApiHash] = useState('ac098d8c9f90857f2c443302d86a7288');

  // Step 2 Form
  const [step, setStep] = useState(1); // 1: Send code, 2: Enter code
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/sessions/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          api_id: parseInt(apiId),
          api_hash: apiHash.trim(),
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Server Xatosi (HTTP ${res.status}): Nginx yoki Backend xabari: ${text.substring(0, 150)}`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Kodni yuborishda xatolik');

      setPhoneCodeHash(data.phone_code_hash);
      setSuccess('Telegram ilovangizga SMS kod yuborildi!');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/sessions/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          code: code.trim(),
          phone_code_hash: phoneCodeHash,
          password: password.trim() || null,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Server Xatosi (HTTP ${res.status}): ${text.substring(0, 150)}`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Tasdiqlashda xatolik');

      setSuccess('Telegram sessiyasi muvaffaqiyatli ulandi va monitoring ishga tushirildi!');
      setStep(1);
      setCode('');
      setPassword('');
      fetchSessions();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (id) => {
    if (!confirm('Sessiyani o`chirmoqchimisiz?')) return;
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSessions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2 mb-4">
          <Smartphone className="w-5 h-5" /> Telegram Sessiyasini Ulash (Telethon)
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

        {step === 1 ? (
          <form onSubmit={handleSendCode} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Telefon raqam</label>
              <input
                type="text"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="+998901234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">API ID</label>
              <input
                type="number"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                value={apiId}
                onChange={(e) => setApiId(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">API Hash</label>
              <input
                type="text"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                value={apiHash}
                onChange={(e) => setApiHash(e.target.value)}
                required
              />
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Kodni Yuborish
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Telegram Kod (SMS/App)</label>
                <input
                  type="text"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="12345"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">2FA Parol (agar bor bo'lsa)</label>
                <input
                  type="password"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="2FA Parolingiz"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ← Orqaga
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 hover:bg-green-500 text-white font-medium px-6 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                Sessiyani Tasdiqlash
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Active Sessions List */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Faol Telegram Sessiyalari</h3>
          <button onClick={fetchSessions} className="text-gray-400 hover:text-white p-1">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {sessions.length === 0 ? (
          <p className="text-gray-400 text-sm">Hozircha ulangan Telegram sessiyasi mavjud emas.</p>
        ) : (
          <div className="divide-y divide-gray-700">
            {sessions.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-mono text-blue-300 font-semibold">{s.phone}</span>
                  <span className="ml-3 text-xs px-2 py-0.5 rounded-full bg-green-900/60 text-green-300 border border-green-700">
                    {s.status.toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteSession(s.id)}
                  className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-gray-700 transition"
                  title="Sessiyani o'chirish"
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
