import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Clock, CheckCircle2, XCircle, RefreshCw, Copy, Check, Store, Search, Filter, ArrowUpRight } from 'lucide-react';
import Pagination from './Pagination';

export default function PaymentDashboard() {
  const { activeStore } = useAuth();
  const [payments, setPayments] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copiedId, setCopiedId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchPayments();
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchPayments();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeStore]);

  const fetchPayments = async () => {
    try {
      const url = activeStore ? `/api/payments?store_id=${activeStore.id}` : '/api/payments';
      const res = await fetch(url);
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

  const stats = useMemo(() => {
    const total = payments.length;
    const pending = payments.filter((p) => p.status === 'pending').length;
    const paid = payments.filter((p) => p.status === 'paid').length;
    const cancel = payments.filter((p) => p.status === 'cancel').length;
    const totalPaidSum = payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    return { total, pending, paid, cancel, totalPaidSum };
  }, [payments]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.payment_id.toLowerCase().includes(q) ||
        (p.card_number && p.card_number.includes(q)) ||
        (p.card_name && p.card_name.toLowerCase().includes(q)) ||
        p.amount.toString().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [payments, statusFilter, searchQuery]);

  // Paginated payments
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Active Store Indicator Header Banner */}
      {activeStore && (
        <div className="bg-gradient-to-r from-champion to-creole text-white rounded-2xl p-4 sm:p-5 shadow-xl border border-limeshade/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-limeshade/20 rounded-xl text-limeshade">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-300 font-mono uppercase tracking-wider">Faol Do'kon Monitoringi</p>
              <h2 className="text-lg sm:text-xl font-bold font-display text-white">{activeStore.name}</h2>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15 text-right">
            <p className="text-[11px] text-gray-300">Jami Muvaffaqiyatli Tushum</p>
            <p className="text-lg font-bold font-mono text-limeshade">{stats.totalPaidSum.toLocaleString()} UZS</p>
          </div>
        </div>
      )}

      {/* Snapshot Visual Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Payments Snapshot Card */}
        <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Jami To'lovlar</span>
            <div className="p-2.5 bg-champion/10 dark:bg-limeshade/10 rounded-2xl text-champion dark:text-limeshade group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-display font-black text-gray-900 dark:text-white mt-4">{stats.total}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-limeshade" /> Platformadagi barcha so'rovlar
          </p>
        </div>

        {/* Paid Payments Snapshot Card */}
        <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">To'langan (Paid)</span>
            <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-500 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-display font-black text-emerald-600 dark:text-emerald-400 mt-4">{stats.paid}</p>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-mono font-semibold">
            {stats.totalPaidSum.toLocaleString()} UZS
          </p>
        </div>

        {/* Pending Payments Snapshot Card */}
        <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Kutilayotgan (Pending)</span>
            <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-display font-black text-amber-600 dark:text-amber-400 mt-4">{stats.pending}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">20 daqiqa kutish taymerida</p>
        </div>

        {/* Cancelled Payments Snapshot Card */}
        <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Bekor Bo'lgan (Cancel)</span>
            <div className="p-2.5 bg-rose-500/10 rounded-2xl text-rose-500 group-hover:scale-110 transition-transform">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-display font-black text-rose-600 dark:text-rose-400 mt-4">{stats.cancel}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Muddati o'tgan yoki bekor qilingan</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
        {/* Table Controls: Title, Search, Filter & Refresh */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold font-display text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-champion dark:text-limeshade" /> To'lov Tranzaksiyalari
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Real-vaqt monitoringi va tranzaksiya jurnali</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="ID, Karta yoki Summa qidirish..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-limeshade transition"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-950 p-1 rounded-xl border border-gray-200 dark:border-gray-800 text-xs">
              {['all', 'paid', 'pending', 'cancel'].map((st) => (
                <button
                  key={st}
                  onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-lg font-semibold capitalize transition ${
                    statusFilter === st
                      ? 'bg-champion text-limeshade dark:bg-limeshade dark:text-creole shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {st === 'all' ? 'Barchasi' : st}
                </button>
              ))}
            </div>

            {/* Auto Refresh & Button */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600 dark:text-gray-400 select-none">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-limeshade focus:ring-limeshade bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                />
                Avto (3s)
              </label>

              <button
                onClick={fetchPayments}
                className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300 transition"
                title="Yangilash"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-gray-200/60 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-950/80 text-gray-500 dark:text-gray-400 font-mono text-[11px] uppercase border-b border-gray-200/80 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3.5 font-bold">Payment ID</th>
                <th className="px-4 py-3.5 font-bold">Summa</th>
                <th className="px-4 py-3.5 font-bold">Biriktirilgan Karta</th>
                <th className="px-4 py-3.5 font-bold">Holat</th>
                <th className="px-4 py-3.5 font-bold">Vaqt</th>
                <th className="px-4 py-3.5 font-bold text-right">Nusxalash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/60 dark:divide-gray-800/60 text-xs">
              {paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <p className="font-semibold text-gray-500">Hech qanday to'lov topilmadi.</p>
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p) => {
                  const dateStr = new Date(p.created_at * 1000).toLocaleString();
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-champion dark:text-limeshade">
                        {p.payment_id}
                      </td>
                      <td className="px-4 py-3.5 font-bold font-mono text-gray-900 dark:text-white text-sm">
                        {p.amount.toLocaleString()} UZS
                      </td>
                      <td className="px-4 py-3.5 font-mono text-gray-700 dark:text-gray-300">
                        {p.card_number ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded text-[10px] font-bold text-gray-800 dark:text-gray-200">
                              {p.card_name || 'KARTA'}
                            </span>
                            <span>{p.card_number}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Avto tanlov</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {p.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" /> PENDING
                          </span>
                        )}
                        {p.status === 'paid' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> PAID
                          </span>
                        )}
                        {p.status === 'cancel' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3 h-3" /> CANCEL
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 font-mono text-[11px]">{dateStr}</td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => copyToClipboard(p.payment_id)}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
                          title="ID nusxalash"
                        >
                          {copiedId === p.payment_id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
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

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredPayments.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
        />
      </div>
    </div>
  );
}
