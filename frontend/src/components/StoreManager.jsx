import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Store, Key, Plus, Copy, Check, RefreshCw, Trash2, AlertCircle, Sparkles } from 'lucide-react';
import Pagination from './Pagination';

export default function StoreManager() {
  const { stores, activeStore, selectStore, refreshStores, token } = useAuth();
  const [storeName, setStoreName] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

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

  const paginatedStores = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return stores.slice(start, start + pageSize);
  }, [stores, currentPage, pageSize]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Create New Store Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-champion/10 dark:bg-limeshade/10 rounded-2xl text-champion dark:text-limeshade">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-display font-black text-gray-900 dark:text-white">Yangi Do'kon Yaratish</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Har bir do'kon uchun alohida API Key va Telegram sessiya biriktiriladi</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateStore} className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            required
            className="flex-1 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-limeshade transition"
            placeholder="Do'kon nomi (masalan: My Online Store / ClickUz Store)"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-champion dark:bg-limeshade text-limeshade dark:text-creole font-bold px-6 py-3 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition shadow-md disabled:opacity-50 text-sm"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Do'kon Yaratish
          </button>
        </form>
      </div>

      {/* Stores List Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-champion dark:text-limeshade" /> Mening Do'konlarim ({stores.length})
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Barcha faol do'konlar va ularning maxfiy API kalitlari</p>
          </div>
          <button
            onClick={refreshStores}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
            title="Yangilash"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {stores.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm font-medium">
            Hozircha do'konlar yaratilmagan. Yuqoridagi shakldan birinchi do'koningizni qo'shing!
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedStores.map((s) => {
              const isSelected = activeStore && activeStore.id === s.id;
              return (
                <div
                  key={s.id}
                  className={`p-6 rounded-3xl border transition-all ${
                    isSelected
                      ? 'bg-limeshade/10 dark:bg-limeshade/10 border-limeshade/50 shadow-md scale-[1.01]'
                      : 'bg-gray-50/50 dark:bg-gray-950/50 border-gray-200/80 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-lg text-gray-900 dark:text-white">{s.name}</span>
                        {isSelected && (
                          <span className="bg-champion text-limeshade dark:bg-limeshade dark:text-creole text-[11px] font-mono font-bold px-3 py-1 rounded-full border border-limeshade/40">
                            Faol Monitoring
                          </span>
                        )}
                      </div>

                      {/* API Key Box */}
                      <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl px-4 py-2.5 max-w-xl shadow-sm">
                        <Key className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <code className="text-xs font-mono text-amber-600 dark:text-amber-300 tracking-wider flex-1 overflow-x-auto">
                          {s.api_key}
                        </code>
                        <button
                          onClick={() => copyToClipboard(s.api_key, s.id)}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
                          title="API Key nusxalash"
                        >
                          {copiedId === s.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                      {!isSelected && (
                        <button
                          onClick={() => selectStore(s)}
                          className="bg-champion dark:bg-limeshade text-limeshade dark:text-creole text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm"
                        >
                          Monitoringga Tanlash
                        </button>
                      )}

                      <button
                        onClick={() => handleRegenerateKey(s.id)}
                        className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition hover:bg-amber-500/20"
                        title="API Kalitni yangilash"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Key Yangilash
                      </button>

                      <button
                        onClick={() => handleDeleteStore(s.id)}
                        className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 p-2.5 rounded-xl transition hover:bg-rose-500/20"
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

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalItems={stores.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
        />
      </div>
    </div>
  );
}
