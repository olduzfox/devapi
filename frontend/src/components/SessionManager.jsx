import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, Key, Smartphone, CheckCircle, Trash2, AlertCircle, RefreshCw, Lock, FileCode, QrCode, ExternalLink, Store } from 'lucide-react';

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
      } else if (data.status === '2fa_required') {
        setQr2faRequired(true);
        setQrStatusText('2FA Parol talab etiladi.');
      } else if (data.status === 'expired') {
        setError('QR kod vaqti tugadi. Qayta yangilang.');
        setQrTokenId('');
        setQrUrl('');
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

          <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700 text-xs flex-wrap gap-1">
            <button
              onClick={() => setMode('sms')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                mode === 'sms' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              SMS / App Kod
            </button>
            <button
              onClick={() => {
                setMode('qr');
                if (!qrUrl) handleStartQr();
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1 ${
                mode === 'qr' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" /> QR Kod bilan (100%)
            </button>
            <button
              onClick={() => setMode('string_session')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                mode === 'string_session' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              StringSession
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

        {/* MODE 1: SMS / APP CODE */}
        {mode === 'sms' && (
          <>
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

                <div className="pt-2">
                  <label className="inline-flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-gray-200">
                    <input
                      type="checkbox"
                      checked={useCustomApi}
                      onChange={(e) => setUseCustomApi(e.target.checked)}
                      className="rounded bg-gray-900 border-gray-700 text-blue-600 focus:ring-blue-500"
                    />
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
                <div className="p-4 bg-white rounded-2xl shadow-xl inline-block border-4 border-blue-500/50">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrUrl)}`}
                    alt="Telegram QR Login"
                    className="w-60 h-60"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white flex items-center justify-center gap-2">
                    <QrCode className="w-4 h-4 text-blue-400" />
                    Telegram Ilovangizda QR Kodni Skan Qiling
                  </p>
                  <p className="text-xs text-gray-400">
                    Smarfoningizda: <strong className="text-blue-300">Settings → Devices → Link Desktop Device</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href={qrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Telegram Ilovasida Ochish
                  </a>
                  <button
                    onClick={handleStartQr}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    QR Kodni Yangilash
                  </button>
                </div>

                {qr2faRequired && (
                  <form onSubmit={handleQr2faSubmit} className="w-full max-w-sm pt-4 space-y-3">
                    <div className="p-3 bg-yellow-900/40 border border-yellow-700/60 rounded-lg text-yellow-200 text-xs">
                      2FA Parolingizni kiriting:
                    </div>
                    <input
                      type="password"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-yellow-500 text-sm"
                      placeholder="2FA Parolingiz"
                      value={qrPassword}
                      onChange={(e) => setQrPassword(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-medium py-2 rounded-lg text-sm transition"
                    >
                      2FA Bilan Tasdiqlash
                    </button>
                  </form>
                )}
              </>
            ) : (
              <button
                onClick={handleStartQr}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-lg flex items-center gap-2 transition"
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
