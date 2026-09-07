import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Terminal, Play, Search, Send, Code, Copy, Check, Sparkles, Server } from 'lucide-react';

export default function ApiSimulator() {
  const { activeStore } = useAuth();
  const apiKey = activeStore ? activeStore.api_key : 'YOUR_STORE_API_KEY';

  // Create Payment State
  const [createAmount, setCreateAmount] = useState(100000);
  const [createResult, setCreateResult] = useState(null);
  const [createError, setCreateError] = useState('');

  // Status Check State
  const [checkId, setCheckId] = useState('');
  const [statusResult, setStatusResult] = useState(null);

  // Telegram Message Simulator State
  const [simText, setSimText] = useState(
    "HumoCard bot\nTo'ldirish: 100.000,00 UZS\n💳 *4271\nSana: 07.09.2026 11:42"
  );
  const [simResult, setSimResult] = useState(null);
  const [copiedLang, setCopiedLang] = useState('');

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    setCreateResult(null);
    setCreateError('');

    try {
      const formData = new FormData();
      formData.append('amount', createAmount);
      if (activeStore) {
        formData.append('api_key', activeStore.api_key);
      }

      const res = await fetch('/create', {
        method: 'POST',
        headers: activeStore ? { 'X-Api-Key': activeStore.api_key } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'To`lov yaratishda xatolik');

      setCreateResult(data);
      if (data.payment_id) {
        setCheckId(data.payment_id);
      }
    } catch (err) {
      setCreateError(err.message);
    }
  };

  const handleCheckStatus = async (e) => {
    e.preventDefault();
    setStatusResult(null);

    try {
      const res = await fetch(`/status/${checkId.trim()}`);
      const data = await res.json();
      setStatusResult(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateTelegram = async (e) => {
    e.preventDefault();
    setSimResult(null);

    try {
      const res = await fetch('/api/simulate-telegram-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: simText }),
      });
      const data = await res.json();
      setSimResult(data);
    } catch (err) {
      console.error(err);
    }
  };

  const copyCode = (code, lang) => {
    navigator.clipboard.writeText(code);
    setCopiedLang(lang);
    setTimeout(() => setCopiedLang(''), 2000);
  };

  const curlCode = `curl -X POST "https://istep.uz/create" \\
  -H "X-Api-Key: ${apiKey}" \\
  -d "amount=${createAmount}"`;

  const pythonCode = `import requests

response = requests.post(
    "https://istep.uz/create",
    headers={"X-Api-Key": "${apiKey}"},
    data={"amount": ${createAmount}}
)
print(response.json())`;

  const phpCode = `<?php
$ch = curl_init("https://istep.uz/create");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(["amount" => ${createAmount}]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ["X-Api-Key: ${apiKey}"]);
$response = curl_exec($ch);
curl_close($ch);
echo $response;
?>`;

  const jsCode = `fetch("https://istep.uz/create", {
  method: "POST",
  headers: {
    "X-Api-Key": "${apiKey}",
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: new URLSearchParams({ amount: ${createAmount} })
})
.then(res => res.json())
.then(data => console.log(data));`;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* API Code Examples */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-champion/10 dark:bg-limeshade/10 rounded-2xl text-champion dark:text-limeshade">
            <Code className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-display font-black text-gray-900 dark:text-white">API Integratsiya Kod Misollari</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Saytingiz yoki ilovangizdan to'lov yaratish so'rovini yuborish uchun tayyor kod parchalari
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* cURL */}
          <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 relative group">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-mono font-bold text-amber-500 uppercase">cURL (Bash)</span>
              <button
                onClick={() => copyCode(curlCode, 'curl')}
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-xs flex items-center gap-1 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                {copiedLang === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                Nusxalash
              </button>
            </div>
            <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 overflow-x-auto p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">{curlCode}</pre>
          </div>

          {/* Python */}
          <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 relative group">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-mono font-bold text-blue-500 uppercase">Python</span>
              <button
                onClick={() => copyCode(pythonCode, 'python')}
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-xs flex items-center gap-1 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                {copiedLang === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                Nusxalash
              </button>
            </div>
            <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 overflow-x-auto p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">{pythonCode}</pre>
          </div>

          {/* PHP */}
          <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 relative group">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-mono font-bold text-indigo-500 uppercase">PHP</span>
              <button
                onClick={() => copyCode(phpCode, 'php')}
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-xs flex items-center gap-1 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                {copiedLang === 'php' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                Nusxalash
              </button>
            </div>
            <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 overflow-x-auto p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">{phpCode}</pre>
          </div>

          {/* JavaScript */}
          <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 relative group">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-mono font-bold text-emerald-500 uppercase">JavaScript (Fetch)</span>
              <button
                onClick={() => copyCode(jsCode, 'js')}
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-xs flex items-center gap-1 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                {copiedLang === 'js' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                Nusxalash
              </button>
            </div>
            <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 overflow-x-auto p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">{jsCode}</pre>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Create Payment API Test */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Play className="w-5 h-5 text-emerald-500" /> 1. To'lov Yaratish (POST /create)
          </h3>

          <form onSubmit={handleCreatePayment} className="space-y-3">
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">To'lov Summasi (amount)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="flex-1 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-2.5 text-gray-900 dark:text-gray-100 font-bold focus:outline-none focus:ring-2 focus:ring-limeshade text-sm"
                  value={createAmount}
                  onChange={(e) => setCreateAmount(parseInt(e.target.value) || 0)}
                  required
                />
                <button
                  type="submit"
                  className="bg-champion dark:bg-limeshade text-limeshade dark:text-creole font-bold px-5 py-2.5 rounded-2xl flex items-center gap-2 transition shadow-md text-xs hover:scale-105"
                >
                  <Play className="w-4 h-4" /> Yaratish
                </button>
              </div>
            </div>
          </form>

          {createError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs">
              {createError}
            </div>
          )}

          {createResult && (
            <div className="bg-gray-50 dark:bg-gray-950 rounded-2xl p-4 font-mono text-xs text-emerald-600 dark:text-emerald-400 border border-gray-200 dark:border-gray-800 overflow-x-auto">
              <pre>{JSON.stringify(createResult, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* 2. Check Status API Test */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-champion dark:text-limeshade" /> 2. Holatni Tekshirish (GET /status/{'{payment_id}'})
          </h3>

          <form onSubmit={handleCheckStatus} className="space-y-3">
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Payment ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-2.5 text-gray-900 dark:text-gray-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-limeshade"
                  placeholder="payment_id kiriting..."
                  value={checkId}
                  onChange={(e) => setCheckId(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="bg-champion dark:bg-limeshade text-limeshade dark:text-creole font-bold px-5 py-2.5 rounded-2xl flex items-center gap-2 transition shadow-md text-xs hover:scale-105"
                >
                  <Search className="w-4 h-4" /> Tekshirish
                </button>
              </div>
            </div>
          </form>

          {statusResult && (
            <div className="bg-gray-50 dark:bg-gray-950 rounded-2xl p-4 font-mono text-xs text-champion dark:text-limeshade border border-gray-200 dark:border-gray-800 overflow-x-auto">
              <pre>{JSON.stringify(statusResult, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      {/* 3. Telegram Message Parser Test Simulator */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-purple-500" /> 3. Telegram @humocardbot Xabarini Simulyatsiya Qilish
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Telegram botdan kelgan bank bildirishnomasi xabarini avtomatik parser tahlilidan o'tkazish
        </p>

        <form onSubmit={handleSimulateTelegram} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Telegram Xabar Matni</label>
            <textarea
              rows={4}
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-3.5 text-gray-900 dark:text-gray-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-limeshade"
              value={simText}
              onChange={(e) => setSimText(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2 transition shadow-md text-xs hover:scale-[1.02]"
          >
            <Send className="w-4 h-4" /> Xabarni Tahlilga Yuborish
          </button>
        </form>

        {simResult && (
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="font-mono text-xs">
              Natija: {simResult.matched ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Mos to'lov topildi va PAID holatiga o'tkazildi!</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-bold">Mos kutilayotgan to'lov topilmadi.</span>
              )}
            </div>
            <pre className="text-xs font-mono text-gray-500">{JSON.stringify(simResult)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
