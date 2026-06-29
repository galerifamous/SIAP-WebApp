/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  Laptop,
  CheckCircle,
  Sparkles,
  Info,
  Monitor,
  Share2,
  ShieldCheck,
  Zap,
  Check
} from 'lucide-react';

interface UnduhAplikasiSecProps {
  schoolName: string;
}

export default function UnduhAplikasiSec({ schoolName }: UnduhAplikasiSecProps) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const handleThemeChange = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const [deviceType, setDeviceType] = useState<'desktop' | 'android' | 'ios'>('desktop');
  const [isNativePromptAvailable, setIsNativePromptAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [downloadedLauncher, setDownloadedLauncher] = useState(false);

  // Detect Device Type at load
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) {
      setDeviceType('android');
    } else if (/iphone|ipad|ipod/.test(ua)) {
      setDeviceType('ios');
    } else {
      setDeviceType('desktop');
    }

    // Listen to standard beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsNativePromptAvailable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
        setDeferredPrompt(null);
        setIsNativePromptAvailable(false);
      }
    } else {
      alert('Fitur PWA native belum didukung penuh oleh sandbox iframe browser Anda. Silakan ikuti panduan manual di bawah ini yang dijamin 100% berhasil!');
    }
  };

  const handleDownloadLauncher = () => {
    const appUrl = window.location.origin;
    const launcherHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>SIAP - ${schoolName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.5">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #0f172a;
            color: #ffffff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
          }
          .card {
            background-color: #1e293b;
            padding: 40px;
            border-radius: 24px;
            border: 1px solid #334155;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
            max-width: 400px;
          }
          h1 { font-size: 22px; margin-bottom: 10px; color: #10b981; }
          p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 25px; }
          .btn {
            background-color: #10b981;
            color: #0f172a;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 12px;
            font-weight: bold;
            display: inline-block;
            transition: transform 0.2s;
          }
          .btn:hover { transform: scale(1.05); }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Membuka Aplikasi SIAP</h1>
          <p>Mengarahkan Anda langsung ke portal Sistem Informasi Akademik Pelajar resmi ${schoolName}...</p>
          <a href="${appUrl}" class="btn">Masuk Portal</a>
        </div>
        <script>
          setTimeout(function() {
            window.location.href = "${appUrl}";
          }, 800);
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([launcherHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SIAP_Launcher_${schoolName.replace(/\s+/g, '_')}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadedLauncher(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className={`border rounded-2xl p-6 selection:bg-emerald-500 selection:text-white font-sans text-xs transition-all duration-300 ${
      isDark 
        ? 'bg-[#121e15] border-[#17221c]' 
        : 'bg-white border-[#cbd5ce] shadow-[2px_2px_5px_#cbd5ce]'
    }`}>
      
      {/* Top Banner Header */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-5 mb-6 ${
        isDark ? 'border-slate-800' : 'border-[#cbd5ce]'
      }`}>
        <div>
          <h2 className={`text-lg font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-850'}`}>
            <Download className="w-5 h-5 text-emerald-500" /> Unduh & Pasang Aplikasi
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Pasang portal aplikasi SIAP langsung di HP, Tablet, atau Laptop Anda (PWA) agar lebih mudah dan cepat diakses kapanpun!
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-mono font-bold border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
            <Zap className="w-3.5 h-3.5" /> PWA Standalone App
          </span>
        </div>
      </div>

      {/* PORTAL INSTALASI PWA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Instant PWA Installer Controls */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Quick Install Action Box */}
          <div className={`p-5 rounded-2xl relative overflow-hidden border ${
            isDark 
              ? 'bg-gradient-to-br from-slate-950 to-slate-900 border-slate-800' 
              : 'bg-gradient-to-br from-[#ebf1ec] to-white border-[#cbd5ce] shadow-[1px_1px_4px_#cbd5ce]'
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-850'}`}>Instalasi Aplikasi Cepat (PWA)</h3>
                <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tekan tombol di bawah untuk memasang aplikasi langsung ke layar utama perangkat Anda.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleNativeInstall}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-emerald-500/5 cursor-pointer"
              >
                <Download className="w-4.5 h-4.5" />
                <span>Pasang Aplikasi Langsung</span>
              </button>

              <button
                onClick={handleDownloadLauncher}
                className={`flex items-center justify-center gap-2 px-4 py-3 font-bold rounded-xl transition border hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' 
                    : 'bg-[#ebf1ec] hover:bg-[#cbd5ce] text-slate-800 border-[#cbd5ce]'
                }`}
              >
                <Laptop className="w-4.5 h-4.5 text-teal-500" />
                <span>Unduh File Launcher</span>
              </button>
            </div>

            {downloadedLauncher && (
              <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-start gap-2 text-[10px] text-emerald-500">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Launcher Berhasil Diunduh!</span> Simpan file ini di desktop komputer Anda. Kapanpun Anda membuka file ini, portal SIAP akan terbuka otomatis di browser Anda dalam ukuran penuh yang lancar.
                </div>
              </div>
            )}
          </div>

          {/* Device Tabs Selector */}
          <div>
            <h4 className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Panduan Instalasi Manual Menurut Perangkat Anda
            </h4>
            <div className={`flex p-1 border rounded-xl gap-1 ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-[#ebf1ec] border-[#cbd5ce]'}`}>
              <button
                onClick={() => setDeviceType('desktop')}
                className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  deviceType === 'desktop' 
                    ? (isDark ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-850 shadow') 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>Laptop & Komputer</span>
              </button>
              <button
                onClick={() => setDeviceType('android')}
                className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  deviceType === 'android' 
                    ? (isDark ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-850 shadow') 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-500" />
                <span>HP Android</span>
              </button>
              <button
                onClick={() => setDeviceType('ios')}
                className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  deviceType === 'ios' 
                    ? (isDark ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-850 shadow') 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-4 h-4 text-amber-500" />
                <span>iPhone / iOS</span>
              </button>
            </div>
          </div>

          {/* Dynamic Steps based on tab selection */}
          <div className={`p-5 border rounded-2xl space-y-4 ${
            isDark ? 'bg-slate-950/20 border-slate-800/80' : 'bg-white border-[#cbd5ce] shadow-[1px_1px_3px_#cbd5ce]'
          }`}>
            {deviceType === 'desktop' && (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 font-bold ${isDark ? 'text-white' : 'text-slate-850'}`}>
                  <Monitor className="w-4.5 h-4.5 text-emerald-500" />
                  <span>Petunjuk Pemasangan di Google Chrome / Microsoft Edge Desktop</span>
                </div>
                <div className={`space-y-3 pl-1 text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <div className="flex gap-3">
                    <span className={`w-5 h-5 font-bold rounded-full flex items-center justify-center text-[10px] ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-[#ebf1ec] text-slate-700'}`}>1</span>
                    <p>Buka portal aplikasi SIAP di browser utama laptop Anda.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className={`w-5 h-5 font-bold rounded-full flex items-center justify-center text-[10px] ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-[#ebf1ec] text-slate-700'}`}>2</span>
                    <div>
                      <p>Perhatikan bagian <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>Address Bar (kolom URL)</strong> di bagian atas browser Anda.</p>
                      <p className="text-[10px] text-slate-500 mt-1">Akan muncul tombol bergambar laptop dengan tanda panah ke bawah (Install SIAP) atau ikon plus (+).</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className={`w-5 h-5 font-bold rounded-full flex items-center justify-center text-[10px] ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-[#ebf1ec] text-slate-700'}`}>3</span>
                    <p>Klik ikon tersebut, lalu konfirmasi dengan menekan tombol <strong className="text-emerald-500">"Install"</strong>.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className={`w-5 h-5 font-bold rounded-full flex items-center justify-center text-[10px] ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-[#ebf1ec] text-slate-700'}`}>4</span>
                    <p>Aplikasi akan terpasang di komputer Anda dan dapat langsung diluncurkan lewat ikon pintasan di desktop atau menu start komputer.</p>
                  </div>
                </div>
              </div>
            )}

            {deviceType === 'android' && (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 font-bold ${isDark ? 'text-white' : 'text-slate-850'}`}>
                  <Smartphone className="w-4.5 h-4.5 text-emerald-500" />
                  <span>Petunjuk Pemasangan di HP Android (Google Chrome)</span>
                </div>
                <div className={`space-y-3 pl-1 text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <div className="flex gap-3">
                    <span className={`w-5 h-5 font-bold rounded-full flex items-center justify-center text-[10px] ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-[#ebf1ec] text-slate-700'}`}>1</span>
                    <p>Buka link aplikasi ini di HP Android Anda menggunakan aplikasi browser <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>Google Chrome</strong>.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className={`w-5 h-5 font-bold rounded-full flex items-center justify-center text-[10px] ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-[#ebf1ec] text-slate-700'}`}>2</span>
                    <p>Tap tombol <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>titik tiga (menu browser)</strong> di pojok kanan atas layar Chrome Anda.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className={`w-5 h-5 font-bold rounded-full flex items-center justify-center text-[10px] ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-[#ebf1ec] text-slate-700'}`}>3</span>
                    <p>Pilih menu <strong className="text-emerald-500">"Instal Aplikasi"</strong> atau <strong className="text-emerald-500">"Tambahkan ke Layar Utama"</strong>.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className={`w-5 h-5 font-bold rounded-full flex items-center justify-center text-[10px] ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-[#ebf1ec] text-slate-700'}`}>4</span>
                    <p>Tunggu beberapa detik hingga proses instalasi latar belakang selesai. Sekarang aplikasi Anda siap digunakan tanpa memakan memori!</p>
                  </div>
                </div>
              </div>
            )}

            {deviceType === 'ios' && (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 font-bold ${isDark ? 'text-white' : 'text-slate-850'}`}>
                  <Smartphone className="w-4.5 h-4.5 text-amber-500" />
                  <span>Petunjuk Pemasangan di iPhone / iPad (Safari)</span>
                </div>
                <div className={`space-y-3 pl-1 text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <div className="flex gap-3">
                    <span className={`w-5 h-5 font-bold rounded-full flex items-center justify-center text-[10px] ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-[#ebf1ec] text-slate-700'}`}>1</span>
                    <p>Buka link aplikasi ini menggunakan browser bawaan <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>Safari</strong> di iPhone/iPad Anda.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className={`w-5 h-5 font-bold rounded-full flex items-center justify-center text-[10px] ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-[#ebf1ec] text-slate-700'}`}>2</span>
                    <p>Tap tombol <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>"Share" (ikon kotak dengan panah ke atas)</strong> di bagian bawah layar.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className={`w-5 h-5 font-bold rounded-full flex items-center justify-center text-[10px] ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-[#ebf1ec] text-slate-700'}`}>3</span>
                    <p>Scroll ke bawah dan pilih menu <strong className="text-emerald-500">"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className={`w-5 h-5 font-bold rounded-full flex items-center justify-center text-[10px] ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-[#ebf1ec] text-slate-700'}`}>4</span>
                    <p>Tap <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>"Add" (Tambah)</strong> di pojok kanan atas. Pintasan aplikasi akan muncul di homescreen Anda bagai aplikasi App Store resmi.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Why use PWA / Application Features Showcase */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Showcase card */}
          <div className={`p-5 border rounded-2xl space-y-4 ${
            isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-[#ebf1ec] border-[#cbd5ce] shadow-[1px_1px_3px_#cbd5ce]'
          }`}>
            <h3 className={`font-bold uppercase tracking-wider text-[11px] flex items-center gap-2 border-b pb-2 ${
              isDark ? 'text-white border-slate-800' : 'text-slate-800 border-[#cbd5ce]'
            }`}>
              <Sparkles className="w-4 h-4 text-emerald-500" /> Kelebihan Aplikasi SIAP Digital
            </h3>

            <div className="space-y-3.5">
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className={`font-bold text-[11px] ${isDark ? 'text-white' : 'text-slate-800'}`}>Sangat Ringan & Responsif</h5>
                  <p className={`text-[10px] mt-0.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Berjalan mulus tanpa lag bahkan di perangkat dengan spesifikasi rendah sekalipun.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className={`font-bold text-[11px] ${isDark ? 'text-white' : 'text-slate-800'}`}>Aman & Terenkripsi</h5>
                  <p className={`text-[10px] mt-0.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Menggunakan protokol keamanan modern untuk menjamin privasi data akademis madrasah.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className={`font-bold text-[11px] ${isDark ? 'text-white' : 'text-slate-800'}`}>Integrasi Barcode Absensi</h5>
                  <p className={`text-[10px] mt-0.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Siswa dapat langsung menunjukkan kartu digital di layar HP mereka untuk di-scan absensi kelas.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick share or browser link copy tool */}
          <div className={`p-5 border rounded-2xl space-y-3 ${
            isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-[#ebf1ec] border-[#cbd5ce] shadow-[1px_1px_3px_#cbd5ce]'
          }`}>
            <h4 className={`font-bold text-[11px] flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              <Share2 className="w-4 h-4 text-emerald-500" /> Bagikan Link Aplikasi Ke Pengguna
            </h4>
            <p className={`text-[10px] leading-normal ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Salin link resmi ini untuk dikirimkan melalui grup WhatsApp siswa atau guru agar mereka dapat mengunduhnya secara serempak.</p>
            
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={window.location.origin}
                className={`flex-1 rounded-lg px-2.5 py-1.5 font-mono text-[9px] focus:outline-none ${
                  isDark ? 'bg-slate-900 border border-slate-800 text-slate-300' : 'bg-white border border-[#cbd5ce] text-slate-700 shadow-sm'
                }`}
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isCopied ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                {isCopied ? <Check className="w-3.5 h-3.5" /> : 'Salin'}
              </button>
            </div>
          </div>

          {/* Tip Box */}
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex gap-3">
            <Info className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className={`text-[10px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <strong className={isDark ? 'text-white' : 'text-slate-850'}>Tips Standalone:</strong> Setelah aplikasi terinstal di HP Anda, jalankan langsung dari homescreen. Aplikasi akan membuang kolom address bar browser sehingga seluruh tampilan menjadi sangat luas bagai aplikasi native biasa.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
