/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LogIn, Key, AlertCircle, School, ShieldAlert, Award } from 'lucide-react';
import { Role } from '../types';

interface LoginProps {
  onLogin: (role: Role, identifier: string, password?: string) => string | null; // returns error message if any
  logoUrl?: string;
  schoolName: string;
  adminUsername?: string;
  adminPassword?: string;
}

export default function Login({ onLogin, logoUrl, schoolName, adminUsername = 'admin', adminPassword = 'admin' }: LoginProps) {
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#022c22,transparent_50%),radial-gradient(circle_at_70%_80%,#0f172a,transparent_50%)] pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

        <div className="p-8">
          {/* Logo / Title Area */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center bg-emerald-500/10 rounded-2xl border border-emerald-500/20 mb-4 shadow-inner overflow-hidden ${logoUrl ? 'w-24 h-24 p-1' : 'w-20 h-20 p-3.5'}`}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                <School className="w-12 h-12 text-emerald-400" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">SIAP</h1>
            <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mt-1">Sistem Informasi Akademik Pelajar</p>
            <p className="text-slate-400 text-xs mt-1 max-w-[280px] mx-auto truncate font-medium">{schoolName}</p>
          </div>

          {/* Role Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-950/60 rounded-xl mb-6 border border-slate-800/80">
            {(['ADMIN', 'GURU', 'SISWA'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRole(r);
                  setError(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  role === r
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                {r === 'ADMIN' ? 'Admin' : r === 'GURU' ? 'Guru' : 'Siswa'}
              </button>
            ))}
          </div>

          {/* Alert Notification */}
          {error && (
            <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-xl mb-6 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400" />
              <div>
                <p className="font-semibold">Gagal Masuk</p>
                <p className="text-rose-300/80 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {role === 'SISWA' ? (
              <div>
                <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="nisn">
                  NISN Siswa
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    id="nisn"
                    type="text"
                    required
                    placeholder="Masukkan NISN Anda (contoh: 1234567890)"
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 text-sm focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="username">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                      <LogIn className="w-4 h-4" />
                    </span>
                    <input
                      id="username"
                      type="text"
                      required
                      placeholder={role === 'ADMIN' ? 'Username Admin' : 'Username Guru'}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-950/40 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 text-sm focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="password">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                      <Key className="w-4 h-4" />
                    </span>
                    <input
                      id="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950/40 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 text-sm focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 text-sm disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk Aplikasi</span>
                  <LogIn className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Info */}
        <div className="px-8 py-4 bg-slate-950/30 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
          <span>versi 1</span>
          <span className="flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-emerald-500/60" /> Secure System
          </span>
        </div>
      </div>
    </div>
  );
}
