import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Store, Key, Plus, Copy, Check, RefreshCw, Trash2, AlertCircle, ShieldAlert } from 'lucide-react';

export default function StoreManager() {
  const { stores, activeStore, selectStore, refreshStores, token } = useAuth();
  const [storeName, setStoreName] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateStore = async (e) => {
    e.preventDefault();
    if (!storeName.trim()) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: storeName.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Do'kon yaratishda xatolik");

      setStoreName('');
      await refreshStores();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateKey = async (storeId) => {
    if (!confirm("Diqqat! API Kalitni yangilasangiz, eski kalit orqali so'rovlar ishlamay qoladi. Davom etasizmi?")) return;
    try {
      const res = await fetch(`/api/stores/${storeId}/regenerate-key`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        refreshStores();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStore = async (storeId) => {
    if (!confirm("Do'konni o'chirmoqchimisiz? Undagi barcha sozlamalar o'chiriladi.")) return;
    try {
      const res = await fetch(`/api/stores/${storeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        refreshStores();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Create Store Card */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2 mb-4">
          <Store className="w-5 h-5" /> Yangi Do'kon Yaratish
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-200 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateStore} className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            required
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
            placeholder="Do'kon nomi (masalan: My Tech Shop / ClickUz Store)"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Do'kon Yaratish
          </button>
        </form>
      </div>

      {/* Stores List */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Mening Do'konlarim va API Kalitlar</h3>
            <p className="text-xs text-gray-400 mt-0.5">Har bir do'kon uchun alohida API Key beriladi</p>
          </div>
          <button onClick={refreshStores} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {stores.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            Hozircha do'konlar mavjud emas. Yuqoridagi shakldan yangi do'kon yarating!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {stores.map((s) => {
              const isSelected = activeStore && activeStore.id === s.id;
              return (
                <div
                  key={s.id}
                  className={`p-5 rounded-2xl border transition ${
                    isSelected 
                      ? 'bg-gradient-to-r from-blue-950/40 to-gray-850 border-blue-500/80 shadow-lg shadow-blue-950/50' 
                      : 'bg-gray-900 border-gray-700/80 hover:border-gray-600'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-white">{s.name}</span>
                        {isSelected && (
                          <span className="bg-blue-600/30 border border-blue-500/50 text-blue-300 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                            Faol Do'kon
                          </span>
                        )}
                      </div>
                      
                      {/* API Key Box */}
                      <div className="mt-3 flex items-center gap-2 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 max-w-xl">
                        <Key className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <code className="text-xs font-mono text-amber-200 tracking-wider flex-1 overflow-x-auto">
                          {s.api_key}
                        </code>
                        <button
                          onClick={() => copyToClipboard(s.api_key, s.id)}
                          className="text-gray-400 hover:text-white p-1 rounded transition"
                          title="Nusxalash"
                        >
                          {copiedId === s.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      {!isSelected && (
                        <button
                          onClick={() => selectStore(s)}
                          className="bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600 text-xs font-semibold px-3 py-2 rounded-xl transition"
                        >
                          Tanlash
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleRegenerateKey(s.id)}
                        className="bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
                        title="API Kalitni qayta yaratish"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Key Yangilash
                      </button>

                      <button
                        onClick={() => handleDeleteStore(s.id)}
                        className="bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/60 p-2 rounded-xl transition"
                        title="Do'konni o'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
