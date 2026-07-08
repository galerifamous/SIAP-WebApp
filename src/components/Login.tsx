/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LogIn, Key, AlertCircle, School, Award, Sun, Moon } from 'lucide-react';
import { Role } from '../types';

interface LoginProps {
  onLogin: (role: Role, identifier: string, password?: string) => string | null; // returns error message if any
  logoUrl?: string;
  schoolName: string;
  adminUsername?: string;
  adminPassword?: string;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Login({ 
  onLogin, 
  logoUrl, 
  schoolName, 
  darkMode, 
  onToggleDarkMode 
}: LoginProps) {
  const [role, setRole] = useState<Role>('ADMIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nisn, setNisn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      let resMsg: string | null = null;
      if (role === 'SISWA') {
        if (!nisn.trim()) {
          resMsg = 'NISN harus diisi';
        } else {
          resMsg = onLogin('SISWA', nisn);
        }
      } else {
        if (!username.trim() || !password.trim()) {
          resMsg = 'Username dan password harus diisi';
        } else {
          resMsg = onLogin(role, username, password);
        }
      }

      setLoading(false);
      if (resMsg) {
        setError(resMsg);
      }
    }, 400);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white font-sans transition-colors duration-300 ${
      darkMode ? 'bg-[#0f1612]' : 'bg-[#f0f5f1]'
    }`}>
      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={onToggleDarkMode}
          className={`p-3 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 ${
            darkMode
              ? 'bg-[#0f1612] text-amber-400 shadow-[inset_2px_2px_5px_#070a08,inset_-2px_-2px_5px_#17221c] border border-[#17221c]'
              : 'bg-[#f0f5f1] text-emerald-600 shadow-[4px_4px_10px_#dce3dd,-4px_-4px_10px_#ffffff] border border-white'
          }`}
          title={darkMode ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'}
        >
          {darkMode ? <Sun className="w-4 h-4 animate-spin-slow" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <div className={`relative w-full max-w-md p-8 overflow-hidden transition-all duration-300 ${
        darkMode ? 'nm-card-dark-green' : 'nm-card-light-green'
      }`}>
        {/* Logo / Title Area */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center mb-4 overflow-hidden p-1 transition-all duration-300 ${
            darkMode 
              ? 'bg-[#0f1612] shadow-[inset_2px_2px_5px_#070a08,inset_-2px_-2px_5px_#17221c] border border-[#17221c] rounded-2xl w-20 h-20' 
              : 'bg-[#f0f5f1] shadow-[inset_3px_3px_6px_#cbd5ce,inset_-3px_-3px_6px_#ffffff] border border-white rounded-2xl w-20 h-20'
          }`}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <School className={`w-10 h-10 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
            )}
          </div>
          <h1 className={`text-2xl font-bold tracking-tight transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-800'}`}>SIAP</h1>
          <p className={`text-xs font-semibold uppercase tracking-widest mt-1 transition-colors duration-300 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Sistem Informasi Akademik Pelajar</p>
          <p className={`text-xs mt-1 max-w-[280px] mx-auto truncate font-medium transition-colors duration-300 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{schoolName}</p>
        </div>

        {/* Role Tabs */}
        <div className={`grid grid-cols-3 gap-2 p-1.5 rounded-xl mb-6 transition-all duration-300 ${
          darkMode ? 'nm-inset-dark' : 'nm-inset-light'
        }`}>
          {(['ADMIN', 'GURU', 'SISWA'] as Role[]).map((r) => {
            const isActive = role === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRole(r);
                  setError(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all duration-300 cursor-pointer ${
                  isActive
                    ? darkMode
                      ? 'nm-btn-dark-green text-slate-950 font-bold bg-emerald-500 border-none'
                      : 'nm-btn-light-green text-white font-bold bg-emerald-500 border-none'
                    : darkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {r === 'ADMIN' ? 'Admin' : r === 'GURU' ? 'Guru' : 'Siswa'}
              </button>
            );
          })}
        </div>

        {/* Alert Notification */}
        {error && (
          <div className={`flex items-start gap-3 p-3.5 rounded-xl mb-6 text-xs animate-shake border transition-all duration-300 ${
            darkMode 
              ? 'bg-rose-950/20 border-rose-900/40 text-rose-300' 
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${darkMode ? 'text-rose-400' : 'text-rose-600'}`} />
            <div>
              <p className="font-semibold">Gagal Masuk</p>
              <p className={`mt-0.5 ${darkMode ? 'text-rose-300/80' : 'text-rose-600/80'}`}>{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {role === 'SISWA' ? (
            <div>
              <label className={`block text-xs font-semibold mb-1.5 transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} htmlFor="nisn">
                NISN Siswa
              </label>
              <div className={`relative flex items-center rounded-xl transition-all duration-300 ${darkMode ? 'nm-inset-dark' : 'nm-inset-light'}`}>
                <span className={`absolute left-3.5 pointer-events-none transition-colors duration-300 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Key className="w-4 h-4" />
                </span>
                <input
                  id="nisn"
                  type="text"
                  required
                  placeholder="Masukkan NISN Anda (contoh: 1234567890)"
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value)}
                  className={`w-full bg-transparent py-2.5 pl-10 pr-4 text-sm focus:outline-none transition-all rounded-xl ${
                    darkMode ? 'text-slate-200 placeholder:text-slate-600' : 'text-slate-800 placeholder:text-slate-400'
                  }`}
                />
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className={`block text-xs font-semibold mb-1.5 transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} htmlFor="username">
                  Username
                </label>
                <div className={`relative flex items-center rounded-xl transition-all duration-300 ${darkMode ? 'nm-inset-dark' : 'nm-inset-light'}`}>
                  <span className={`absolute left-3.5 pointer-events-none transition-colors duration-300 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    <LogIn className="w-4 h-4" />
                  </span>
                  <input
                    id="username"
                    type="text"
                    required
                    placeholder={role === 'ADMIN' ? 'Username Admin' : 'Username Guru'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full bg-transparent py-2.5 pl-10 pr-4 text-sm focus:outline-none transition-all rounded-xl ${
                      darkMode ? 'text-slate-200 placeholder:text-slate-600' : 'text-slate-800 placeholder:text-slate-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} htmlFor="password">
                  Kata Sandi
                </label>
                <div className={`relative flex items-center rounded-xl transition-all duration-300 ${darkMode ? 'nm-inset-dark' : 'nm-inset-light'}`}>
                  <span className={`absolute left-3.5 pointer-events-none transition-colors duration-300 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full bg-transparent py-2.5 pl-10 pr-4 text-sm focus:outline-none transition-all rounded-xl ${
                      darkMode ? 'text-slate-200 placeholder:text-slate-600' : 'text-slate-800 placeholder:text-slate-400'
                    }`}
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-bold py-2.5 px-4 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-6 text-sm disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${
              darkMode 
                ? 'nm-btn-dark-green bg-emerald-500 text-slate-950 hover:bg-emerald-400' 
                : 'nm-btn-light-green bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {loading ? (
              <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${darkMode ? 'border-slate-950' : 'border-white'}`} />
            ) : (
              <>
                <span>Masuk Aplikasi</span>
                <LogIn className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Info */}
        <div className={`mt-8 pt-4 border-t flex justify-between items-center text-[10px] font-semibold tracking-wider uppercase transition-colors duration-300 ${
          darkMode ? 'border-slate-800/60 text-slate-600' : 'border-slate-300/60 text-slate-400'
        }`}>
          <span>SIAP Akademik</span>
          <span className="flex items-center gap-1">
            <Award className={`w-3.5 h-3.5 ${darkMode ? 'text-emerald-500/60' : 'text-emerald-600/60'}`} /> Secure System
          </span>
        </div>
      </div>
    </div>
  );
}
