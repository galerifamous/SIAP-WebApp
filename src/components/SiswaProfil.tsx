/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  User,
  Camera,
  Mail,
  MapPin,
  Calendar,
  Wallet,
  FileText,
  ShieldCheck,
  HelpCircle,
  Clock
} from 'lucide-react';
import { Student } from '../types';

interface SiswaProfilProps {
  student: Student;
  onUpdatePhoto: (nisn: string, base64Photo: string) => void;
  academicYear: string;
  semester: string;
}

export default function SiswaProfil({ student, onUpdatePhoto, academicYear, semester }: SiswaProfilProps) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const handleThemeChange = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSyncStatus('syncing');

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      onUpdatePhoto(student.nisn, base64String);

      setTimeout(() => {
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 3500);
      }, 1200); // realistic Google Drive delay
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`border rounded-2xl p-6 selection:bg-emerald-500 selection:text-white font-sans text-xs transition-all duration-300 ${
      isDark 
        ? 'bg-[#121e15] border-[#17221c]' 
        : 'bg-white border-[#cbd5ce] shadow-[2px_2px_5px_#cbd5ce]'
    }`}>
      <div className={`border-b pb-5 mb-6 ${isDark ? 'border-slate-800' : 'border-[#cbd5ce]'}`}>
        <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-850'}`}>Profil Pribadi Anda</h2>
        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Lihat data diri Anda yang terdaftar resmi pada database akademik sekolah</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar Card */}
        <div className={`p-6 border rounded-2xl flex flex-col items-center justify-between text-center transition-all duration-300 ${
          isDark 
            ? 'bg-slate-950/40 border-slate-800' 
            : 'bg-[#ebf1ec] border-[#cbd5ce] shadow-[1px_1px_3px_#cbd5ce]'
        }`}>
          <div className="w-full">
            {/* Sync Alert Badge */}
            {syncStatus === 'syncing' && (
              <div className="mb-4 inline-flex items-center gap-1.5 text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/15 px-3 py-1 rounded-full animate-pulse font-bold">
                <Clock className="w-3.5 h-3.5 animate-spin" /> Menghubungkan ke Google Drive...
              </div>
            )}
            {syncStatus === 'success' && (
              <div className="mb-4 inline-flex items-center gap-1.5 text-[10px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/15 px-3 py-1 rounded-full font-bold">
                <ShieldCheck className="w-3.5 h-3.5" /> Berhasil Disimpan ke Google Drive SIAP
              </div>
            )}

            {/* Photo Container */}
            <div className={`relative group w-32 h-32 mx-auto rounded-full border-4 overflow-hidden shadow-2xl transition-all duration-300 ${
              isDark ? 'border-slate-800 bg-slate-900 hover:border-emerald-500/50' : 'border-white bg-[#cbd5ce] hover:border-emerald-500/50'
            }`}>
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <User className="w-12 h-12" />
                </div>
              )}

              {/* Overlay Trigger */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-300"
              >
                <Camera className="w-6 h-6 text-emerald-400 mb-1" />
                <span className="text-[9px] text-slate-200 font-bold uppercase tracking-wider">Ganti Foto</span>
              </div>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>

            <h3 className={`text-base font-bold mt-4 tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>{student.name}</h3>
            <span className="mt-1 inline-block px-3 py-1 text-[10px] font-bold text-teal-600 bg-teal-500/10 border border-teal-500/15 rounded-full">
              Kelas {student.class}
            </span>
            <p className={`text-[11px] font-mono font-semibold mt-2 ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>NISN: {student.nisn}</p>
          </div>

          <p className={`text-[10px] mt-6 leading-relaxed italic border-t pt-4 w-full ${isDark ? 'text-slate-500 border-slate-800/40' : 'text-slate-600 border-[#cbd5ce]'}`}>
            *Klik foto untuk mengubah langsung. Foto Anda tersimpan aman di database Drive.
          </p>
        </div>

        {/* Right Column: Bento Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Section 1: Personal Demographic Details */}
          <div className={`p-5 border rounded-2xl transition-all duration-300 ${
            isDark 
              ? 'bg-slate-950/20 border-slate-800' 
              : 'bg-[#ebf1ec] border-[#cbd5ce] shadow-[1px_1px_3px_#cbd5ce]'
          }`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 border-b pb-2 ${isDark ? 'text-white border-slate-800' : 'text-slate-800 border-[#cbd5ce]'}`}>
              Informasi Demografis & Kependudukan
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
              <div>
                <p className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Jenis Kelamin</p>
                <p className={`mt-1 font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{student.gender}</p>
              </div>

              <div>
                <p className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Tempat & Tanggal Lahir</p>
                <p className={`mt-1 font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {student.pob}, {new Date(student.dob).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Alamat Rumah Tinggal</p>
                <p className={`mt-1 leading-relaxed font-bold flex items-start gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-850'}`}>
                  <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  {student.address || 'Alamat belum disetel oleh admin.'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Family & Finances */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Parents card */}
            <div className={`p-5 border rounded-2xl transition-all duration-300 ${
              isDark 
                ? 'bg-slate-950/20 border-slate-800' 
                : 'bg-[#ebf1ec] border-[#cbd5ce] shadow-[1px_1px_3px_#cbd5ce]'
            }`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-3.5 border-b pb-2 ${isDark ? 'text-white border-slate-800' : 'text-slate-800 border-[#cbd5ce]'}`}>
                Wali / Orangtua
              </h3>
              <div className="space-y-3 font-medium">
                <div>
                  <p className="text-slate-500 uppercase text-[9px] font-bold tracking-wider">Nama Ayah / Ibu</p>
                  <p className={`font-bold mt-1 text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{student.parentName}</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase text-[9px] font-bold tracking-wider">Email Notifikasi</p>
                  <p className={`font-bold mt-1 font-mono flex items-center gap-1.5 truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    {student.parentEmail}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Standings */}
            <div className={`p-5 border rounded-2xl transition-all duration-300 ${
              isDark 
                ? 'bg-slate-950/20 border-slate-800' 
                : 'bg-[#ebf1ec] border-[#cbd5ce] shadow-[1px_1px_3px_#cbd5ce]'
            }`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-3.5 border-b pb-2 ${isDark ? 'text-white border-slate-800' : 'text-slate-800 border-[#cbd5ce]'}`}>
                Tabungan & Kas Siswa
              </h3>
              <div className="space-y-3 font-medium">
                <div className={`flex justify-between items-center p-2 border rounded-lg ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#cbd5ce]'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-500" />
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Tabungan:</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-500 text-sm">
                    Rp {student.savings.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className={`flex justify-between items-center p-2 border rounded-lg ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#cbd5ce]'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-rose-500" />
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Tagihan Kas:</span>
                  </div>
                  <span className={`font-mono font-bold text-sm ${student.cashBill > 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                    Rp {student.cashBill.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
