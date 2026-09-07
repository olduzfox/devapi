import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, Key, Smartphone, CheckCircle, Trash2, AlertCircle, RefreshCw, Lock, FileCode, QrCode, ExternalLink, Store, Link2, Sparkles } from 'lucide-react';
import Pagination from './Pagination';

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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

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
        setMode('sms');
        fetchSessions();
      } else if (data.status === 'pending') {
        if (data.url && data.url !== qrUrl) {
          setQrUrl(data.url);
        }
      } else if (data.status === '2fa_required') {
        setQr2faRequired(true);
        setQrStatusText('2FA Parol talab etiladi.');
      } else if (data.status === 'expired') {
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

  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sessions.slice(start, start + pageSize);
  }, [sessions, currentPage, pageSize]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Active Store Indicator Header Banner */}
      {activeStore ? (
        <div className="bg-gradient-to-r from-champion to-creole text-white rounded-2xl p-4 sm:p-5 shadow-xl border border-limeshade/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-limeshade/20 rounded-xl text-limeshade">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-300 font-mono uppercase tracking-wider">Do'konga Biriktirilgan Sessiya</p>
              <h2 className="text-lg sm:text-xl font-bold font-display text-white">{activeStore.name}</h2>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15 text-xs text-limeshade font-mono font-bold">
            Sessiya ushbu do'konga biriktiriladi
          </div>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-600 dark:text-amber-400 font-medium">
          ⚠️ Do'kon tanlanmagan. Iltimos yuqoridagi menyudan do'koningizni tanlang!
        </div>
      )}

      {/* Main Connect Panel */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-100 dark:border-gray-800/80 pb-6">
          <div>
            <h2 className="text-xl font-display font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-champion dark:text-limeshade" /> Telegram Sessiyasini Ulash (Telethon Engine)
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Har bir do'kon uchun alohida Telegram akkaunt biriktiriladi</p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-gray-100 dark:bg-gray-950 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-800 text-xs">
            <button
              onClick={() => setMode('sms')}
              className={`px-3.5 py-2 font-bold rounded-xl transition ${
                mode === 'sms'
                  ? 'bg-champion text-limeshade dark:bg-limeshade dark:text-creole shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              SMS / App Kod
            </button>
            <button
              onClick={() => setMode('qr')}
              className={`px-3.5 py-2 font-bold rounded-xl transition ${
                mode === 'qr'
                  ? 'bg-champion text-limeshade dark:bg-limeshade dark:text-creole shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              QR Kod (100% Onson)
            </button>
            <button
              onClick={() => setMode('string_session')}
              className={`px-3.5 py-2 font-bold rounded-xl transition ${
                mode === 'string_session'
                  ? 'bg-champion text-limeshade dark:bg-limeshade dark:text-creole shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              StringSession
            </button>
          </div>
        </div>

        {/* Global Feedback Messages */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* MODE 1: SMS / APP OTP */}
        {mode === 'sms' && (
          <>
            {step === 1 && (
              <form onSubmit={(e) => handleSendCode(e, false)} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Telegram Telefon Raqamingiz</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      className="flex-1 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-gray-900 dark:text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-limeshade transition"
                      placeholder="+998901234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-champion dark:bg-limeshade text-limeshade dark:text-creole font-bold px-6 py-3 rounded-2xl flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50 text-sm"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Kodni Yuborish
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomApi}
                      onChange={(e) => setUseCustomApi(e.target.checked)}
                      className="rounded bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-limeshade focus:ring-limeshade"
                    />
                    O'zimning shaxsiy API ID & Hash-imni kiritish (my.telegram.org)
                  </label>
                </div>

                {useCustomApi && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800">
                    <div>
                      <label className="block text-xs font-mono font-bold text-gray-500 dark:text-gray-400 mb-1">API ID</label>
                      <input
                        type="text"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-gray-900 dark:text-gray-100 font-mono text-xs"
                        value={apiId}
                        onChange={(e) => setApiId(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-bold text-gray-500 dark:text-gray-400 mb-1">API HASH</label>
                      <input
                        type="text"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-gray-900 dark:text-gray-100 font-mono text-xs"
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
                <div className="p-4 bg-champion/10 dark:bg-limeshade/10 border border-limeshade/30 text-champion dark:text-limeshade rounded-2xl text-xs flex justify-between items-center font-medium">
                  <span>Telegram ilovangizga (SMS) 5 xonali kod yuborildi!</span>
                  <button
                    type="button"
                    onClick={(e) => handleSendCode(e, true)}
                    className="text-xs underline font-bold"
                  >
                    SMS Orqali Qayta Yuborish
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">SMS / App Tasdiqlash Kodi</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-gray-900 dark:text-gray-100 font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-limeshade"
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
                    className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-xs font-medium"
                  >
                    ← Raqamni o'zgartirish
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-champion dark:bg-limeshade text-limeshade dark:text-creole font-bold px-6 py-3 rounded-2xl flex items-center gap-2 transition shadow-md disabled:opacity-50 text-sm"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    Sessiyani Boshlash
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl text-xs font-medium">
                  Hisobingizda 2-Bosqichli Xavfsizlik (2FA) yoqilgan. Iltimos 2FA parolingizni kiriting:
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">2FA Parol</label>
                  <input
                    type="password"
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-limeshade font-mono text-sm"
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
                    className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-xs font-medium"
                  >
                    ← Orqaga
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-amber-600 text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2 transition shadow-md disabled:opacity-50 text-sm"
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
          <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
            {qrLoading ? (
              <div className="flex flex-col items-center py-8">
                <RefreshCw className="w-8 h-8 text-champion dark:text-limeshade animate-spin mb-3" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">QR Kod generatsiya qilinmoqda...</p>
              </div>
            ) : qrUrl ? (
              <>
                <div className="p-4 bg-white rounded-3xl shadow-xl inline-block border-4 border-champion dark:border-limeshade">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrUrl)}`}
                    alt="Telegram QR Login"
                    className="w-60 h-60"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-bold font-display text-gray-900 dark:text-white flex items-center justify-center gap-2">
                    <QrCode className="w-4 h-4 text-champion dark:text-limeshade" />
                    Telegram Ilovangizda QR Kodni Skan Qiling
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Smartfoningizda: <strong className="text-champion dark:text-limeshade">Settings → Devices → Link Desktop Device</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href={qrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-xl flex items-center gap-1.5 transition font-bold border border-gray-200 dark:border-gray-700"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Telegram Ilovasida Ochish
                  </a>
                  <button
                    onClick={handleStartQr}
                    className="text-xs text-champion dark:text-limeshade font-bold flex items-center gap-1 hover:underline"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> QR Kodni Yangilash
                  </button>
                </div>

                {qr2faRequired && (
                  <form onSubmit={handleQr2faSubmit} className="w-full max-w-sm pt-4 space-y-3">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 text-xs font-medium">
                      2FA Parolingizni kiriting:
                    </div>
                    <input
                      type="password"
                      className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-limeshade text-xs font-mono"
                      placeholder="2FA Parolingiz"
                      value={qrPassword}
                      onChange={(e) => setQrPassword(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      className="w-full bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm"
                    >
                      2FA Bilan Tasdiqlash
                    </button>
                  </form>
                )}
              </>
            ) : (
              <button
                onClick={handleStartQr}
                className="bg-champion dark:bg-limeshade text-limeshade dark:text-creole font-bold px-6 py-3 rounded-2xl flex items-center gap-2 transition shadow-md"
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
                <label className="block text-xs font-mono font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Telefon Raqam</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-gray-900 dark:text-gray-100 font-mono text-xs"
                  placeholder="+998901234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">StringSession Kodingiz</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-gray-900 dark:text-gray-100 font-mono text-xs"
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
                className="bg-champion dark:bg-limeshade text-limeshade dark:text-creole font-bold px-6 py-3 rounded-2xl flex items-center gap-2 transition shadow-md disabled:opacity-50 text-sm"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
                StringSession Ulash
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Active Sessions List */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-champion dark:text-limeshade" /> Faol Telegram Sessiyalari ({sessions.length})
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {activeStore ? `"${activeStore.name}" do'koniga biriktirilgan Telegram sessiyalari` : "Barcha ulangan sessiyalar ro'yxati"}
            </p>
          </div>
          <button
            onClick={fetchSessions}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
            title="Yangilash"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm font-medium">
            Hozircha ulangan Telegram sessiyalari mavjud emas. Yuqoridagi bo'limdan yangi sessiya ulang!
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedSessions.map((s) => (
              <div
                key={s.id}
                className="bg-gray-50/50 dark:bg-gray-950/50 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-gray-300 dark:hover:border-gray-700"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-bold text-gray-900 dark:text-white">{s.phone}</span>
                    <span className="px-2.5 py-0.5 text-[10px] font-bold font-mono uppercase rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {s.status}
                    </span>
                  </div>
                  <div className="text-xs text-champion dark:text-limeshade flex items-center gap-1 mt-1 font-bold">
                    <Store className="w-3.5 h-3.5" />
                    Do'kon: <strong>{s.store_name}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {activeStore && s.store_id !== activeStore.id && (
                    <button
                      onClick={() => handleBindSession(s.id)}
                      className="bg-champion dark:bg-limeshade text-limeshade dark:text-creole text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm"
                      title="Ushbu sessiyani tanlangan do'konga biriktirish"
                    >
                      <Link2 className="w-3.5 h-3.5" /> Do'konga Biriktirish
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteSession(s.id)}
                    className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 p-2 rounded-xl transition hover:bg-rose-500/20"
                    title="Sessiyani o'chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalItems={sessions.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
        />
      </div>
    </div>
  );
}
