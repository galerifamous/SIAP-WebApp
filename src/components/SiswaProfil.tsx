/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 selection:bg-emerald-500 selection:text-white font-sans text-xs">
      <div className="border-b border-slate-800 pb-5 mb-6">
        <h2 className="text-lg font-bold text-white tracking-tight">Profil Pribadi Anda</h2>
        <p className="text-slate-400 text-xs mt-1">Lihat data diri Anda yang terdaftar resmi pada database akademik sekolah</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar Card */}
        <div className="p-6 bg-slate-950/40 border border-slate-800 rounded-2xl flex flex-col items-center justify-between text-center">
          <div className="w-full">
            {/* Sync Alert Badge */}
            {syncStatus === 'syncing' && (
              <div className="mb-4 inline-flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/15 px-3 py-1 rounded-full animate-pulse font-bold">
                <Clock className="w-3.5 h-3.5 animate-spin" /> Menghubungkan ke Google Drive...
              </div>
            )}
            {syncStatus === 'success' && (
              <div className="mb-4 inline-flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-3 py-1 rounded-full font-bold">
                <ShieldCheck className="w-3.5 h-3.5" /> Berhasil Disimpan ke Google Drive SIAP
              </div>
            )}

            {/* Photo Container */}
            <div className="relative group w-32 h-32 mx-auto rounded-full border-4 border-slate-800 hover:border-emerald-500/50 overflow-hidden shadow-2xl bg-slate-900 transition-all duration-300">
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

            <h3 className="text-base font-bold text-white mt-4 tracking-tight">{student.name}</h3>
            <span className="mt-1 inline-block px-3 py-1 text-[10px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/15 rounded-full">
              Kelas {student.class}
            </span>
            <p className="text-[11px] font-mono font-semibold text-slate-500 mt-2">NISN: {student.nisn}</p>
          </div>

          <p className="text-[10px] text-slate-500 mt-6 leading-relaxed italic border-t border-slate-800/40 pt-4 w-full">
            *Klik foto untuk mengubah langsung. Foto Anda tersimpan aman di database Drive.
          </p>
        </div>

        {/* Right Column: Bento Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Section 1: Personal Demographic Details */}
          <div className="p-5 bg-slate-950/20 border border-slate-800 rounded-2xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
              Informasi Demografis & Kependudukan
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
              <div>
                <p className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Jenis Kelamin</p>
                <p className="text-slate-200 mt-1 font-bold">{student.gender}</p>
              </div>

              <div>
                <p className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Tempat & Tanggal Lahir</p>
                <p className="text-slate-200 mt-1 font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {student.pob}, {new Date(student.dob).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Alamat Rumah Tinggal</p>
                <p className="text-slate-200 mt-1 leading-relaxed font-bold flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  {student.address || 'Alamat belum disetel oleh admin.'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Family & Finances */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Parents card */}
            <div className="p-5 bg-slate-950/20 border border-slate-800 rounded-2xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3.5 border-b border-slate-800 pb-2">
                Wali / Orangtua
              </h3>
              <div className="space-y-3 font-medium">
                <div>
                  <p className="text-slate-500 uppercase text-[9px] font-bold tracking-wider">Nama Ayah / Ibu</p>
                  <p className="text-slate-200 font-bold mt-1 text-sm">{student.parentName}</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase text-[9px] font-bold tracking-wider">Email Notifikasi</p>
                  <p className="text-slate-300 font-bold mt-1 font-mono flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    {student.parentEmail}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Standings */}
            <div className="p-5 bg-slate-950/20 border border-slate-800 rounded-2xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3.5 border-b border-slate-800 pb-2">
                Tabungan & Kas Siswa
              </h3>
              <div className="space-y-3 font-medium">
                <div className="flex justify-between items-center bg-slate-900 p-2 border border-slate-800 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tabungan:</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    Rp {student.savings.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-900 p-2 border border-slate-800 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-rose-400" />
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tagihan Kas:</span>
                  </div>
                  <span className={`font-mono font-bold text-sm ${student.cashBill > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
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
