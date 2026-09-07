import React, { useState, useEffect } from 'react';
import { Send, Key, Smartphone, CheckCircle, Trash2, AlertCircle, RefreshCw, Lock, FileCode, Settings } from 'lucide-react';

export default function SessionManager() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Mode: 'sms' or 'string_session'
  const [mode, setMode] = useState('sms');

  // Custom API ID / Hash Toggle
  const [useCustomApi, setUseCustomApi] = useState(false);
  const [apiId, setApiId] = useState('24511179');
  const [apiHash, setApiHash] = useState('ac098d8c9f90857f2c443302d86a7288');

  // Form State
  const [phone, setPhone] = useState('+998');
  const [step, setStep] = useState(1); // 1: Send Code, 2: Enter OTP Code, 3: Enter 2FA Password
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sessionStringInput, setSessionStringInput] = useState('');

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

  const handleSendCode = async (e, forceSms = false) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/sessions/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          force_sms: forceSms,
          api_id: useCustomApi ? parseInt(apiId) : 24511179,
          api_hash: useCustomApi ? apiHash.trim() : 'ac098d8c9f90857f2c443302d86a7288',
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Server Xatosi (HTTP ${res.status}): ${text.substring(0, 150)}`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Kodni yuborishda xatolik');

      setPhoneCodeHash(data.phone_code_hash);
      setSuccess(data.message || 'Telegram ilovangizga kod yuborildi!');
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
          api_id: useCustomApi ? parseInt(apiId) : 24511179,
          api_hash: useCustomApi ? apiHash.trim() : 'ac098d8c9f90857f2c443302d86a7288',
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Server Xatosi (HTTP ${res.status}): ${text.substring(0, 150)}`);
      }

      const data = await res.json();
      if (!res.ok && res.status >= 400) throw new Error(data.detail || 'Tasdiqlashda xatolik');

      if (data.status === '2fa_required') {
        setError(data.message);
        setStep(3); // Move to 2FA password step
        return;
      }

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

  const handleImportStringSession = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/sessions/import-string', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          session_string: sessionStringInput.trim(),
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Server Xatosi (HTTP ${res.status}): ${text.substring(0, 150)}`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'StringSession yuklashda xatolik');

      setSuccess('StringSession orqali Telegram sessiyasi ulandi!');
      setSessionStringInput('');
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
            <Smartphone className="w-5 h-5" /> Telegram Sessiyasini Ulash (Telethon)
          </h2>

          <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700 text-xs">
            <button
              onClick={() => setMode('sms')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                mode === 'sms' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              SMS / App Kod bilan
            </button>
            <button
              onClick={() => setMode('string_session')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                mode === 'string_session' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              StringSession bilan
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 text-green-200 rounded-lg flex items-center gap-2 text-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {mode === 'sms' ? (
          <>
            {/* STEP 1: Enter Phone Number */}
            {step === 1 && (
              <form onSubmit={(e) => handleSendCode(e, false)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Telegram Telefon Raqamingiz</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-mono text-lg focus:outline-none focus:border-blue-500"
                      placeholder="+998901234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Kodni Yuborish
                    </button>
                  </div>
                </div>

                {/* Optional Custom API Credentials Accordion */}
                <div className="pt-2">
                  <label className="inline-flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-gray-200">
                    <input
                      type="checkbox"
                      checked={useCustomApi}
                      onChange={(e) => setUseCustomApi(e.target.checked)}
                      className="rounded bg-gray-900 border-gray-700 text-blue-600 focus:ring-blue-500"
                    />
                    <Settings className="w-3.5 h-3.5 text-gray-400" />
                    <span>O'zimning shaxsiy API ID & Hash-imni kiritish (my.telegram.org)</span>
                  </label>

                  {useCustomApi && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-900/60 rounded-lg border border-gray-700/60">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">API ID</label>
                        <input
                          type="number"
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono"
                          value={apiId}
                          onChange={(e) => setApiId(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">API Hash</label>
                        <input
                          type="text"
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono"
                          value={apiHash}
                          onChange={(e) => setApiHash(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              </form>
            )}

            {/* STEP 2: Enter Telegram SMS/App Code */}
            {step === 2 && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-300">Telegram SMS/App Kod</label>
                    <button
                      type="button"
                      onClick={() => handleSendCode(null, true)}
                      className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      SMS orqali qayta yuborish (Force SMS)
                    </button>
                  </div>
                  <input
                    type="text"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-xl tracking-widest text-center focus:outline-none focus:border-green-500"
                    placeholder="12345"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    ← Raqamni o'zgartirish
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-500 text-white font-medium px-6 py-2.5 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    Sessiyani Tasdiqlash
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Enter 2FA Password */}
            {step === 3 && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="p-3 bg-yellow-900/40 border border-yellow-700/60 rounded-lg text-yellow-200 text-xs flex items-center gap-2">
                  <Lock className="w-4 h-4 text-yellow-400" />
                  <span>Hisobingizda 2-bosqichli xavfsizlik (2FA) yoqilgan. Iltimos 2FA parolingizni kiriting.</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">2FA Parol</label>
                  <input
                    type="password"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500"
                    placeholder="2FA Parolingiz"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    ← Orqaga
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-yellow-600 hover:bg-yellow-500 text-white font-medium px-6 py-2.5 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    2FA Parol Bilan Kirish
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          /* StringSession Import Mode */
          <form onSubmit={handleImportStringSession} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Telefon Raqam</label>
                <input
                  type="text"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-mono"
                  placeholder="+998901234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">StringSession Kodingiz</label>
                <input
                  type="text"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm"
                  placeholder="1BJW9... (Telethon StringSession)"
                  value={sessionStringInput}
                  onChange={(e) => setSessionStringInput(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
                StringSession Ulash
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
