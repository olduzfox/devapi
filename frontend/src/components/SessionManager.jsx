import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, Key, Smartphone, CheckCircle, Trash2, AlertCircle, RefreshCw, Lock, FileCode, QrCode, ExternalLink, Store, Link2 } from 'lucide-react';

export default function SessionManager() {
  const { activeStore } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Mode: 'sms', 'qr', 'string_session'
  const [mode, setMode] = useState('sms');

  // Custom API ID / Hash Toggle
  const [useCustomApi, setUseCustomApi] = useState(false);
  const [apiId, setApiId] = useState('24511179');
  const [apiHash, setApiHash] = useState('ac098d8c9f90857f2c443302d86a7288');

  // SMS Form State
  const [phone, setPhone] = useState('+998');
  const [step, setStep] = useState(1); // 1: Send Code, 2: Enter OTP Code, 3: Enter 2FA Password
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sessionStringInput, setSessionStringInput] = useState('');

  // QR Code Login State
  const [qrTokenId, setQrTokenId] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrStatusText, setQrStatusText] = useState('');
  const [qr2faRequired, setQr2faRequired] = useState(false);
  const [qrPassword, setQrPassword] = useState('');

  useEffect(() => {
    fetchSessions();
  }, [activeStore]);

  // Auto-start QR login when mode switches to 'qr'
  useEffect(() => {
    if (mode === 'qr' && !qrTokenId && !qrLoading) {
      handleStartQr();
    }
  }, [mode]);

  // Poll QR status when QR active
  useEffect(() => {
    let interval = null;
    if (mode === 'qr' && qrTokenId && !qr2faRequired) {
      interval = setInterval(() => {
        checkQrStatus();
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [mode, qrTokenId, qr2faRequired]);

  const fetchSessions = async () => {
    try {
      const url = activeStore ? `/api/sessions?store_id=${activeStore.id}` : '/api/sessions';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // SMS Handlers
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
          store_id: activeStore ? activeStore.id : null,
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
          store_id: activeStore ? activeStore.id : null,
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
        setStep(3);
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

  // QR Code Handlers
  const handleStartQr = async () => {
    setError('');
    setSuccess('');
    setQrLoading(true);
    setQrTokenId('');
    setQrUrl('');
    setQr2faRequired(false);
    setQrPassword('');

    try {
      const res = await fetch('/api/sessions/qr/start', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'QR kod yaratishda xatolik');

      setQrTokenId(data.token_id);
      setQrUrl(data.url);
      setQrStatusText('Telegram ilovangizda (Settings -> Devices -> Link Desktop Device) skan qiling...');
    } catch (err) {
      setError(err.message);
    } finally {
      setQrLoading(false);
    }
  };

  const checkQrStatus = async (pass = null) => {
    if (!qrTokenId) return;
    try {
      const res = await fetch('/api/sessions/qr/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_id: qrTokenId,
          password: pass || (qrPassword ? qrPassword.trim() : null),
          store_id: activeStore ? activeStore.id : null,
        }),
      });

      const data = await res.json();
      if (data.status === 'authorized') {
        setSuccess(data.message);
        setQrTokenId('');
        setQrUrl('');
        setQr2faRequired(false);
        setMode('sms'); // Switch back and show sessions
        fetchSessions(); // Refresh list
      } else if (data.status === 'pending') {
        if (data.url && data.url !== qrUrl) {
          setQrUrl(data.url);
        }
      } else if (data.status === '2fa_required') {
        setQr2faRequired(true);
        setQrStatusText('2FA Parol talab etiladi.');
      } else if (data.status === 'expired') {
        // Auto regenerate QR code seamlessly
        handleStartQr();
      } else if (data.status === '2fa_error') {
        setError(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleQr2faSubmit = (e) => {
    e.preventDefault();
    checkQrStatus(qrPassword);
  };

  // StringSession Handler
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
          store_id: activeStore ? activeStore.id : null,
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
    if (!confirm('Sessiyani o`chirmoqchimisiz? Telegram monitoring to`xtatiladi.')) return;
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSessions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBindSession = async (sessionId) => {
    if (!activeStore) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}/bind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: activeStore.id })
      });
      if (res.ok) {
        fetchSessions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Store Banner */}
      {activeStore ? (
        <div className="bg-gradient-to-r from-blue-950/60 to-gray-850 border border-blue-600/50 rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-500/50 rounded-xl text-blue-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-blue-300 font-semibold uppercase tracking-wider">Tanlangan Do'kon</div>
              <div className="text-base font-bold text-white">{activeStore.name}</div>
            </div>
          </div>
          <div className="text-xs font-mono bg-blue-950 border border-blue-700/60 text-blue-200 px-3 py-1.5 rounded-xl font-semibold">
            Sessiya aynan shunga biriktiriladi
          </div>
        </div>
      ) : (
        <div className="bg-amber-950/50 border border-amber-800/80 rounded-2xl p-4 text-xs text-amber-200">
          ⚠️ Do'kon tanlanmagan. Iltimos yuqoridagi menyudan do'koningizni tanlang!
        </div>
      )}

      {/* Main Connect Panel */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-700 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-400" /> Telegram Sessiyasini Ulash (Telethon)
            </h2>
            <p className="text-xs text-gray-400 mt-1">Har bir do'kon uchun alohida Telegram sessiya biriktiriladi</p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-700/80 text-xs">
            <button
              onClick={() => setMode('sms')}
              className={`px-3 py-1.5 font-semibold rounded-lg transition ${
                mode === 'sms' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              SMS / App Kod
            </button>
            <button
              onClick={() => setMode('qr')}
              className={`px-3 py-1.5 font-semibold rounded-lg transition ${
                mode === 'qr' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              QR Kod bilan (100%)
            </button>
            <button
              onClick={() => setMode('string_session')}
              className={`px-3 py-1.5 font-semibold rounded-lg transition ${
                mode === 'string_session' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              StringSession
            </button>
          </div>
        </div>

        {/* Global Feedback Messages */}
        {error && (
          <div className="p-4 bg-red-950/60 border border-red-800 text-red-200 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-950/60 border border-green-800 text-green-200 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-400" />
            <span>{success}</span>
          </div>
        )}

        {/* MODE 1: SMS / APP OTP */}
        {mode === 'sms' && (
          <>
            {step === 1 && (
              <form onSubmit={(e) => handleSendCode(e, false)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Telegram Telefon Raqamingiz</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                      placeholder="+998901234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Kodni Yuborish
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="inline-flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomApi}
                      onChange={(e) => setUseCustomApi(e.target.checked)}
                      className="rounded bg-gray-900 border-gray-700 text-blue-600 focus:ring-blue-500"
                    />
                    O'zimning shaxsiy API ID & Hash-imni kiritish (my.telegram.org)
                  </label>
                </div>

                {useCustomApi && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-900 rounded-xl border border-gray-700">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">API ID</label>
                      <input
                        type="text"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm"
                        value={apiId}
                        onChange={(e) => setApiId(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">API HASH</label>
                      <input
                        type="text"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm"
                        value={apiHash}
                        onChange={(e) => setApiHash(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="p-3 bg-blue-950/50 border border-blue-800 text-blue-200 rounded-xl text-xs flex justify-between items-center">
                  <span>Telegram ilovangizga (SMS) 5 xonali kod yuborildi!</span>
                  <button
                    type="button"
                    onClick={(e) => handleSendCode(e, true)}
                    className="text-xs text-blue-400 hover:text-blue-300 underline font-semibold"
                  >
                    SMS Orqali Qayta Yuborish
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">SMS / App Tasdiqlash Kodi</label>
                  <input
                    type="text"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white font-mono text-lg tracking-widest focus:outline-none focus:border-blue-500"
                    placeholder="12345"
                    maxLength={10}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
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
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    Sessiyani Boshlash
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="p-3 bg-yellow-950/50 border border-yellow-800 text-yellow-200 rounded-xl text-xs">
                  Hisobingizda 2-Bosqichli Xavfsizlik (2FA) yoqilgan. Iltimos 2FA parolingizni kiriting:
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">2FA Parol</label>
                  <input
                    type="password"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 font-mono"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
                    className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    2FA Bilan Kirish
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* MODE 2: QR CODE SCAN */}
        {mode === 'qr' && (
          <div className="flex flex-col items-center justify-center py-4 space-y-4 text-center">
            {qrLoading ? (
              <div className="flex flex-col items-center py-8">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mb-3" />
                <p className="text-sm text-gray-300">QR Kod generatsiya qilinmoqda...</p>
              </div>
            ) : qrUrl ? (
              <>
                <div className="p-4 bg-white rounded-2xl shadow-2xl inline-block border-4 border-blue-500/50">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrUrl)}`}
                    alt="Telegram QR Login"
                    className="w-60 h-60"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-bold text-white flex items-center justify-center gap-2">
                    <QrCode className="w-4 h-4 text-blue-400" />
                    Telegram Ilovangizda QR Kodni Skan Qiling
                  </p>
                  <p className="text-xs text-gray-400">
                    Smartfoningizda: <strong className="text-blue-300">Settings → Devices → Link Desktop Device</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href={qrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-xl flex items-center gap-1 transition font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Telegram Ilovasida Ochish
                  </a>
                  <button
                    onClick={handleStartQr}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> QR Kodni Yangilash
                  </button>
                </div>

                {qr2faRequired && (
                  <form onSubmit={handleQr2faSubmit} className="w-full max-w-sm pt-4 space-y-3">
                    <div className="p-3 bg-yellow-950/50 border border-yellow-800 rounded-xl text-yellow-200 text-xs">
                      2FA Parolingizni kiriting:
                    </div>
                    <input
                      type="password"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-yellow-500 text-sm"
                      placeholder="2FA Parolingiz"
                      value={qrPassword}
                      onChange={(e) => setQrPassword(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 rounded-xl text-sm transition"
                    >
                      2FA Bilan Tasdiqlash
                    </button>
                  </form>
                )}
              </>
            ) : (
              <button
                onClick={handleStartQr}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition"
              >
                <QrCode className="w-4 h-4" /> QR Kod Yaratish
              </button>
            )}
          </div>
        )}

        {/* MODE 3: STRING SESSION IMPORT */}
        {mode === 'string_session' && (
          <form onSubmit={handleImportStringSession} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Telefon Raqam</label>
                <input
                  type="text"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white font-mono"
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
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm"
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
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
                StringSession Ulash
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Active Sessions List */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Faol Telegram Sessiyalari</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeStore ? `"${activeStore.name}" do'koniga biriktirilgan sessiyalar` : "Barcha sessiyalar ro'yxati"}
            </p>
          </div>
          <button onClick={fetchSessions} className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            Hozircha ulangan Telegram sessiyasi mavjud emas. Yuqoridagi bo'limdan sessiya ulang!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="bg-gray-900 border border-gray-700/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-bold text-white">{s.phone}</span>
                    <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-green-950 text-green-300 border border-green-700">
                      {s.status}
                    </span>
                  </div>
                  <div className="text-xs text-blue-300 flex items-center gap-1 mt-1 font-medium">
                    <Store className="w-3.5 h-3.5 text-blue-400" />
                    Do'kon: <strong>{s.store_name}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {activeStore && s.store_id !== activeStore.id && (
                    <button
                      onClick={() => handleBindSession(s.id)}
                      className="bg-blue-950/60 hover:bg-blue-900 text-blue-300 border border-blue-700 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
                      title="Ushbu sessiyani tanlangan do'konga biriktirish"
                    >
                      <Link2 className="w-3.5 h-3.5" /> Do'konga Biriktirish
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeleteSession(s.id)}
                    className="bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/60 p-2 rounded-xl transition"
                    title="Sessiyani o'chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
