import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Lock, Mail, User, ShieldCheck, AlertCircle } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister 
      ? { email: email.trim(), password, full_name: fullName.trim() }
      : { email: email.trim(), password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Xatolik yuz berdi');

      login(data.token, data.user, data.stores);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-gray-850 border border-gray-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glow Header Accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl mb-3 shadow-lg shadow-blue-500/20 text-white">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">PayProvider SaaS</h2>
          <p className="text-sm text-gray-400 mt-1">
            {isRegister ? "Yangi hisob yarating va do'koningizni ishga tushiring" : "Tizimga kirish uchun malumotlaringizni kiriting"}
          </p>
        </div>

        {/* Auth Mode Switcher Tabs */}
        <div className="flex bg-gray-900/80 p-1 rounded-xl mb-6 border border-gray-700/60">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
              !isRegister ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4 inline mr-1.5" /> Kirish
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
              isRegister ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4 inline mr-1.5" /> Ro'yxatdan O'tish
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-200 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">Ismingiz / Familiya</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="Ali Valiyev"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">Email Manzil</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="email"
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="user@istep.uz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">Parol</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="password"
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 mt-2"
          >
            {loading ? "Jarayonda..." : isRegister ? "Ro'yxatdan O'tish" : "Tizimga Kirish"}
          </button>
        </form>
      </div>
    </div>
  );
}
