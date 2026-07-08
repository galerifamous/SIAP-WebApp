/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Check,
  CheckSquare,
  Square,
  Users,
  GraduationCap,
  Info,
  Calendar,
  Sparkles,
  ChevronRight,
  AlertCircle,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { Student, AcademicSetting } from '../types';

interface NaikKelasSecProps {
  students: Student[];
  availableClasses: string[];
  academicSetting: AcademicSetting;
  onPromoteStudents: (
    promotedNisns: string[],
    targetClass: string,
    nextYear: string,
    carryOverSavings: boolean,
    carryOverCash: boolean
  ) => void;
  role: 'ADMIN' | 'GURU' | 'SISWA';
}

export default function NaikKelasSec({
  students,
  availableClasses,
  academicSetting,
  onPromoteStudents,
  role
}: NaikKelasSecProps) {
  const [sourceYear, setSourceYear] = useState<string>(academicSetting.activeYear);
  const [selectedClass, setSelectedClass] = useState<string>(availableClasses[0] || '');
  const [targetClass, setTargetClass] = useState<string>('');
  const [targetYear, setTargetYear] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [carryOverSavings, setCarryOverSavings] = useState<boolean>(true);
  const [carryOverCash, setCarryOverCash] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [promoSummary, setPromoSummary] = useState<{
    count: number;
    fromClass: string;
    toClass: string;
    newYear: string;
  } | null>(null);

  // Auto-detect and suggest next academic year
  const getNextAcademicYear = (currentYear: string) => {
    const parts = currentYear.split('/');
    if (parts.length === 2) {
      const y1 = parseInt(parts[0], 10);
      const y2 = parseInt(parts[1], 10);
      if (!isNaN(y1) && !isNaN(y2)) {
        return `${y1 + 1}/${y2 + 1}`;
      }
    }
    return currentYear;
  };

  // Auto-detect and suggest target class (e.g., VII-A -> VIII-A, VIII-A -> IX-A, IX -> Alumni)
  const getSuggestedClass = (currentClass: string, classesList: string[]) => {
    if (!currentClass) return '';
    if (currentClass.startsWith('VII-')) {
      const suffix = currentClass.substring(4); // e.g. "A" or "B"
      const candidate = `VIII-${suffix}`;
      return classesList.includes(candidate) ? candidate : classesList.find(c => c.startsWith('VIII')) || '';
    }
    if (currentClass.startsWith('VIII-')) {
      const suffix = currentClass.substring(5); // e.g. "A" or "B"
      const candidate = `IX-${suffix}`;
      return classesList.includes(candidate) ? candidate : classesList.find(c => c.startsWith('IX')) || '';
    }
    if (currentClass.startsWith('IX-')) {
      return 'LULUS (ALUMNI)';
    }
    return '';
  };

  // Filter students in the selected source class and source year
  const classStudents = students.filter(
    s => (s.academicYear || '2025/2026') === sourceYear && s.class === selectedClass
  );

  // Update suggestions when source class or year changes
  useEffect(() => {
    if (selectedClass) {
      const suggested = getSuggestedClass(selectedClass, availableClasses);
      setTargetClass(suggested || 'LULUS (ALUMNI)');
      setTargetYear(getNextAcademicYear(sourceYear));
      
      // Pre-select all students in this class and year for promotion
      const matchingNisns = students
        .filter(s => (s.academicYear || '2025/2026') === sourceYear && s.class === selectedClass)
        .map(s => s.nisn);
      setSelectedStudents(matchingNisns);
    }
  }, [selectedClass, sourceYear, students]);

  // Toggle single student selection
  const handleToggleStudent = (nisn: string) => {
    setSelectedStudents(prev =>
      prev.includes(nisn) ? prev.filter(n => n !== nisn) : [...prev, nisn]
    );
  };

  // Toggle select all
  const handleToggleAll = () => {
    if (selectedStudents.length === classStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(classStudents.map(s => s.nisn));
    }
  };

  // Handle processing promotion
  const handleProcessPromotion = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudents.length === 0) return;

    // Save summary details to show on success screen
    setPromoSummary({
      count: selectedStudents.length,
      fromClass: selectedClass,
      toClass: targetClass,
      newYear: targetYear
    });

    // Execute callback with carryover values
    onPromoteStudents(selectedStudents, targetClass, targetYear, carryOverSavings, carryOverCash);
    setIsSuccess(true);
  };

  // Handle resetting back to normal state after success
  const handleDone = () => {
    setIsSuccess(false);
    setPromoSummary(null);
  };

  return (
    <div className="space-y-6">
      {/* Header section with elegant title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400">
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">AKUN {role} • MENU KHUSUS</span>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Kenaikan Kelas & Pemindahan Rombel</h2>
          <p className="text-xs text-slate-400">Menaikan kelas siswa secara massal ke tingkat kelas berikutnya dan memajukan tahun ajaran baru.</p>
        </div>
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl shrink-0">
          <Calendar className="w-5 h-5 text-emerald-400" />
          <div className="text-left leading-tight">
            <span className="block text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Tahun Ajaran Aktif</span>
            <span className="text-xs font-black text-emerald-400">{academicSetting.activeYear} ({academicSetting.activeSemester})</span>
          </div>
        </div>
      </div>

      {isSuccess && promoSummary ? (
        /* Success Screen */
        <div className="p-8 bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-xl text-center space-y-6 max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <ShieldCheck className="w-10 h-10 text-emerald-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black text-white">Proses Kenaikan Kelas Berhasil!</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Siswa dari rombel <strong className="text-white">{promoSummary.fromClass}</strong> telah berhasil diproses naik kelas.
            </p>
          </div>

          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-left space-y-3">
            <h4 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-1 uppercase tracking-wide">Rincian Hasil Kenaikan Kelas</h4>
            <div className="grid grid-cols-2 gap-4 text-xs font-medium">
              <div>
                <span className="block text-slate-500 text-[10px]">Total Siswa Dipindahkan:</span>
                <span className="text-white font-bold">{promoSummary.count} Siswa</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[10px]">Tahun Ajaran Baru:</span>
                <span className="text-emerald-400 font-black">{promoSummary.newYear} (Semester Ganjil)</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[10px]">Rombel Asal:</span>
                <span className="text-rose-400 font-bold">{promoSummary.fromClass}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[10px]">Rombel Baru / Tujuan:</span>
                <span className="text-emerald-400 font-bold uppercase">{promoSummary.toClass}</span>
              </div>
            </div>
            <p className="text-[10px] text-emerald-500 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10 flex items-start gap-1.5 leading-snug">
              <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Sistem otomatis menyetel semester ke Ganjil dan mereset tagihan uang kas (Rp 0) siswa yang naik kelas untuk tahun ajaran baru. Dana tabungan siswa tetap tersimpan aman.</span>
            </p>
          </div>

          <button
            onClick={handleDone}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-lg transition-all duration-200"
          >
            Selesai & Kembali
          </button>
        </div>
      ) : (
        /* Form Wizard */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left panel: configurations */}
          <div className="lg:col-span-4 space-y-6">
            <form onSubmit={handleProcessPromotion} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" /> Pengaturan Kenaikan Rombel
              </h3>

              {/* Source Year */}
              <div className="space-y-1">
                <label className="block text-slate-400 font-semibold text-[10px] uppercase">Tahun Pelajaran Asal</label>
                <select
                  value={sourceYear}
                  onChange={(e) => setSourceYear(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs font-mono"
                >
                  {academicSetting.years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">Pilih tahun pelajaran asal dari data siswa.</p>
              </div>

              {/* Source Class */}
              <div className="space-y-1">
                <label className="block text-slate-400 font-semibold text-[10px] uppercase">Rombel Asal (Sekarang)</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                >
                  {availableClasses.map(c => (
                    <option key={c} value={c}>Kelas {c}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">Pilih rombel asal yang siswanya ingin dinaikkan kelas.</p>
              </div>

              {/* Arrow Indicator */}
              <div className="flex justify-center py-1">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                  <ArrowRight className="w-4 h-4 rotate-90 lg:rotate-0" />
                </div>
              </div>

              {/* Target Class */}
              <div className="space-y-1">
                <label className="block text-slate-400 font-semibold text-[10px] uppercase">Rombel Tujuan</label>
                <select
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs uppercase font-bold"
                >
                  {availableClasses.map(c => (
                    <option key={c} value={c}>Kelas {c}</option>
                  ))}
                  <option value="LULUS (ALUMNI)">Lulus / Alumni (Keluar Sekolah)</option>
                </select>
                <p className="text-[10px] text-slate-500">Kelas tujuan siswa di tahun ajaran baru (biasanya 1 tingkat lebih tinggi).</p>
              </div>

              {/* Target Academic Year */}
              <div className="space-y-1">
                <label className="block text-slate-400 font-semibold text-[10px] uppercase">Tahun Ajaran Baru (Tujuan)</label>
                <input
                  type="text"
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs font-mono font-bold"
                  placeholder="e.g. 2026/2027"
                  required
                />
                <p className="text-[10px] text-slate-500">Sistem otomatis memindahkan siswa dan memajukan tahun ajaran aktif sistem ke tahun ini.</p>
              </div>

              {/* Financial Carry-over options */}
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800 space-y-2.5">
                <label className="block text-slate-400 font-bold text-[9px] uppercase tracking-wider">Opsi Saldo & Keuangan:</label>
                
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={carryOverSavings}
                    onChange={(e) => setCarryOverSavings(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 bg-slate-950 cursor-pointer"
                  />
                  <span className="text-slate-300 text-xs font-medium">Bawa Saldo Tabungan Siswa</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={carryOverCash}
                    onChange={(e) => setCarryOverCash(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 bg-slate-950 cursor-pointer"
                  />
                  <span className="text-slate-300 text-xs font-medium">Bawa Sisa Tagihan Uang Kas</span>
                </label>
              </div>

              {/* Policy/Business rule warnings */}
              <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3 space-y-2">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-amber-500" /> Aturan Bisnis Kenaikan Kelas:
                </p>
                <ul className="list-disc list-outside pl-4 text-[9px] text-slate-400 space-y-1.5 leading-relaxed">
                  <li>Laporan tabungan {carryOverSavings ? <span className="text-emerald-400 font-bold">dilanjutkan</span> : <span className="text-rose-400">di-reset ke Rp 0</span>} ke tahun ajaran baru.</li>
                  <li>Tagihan uang kas {carryOverCash ? <span className="text-emerald-400 font-bold">dilanjutkan</span> : <span className="text-rose-400">di-reset ke Rp 0</span>} ke tahun ajaran baru.</li>
                  <li>Kenaikan kelas akan menduplikasi profil siswa ke tahun ajaran baru <b className="text-emerald-400">{targetYear || 'Tahun Baru'}</b> (Ganjil).</li>
                  <li>Tahun ajaran aktif sistem akan bergeser secara otomatis setelah proses selesai.</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={selectedStudents.length === 0}
                className={`w-full py-2.5 rounded-xl text-xs font-black tracking-wide shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                  selectedStudents.length === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Proses Naik Kelas ({selectedStudents.length} Siswa)
              </button>
            </form>
          </div>

          {/* Right panel: student lists */}
          <div className="lg:col-span-8 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col h-[520px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Siswa Kelas {selectedClass} ({classStudents.length} Terdeteksi)
                </h4>
                <p className="text-[10px] text-slate-400">Pilih siswa yang berhak naik kelas.</p>
              </div>
              <button
                type="button"
                onClick={handleToggleAll}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 transition-all flex items-center gap-1.5"
              >
                {selectedStudents.length === classStudents.length ? (
                  <>
                    <Square className="w-3.5 h-3.5 text-emerald-400" /> Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> Select All
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
              {classStudents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Users className="w-12 h-12 mb-2 text-slate-700" />
                  <p className="text-xs italic font-semibold">Tidak ada siswa yang terdaftar di kelas {selectedClass} saat ini.</p>
                </div>
              ) : (
                classStudents.map((std, idx) => {
                  const isChecked = selectedStudents.includes(std.nisn);
                  return (
                    <div
                      key={std.nisn}
                      onClick={() => handleToggleStudent(std.nisn)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-white'
                          : 'bg-slate-950/20 border-slate-800 text-slate-400 hover:bg-slate-800/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-[10px] font-bold font-mono text-slate-500 w-5">
                          {idx + 1}
                        </div>
                        {std.photoUrl ? (
                          <img
                            src={std.photoUrl}
                            alt="Foto"
                            className="w-8 h-8 rounded-full border border-slate-800 object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-extrabold text-emerald-400 uppercase">
                              {std.name.substring(0, 2)}
                            </span>
                          </div>
                        )}
                        <div className="text-left">
                          <p className="text-xs font-bold leading-tight">{std.name}</p>
                          <p className="text-[9px] text-slate-500 font-mono leading-none mt-0.5">
                            NISN {std.nisn} • Tabungan: Rp {std.savings.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isChecked ? (
                          <div className="p-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="p-1 bg-slate-800 text-slate-600 rounded-lg border border-slate-700">
                            <div className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
