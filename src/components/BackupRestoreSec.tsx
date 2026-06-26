/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Database,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  FileJson,
  Calendar,
  ShieldCheck,
  FileCheck,
  Trash2
} from 'lucide-react';
import {
  Student,
  Teacher,
  Attendance,
  Grade,
  CaseReport,
  Achievement,
  AcademicSetting,
  SystemSetting,
  EmailLog
} from '../types';

interface BackupRestoreSecProps {
  students: Student[];
  teachers: Teacher[];
  attendance: Attendance[];
  grades: Grade[];
  cases: CaseReport[];
  achievements: Achievement[];
  emails: EmailLog[];
  academicSetting: AcademicSetting;
  systemSetting: SystemSetting;
  onRestoreData: (restored: {
    students?: Student[];
    teachers?: Teacher[];
    attendance?: Attendance[];
    grades?: Grade[];
    cases?: CaseReport[];
    achievements?: Achievement[];
    emails?: EmailLog[];
    academicSetting?: AcademicSetting;
    systemSetting?: SystemSetting;
  }) => void;
  onResetToDefault: () => void;
  role: 'ADMIN' | 'GURU' | 'SISWA';
  schoolName: string;
}

export default function BackupRestoreSec({
  students,
  teachers,
  attendance,
  grades,
  cases,
  achievements,
  emails,
  academicSetting,
  systemSetting,
  onRestoreData,
  onResetToDefault,
  role,
  schoolName
}: BackupRestoreSecProps) {
  const [dragActive, setDragActive] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download Backup File
  const handleExportBackup = () => {
    try {
      const backupObj = {
        metadata: {
          exporterRole: role,
          exportedAt: new Date().toISOString(),
          schoolName: systemSetting.schoolName,
          academicYear: academicSetting.activeYear,
          semester: academicSetting.activeSemester,
          version: '2.0.0-siap'
        },
        siap_students: students,
        siap_teachers: teachers,
        siap_attendance: attendance,
        siap_grades: grades,
        siap_cases: cases,
        siap_achievements: achievements,
        siap_emails: emails,
        siap_academic: academicSetting,
        siap_system: systemSetting
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `BACKUP_SIAP_${schoolName.replace(/\s+/g, '_')}_${timestamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMsg("Backup data berhasil diekspor! Simpan file JSON tersebut dengan aman.");
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg("Gagal melakukan ekspor backup: " + err.message);
    }
  };

  // Validate the Backup JSON file structure
  const validateBackupJSON = (json: any): boolean => {
    if (!json) return false;
    // Check if at least some core keys exist
    const hasStudents = Array.isArray(json.siap_students);
    const hasTeachers = Array.isArray(json.siap_teachers);
    const hasAcademic = json.siap_academic && typeof json.siap_academic === 'object';
    const hasSystem = json.siap_system && typeof json.siap_system === 'object';

    return hasStudents || hasTeachers || hasAcademic || hasSystem;
  };

  // Parse and preview upload file
  const processBackupFile = (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setPreviewData(null);

    if (file.type !== "application/json" && !file.name.endsWith('.json')) {
      setErrorMsg("Format file salah. Silakan unggah file dengan format .json.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rawResult = e.target?.result as string;
        const parsed = JSON.parse(rawResult);

        if (!validateBackupJSON(parsed)) {
          setErrorMsg("File JSON yang diunggah tidak valid sebagai backup aplikasi SIAP.");
          return;
        }

        setPreviewData(parsed);
      } catch (err: any) {
        setErrorMsg("Gagal membaca atau mem-parse file JSON: " + err.message);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Gagal membaca file.");
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processBackupFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processBackupFile(e.target.files[0]);
    }
  };

  // Confirm restore action
  const handleRestoreConfirm = () => {
    if (!previewData) return;

    try {
      const payload: {
        students?: Student[];
        teachers?: Teacher[];
        attendance?: Attendance[];
        grades?: Grade[];
        cases?: CaseReport[];
        achievements?: Achievement[];
        emails?: EmailLog[];
        academicSetting?: AcademicSetting;
        systemSetting?: SystemSetting;
      } = {};

      if (Array.isArray(previewData.siap_students)) payload.students = previewData.siap_students;
      if (Array.isArray(previewData.siap_teachers)) payload.teachers = previewData.siap_teachers;
      if (Array.isArray(previewData.siap_attendance)) payload.attendance = previewData.siap_attendance;
      if (Array.isArray(previewData.siap_grades)) payload.grades = previewData.siap_grades;
      if (Array.isArray(previewData.siap_cases)) payload.cases = previewData.siap_cases;
      if (Array.isArray(previewData.siap_achievements)) payload.achievements = previewData.siap_achievements;
      if (Array.isArray(previewData.siap_emails)) payload.emails = previewData.siap_emails;
      if (previewData.siap_academic) payload.academicSetting = previewData.siap_academic;
      if (previewData.siap_system) payload.systemSetting = previewData.siap_system;

      onRestoreData(payload);
      setSuccessMsg("Sistem berhasil dipulihkan dari file backup! Semua data akademik telah diperbarui.");
      setPreviewData(null);
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg("Terjadi kesalahan saat memulihkan data: " + err.message);
    }
  };

  // Reset to Factory defaults
  const handleResetExecute = () => {
    if (resetConfirmText.toLowerCase() !== 'reset data') {
      alert("Masukkan kalimat konfirmasi dengan tepat.");
      return;
    }
    onResetToDefault();
    setSuccessMsg("Sistem telah berhasil disetel ulang ke kondisi bawaan (factory reset).");
    setResetConfirmOpen(false);
    setResetConfirmText('');
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 selection:bg-emerald-500 selection:text-white font-sans text-xs">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" /> Backup & Restore Data
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Ekspor seluruh basis data ke file JSON lokal, pulihkan data sebelumnya, atau kembalikan setelan sistem ke kondisi awal.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="flex gap-2.5 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl mb-6">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Aksi Berhasil</p>
            <p className="text-emerald-400/80 leading-relaxed text-[11px]">{successMsg}</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex gap-2.5 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl mb-6">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Terjadi Kesalahan</p>
            <p className="text-rose-400/80 leading-relaxed text-[11px]">{errorMsg}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box Left: Ekspor Backup */}
        <div className="p-6 bg-slate-950/40 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <Download className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ekspor Backup Data</h3>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px] mb-4">
              Menyimpan seluruh basis data sekolah saat ini ke dalam satu file tunggal format JSON. File backup ini dapat disimpan sebagai arsip mingguan atau bulanan untuk mencegah kehilangan data akibat pembersihan cache browser.
            </p>

            <div className="space-y-2.5 p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <h4 className="font-bold text-slate-300 uppercase tracking-widest text-[9px]">Arsip yang akan di-backup:</h4>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Siswa: <strong className="text-slate-200 font-mono font-bold">{students.length}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Guru: <strong className="text-slate-200 font-mono font-bold">{teachers.length}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Kehadiran: <strong className="text-slate-200 font-mono font-bold">{attendance.length}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Nilai Rapor: <strong className="text-slate-200 font-mono font-bold">{grades.length}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Kasus Siswa: <strong className="text-slate-200 font-mono font-bold">{cases.length}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Prestasi: <strong className="text-slate-200 font-mono font-bold">{achievements.length}</strong></span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleExportBackup}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Semua Data (.json)</span>
          </button>
        </div>

        {/* Box Right: Import/Restore Backup */}
        <div className="p-6 bg-slate-950/40 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-sky-500/10 border border-sky-500/20 rounded-lg">
                <UploadCloud className="w-4.5 h-4.5 text-sky-400" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pulihkan Data (Restore)</h3>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px] mb-4">
              Unggah file JSON hasil ekspor backup sebelumnya untuk menimpa database saat ini. Harap berhati-hati, memulihkan data akan menggantikan data aktif saat ini secara permanen.
            </p>

            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[110px] ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/70'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
              <FileJson className="w-8 h-8 text-slate-500 mb-2" />
              <p className="font-bold text-slate-300">Tarik & lepas file backup JSON di sini</p>
              <p className="text-[10px] text-slate-500 mt-1">Atau klik untuk memilih file dari komputer Anda</p>
            </div>
          </div>

          {/* Backup Preview and Action Panel */}
          {previewData && (
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-slate-200">Pratinjau File Backup</span>
                </div>
                <button
                  onClick={() => setPreviewData(null)}
                  className="text-slate-500 hover:text-rose-400 transition font-bold"
                >
                  Batal
                </button>
              </div>

              {previewData.metadata && (
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/40">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>Tgl: {new Date(previewData.metadata.exportedAt).toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-slate-500" />
                    <span>Peran: {previewData.metadata.exporterRole || 'ADMIN'}</span>
                  </div>
                  <div className="col-span-2 border-t border-slate-800/50 pt-1 mt-1 truncate font-bold text-slate-300">
                    Sekolah: {previewData.metadata.schoolName}
                  </div>
                </div>
              )}

              <div className="text-[10px] text-slate-400 space-y-1 bg-slate-950/30 p-2.5 rounded-lg">
                <p className="font-bold text-slate-300 uppercase tracking-wider text-[9px] mb-1">Rincian Komponen Data:</p>
                <p>• {Array.isArray(previewData.siap_students) ? previewData.siap_students.length : 0} Data Siswa</p>
                <p>• {Array.isArray(previewData.siap_teachers) ? previewData.siap_teachers.length : 0} Data Guru</p>
                <p>• {Array.isArray(previewData.siap_attendance) ? previewData.siap_attendance.length : 0} Log Kehadiran</p>
                <p>• {Array.isArray(previewData.siap_grades) ? previewData.siap_grades.length : 0} Entri Nilai Rapor</p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleRestoreConfirm}
                  className="flex-1 py-2 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition"
                >
                  Konfirmasi Pulihkan Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Box Bottom: Reset Data (ADMIN ONLY) */}
      {role === 'ADMIN' && (
        <div className="mt-8 p-6 bg-rose-500/5 border border-rose-500/15 rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <h3 className="text-sm font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Trash2 className="w-4.5 h-4.5" /> Setel Ulang ke Kondisi Bawaan (Factory Reset)
              </h3>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Aksi ini akan menghapus semua data transaksi absensi, nilai, riwayat pelanggaran, kas, dan guru yang telah Anda input, serta mengembalikan data siswa ke setelan demonstrasi awal. Aksi ini tidak dapat dibatalkan.
              </p>
            </div>
            <div>
              {!resetConfirmOpen ? (
                <button
                  onClick={() => setResetConfirmOpen(true)}
                  className="w-full md:w-auto px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold border border-rose-500/20 rounded-xl transition duration-150"
                >
                  Mulai Setel Ulang
                </button>
              ) : (
                <div className="bg-slate-950 p-4 border border-rose-500/20 rounded-xl space-y-3 min-w-[260px] animate-fadeIn">
                  <p className="font-bold text-rose-400 text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Ketik "reset data" untuk konfirmasi:
                  </p>
                  <input
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="Tulis kalimat konfirmasi..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-rose-500 text-xs text-center"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleResetExecute}
                      className="flex-1 py-1.5 px-2 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-lg transition"
                    >
                      Reset Sekarang
                    </button>
                    <button
                      onClick={() => {
                        setResetConfirmOpen(false);
                        setResetConfirmText('');
                      }}
                      className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
