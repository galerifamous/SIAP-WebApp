/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  ClipboardList,
  Check,
  AlertCircle,
  Search,
  Filter,
  FileSpreadsheet,
  FileDown,
  UserCheck,
  Scan,
  Mail,
  Clock,
  Volume2,
  Trash2,
  Calendar,
  Plus,
  Edit2,
  FileText,
  AlertTriangle,
  User,
  Undo
} from 'lucide-react';
import { Student, Attendance, Holiday } from '../types';
import { downloadFile, convertToCSV, printToPDF } from '../utils/export';

interface AbsensiSecProps {
  students: Student[];
  attendance: Attendance[];
  onMarkAttendance: (nisn: string, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa', customDate?: string) => void;
  onDeleteAttendance: (id: string) => void;
  schoolName: string;
  academicYear: string;
  semester: string;
  availableClasses: string[];
  role: 'ADMIN' | 'GURU' | 'SISWA';
  studentNisn?: string;
  activeMenu?: string;
  holidays?: Holiday[];
  onAddHoliday?: (date: string, description: string) => void;
  onDeleteHoliday?: (id: string) => void;
}

export default function AbsensiSec({
  students,
  attendance,
  onMarkAttendance,
  onDeleteAttendance,
  schoolName,
  academicYear,
  semester,
  availableClasses,
  role,
  studentNisn,
  activeMenu,
  holidays = [],
  onAddHoliday,
  onDeleteHoliday
}: AbsensiSecProps) {
  // Navigation tabs driven by sidebar menu selection
  const activeTab = activeMenu ? (activeMenu === 'absensi-scan' ? 'scan' : 'list') : (role === 'SISWA' ? 'list' : 'scan');

  // Scanner Simulator States
  const [scanInput, setScanInput] = useState('');
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'Hadir' | 'Sakit' | 'Izin' | 'Alpa'>('Hadir');

  // Real Camera States
  const [hasCamera, setHasCamera] = useState(false);
  const lastScannedRef = React.useRef<{ nisn: string; time: number } | null>(null);
  const scanStatusRef = React.useRef(scanStatus);

  const studentsRef = React.useRef(students);
  const onMarkAttendanceRef = React.useRef(onMarkAttendance);

  React.useEffect(() => {
    scanStatusRef.current = scanStatus;
  }, [scanStatus]);

  React.useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  React.useEffect(() => {
    onMarkAttendanceRef.current = onMarkAttendance;
  }, [onMarkAttendance]);

  // Handle scan with custom status
  const handleScanWithStatus = (nisn: string, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa') => {
    setScanSuccess(null);
    setScanError(null);

    const student = studentsRef.current.find(s => s.nisn === nisn);
    if (!student) {
      setScanError(`NISN "${nisn}" tidak terdaftar di database.`);
      return;
    }

    onMarkAttendanceRef.current(nisn, status);
    playBeep();

    const statusMap: Record<string, string> = {
      Hadir: 'HADIR 🟢',
      Sakit: 'SAKIT 🟡',
      Izin: 'IZIN 🔵',
      Alpa: 'ALPA 🔴'
    };
    const statusText = statusMap[status] || status.toUpperCase();
    setScanSuccess(`Absensi BERHASIL! Siswa: ${student.name} (${student.class}) tercatat ${statusText}. Notifikasi email otomatis hanya dikirim ke Orangtua.`);

    // Clear success after 6 seconds
    setTimeout(() => {
      setScanSuccess(null);
    }, 6000);
  };

  const handleBarcodeScanned = (decodedText: string) => {
    const cleanNisn = decodedText.trim();
    if (!cleanNisn) return;

    const now = Date.now();
    if (lastScannedRef.current && lastScannedRef.current.nisn === cleanNisn && (now - lastScannedRef.current.time) < 3000) {
      return; // prevent rapid double scan
    }
    lastScannedRef.current = { nisn: cleanNisn, time: now };

    handleScanWithStatus(cleanNisn, scanStatusRef.current);
  };

  const handleBarcodeScannedRef = React.useRef(handleBarcodeScanned);
  React.useEffect(() => {
    handleBarcodeScannedRef.current = handleBarcodeScanned;
  });

  React.useEffect(() => {
    let html5QrCode: any = null;
    let isMounted = true;

    if (activeTab === 'scan' && role !== 'SISWA') {
      const timer = setTimeout(() => {
        if (!isMounted) return;
        try {
          const readerEl = document.getElementById("real-camera-reader");
          if (!readerEl) return;

          html5QrCode = new Html5Qrcode("real-camera-reader");
          html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 220, height: 220 }
            },
            (decodedText: string) => {
              handleBarcodeScannedRef.current(decodedText);
            },
            (errorMessage: string) => {
              // Parse error, silent
            }
          ).then(() => {
            if (isMounted) setHasCamera(true);
          }).catch((err: any) => {
            console.log("Kamera tidak diijinkan atau tidak ditemukan, memakai simulator:", err);
            if (isMounted) setHasCamera(false);
          });
        } catch (e) {
          console.error("Scanner instantiation failed:", e);
          if (isMounted) setHasCamera(false);
        }
      }, 150);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (html5QrCode) {
          try {
            if (html5QrCode.isScanning) {
              html5QrCode.stop().then(() => {
                try {
                  html5QrCode.clear();
                } catch (e) {
                  // Ignore
                }
              }).catch((err: any) => {
                console.log("Error stopping scanner:", err);
              });
            }
          } catch (err) {
            console.log("Error checking scanner status:", err);
          }
        }
      };
    }
  }, [activeTab, role]);

  // List States
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // Sub tabs under the log/list view for GURU and ADMIN
  const [subTab, setSubTab] = useState<'rekap' | 'manual' | 'holiday'>('rekap');

  // Manual Classroom Matrix states
  const [manualClass, setManualClass] = useState(availableClasses[0] || '');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

  // Inline editing state for table records
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Holiday management form states
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayDesc, setNewHolidayDesc] = useState('');

  // Monthly download states
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth() + 1);
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear().toString());
  const [monthlyClass, setMonthlyClass] = useState('');

  // Check holiday or Sunday info
  const getHolidayInfo = (dateStr: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (d.getDay() === 0) {
      return 'Hari Minggu (Libur Akhir Pekan)';
    }
    const holiday = holidays.find(h => h.date === dateStr);
    if (holiday) {
      return holiday.description;
    }
    return null;
  };

  // Monthly rekap CSV generator
  const handleExportMonthlyCSV = () => {
    const yearNum = Number(monthlyYear);
    const monthNum = Number(monthlyMonth);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const targetPrefix = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}`;
    const targetStudents = monthlyClass 
      ? students.filter(s => s.class === monthlyClass)
      : students;

    const dateKeys: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      dateKeys.push(`${targetPrefix}-${String(d).padStart(2, '0')}`);
    }

    const headers = [
      'NISN',
      'Nama Siswa',
      'Jenis Kelamin',
      ...dateKeys.map((_, idx) => `Tanggal ${idx + 1}`),
      'Total Hadir (H)',
      'Total Sakit (S)',
      'Total Izin (I)',
      'Total Alpa (A)'
    ];

    const rows = targetStudents.map((student) => {
      const studentAtts = attendance.filter(
        att => att.nisn === student.nisn && att.date.startsWith(targetPrefix)
      );

      const dailyStatuses = dateKeys.map(dateKey => {
        const att = studentAtts.find(a => a.date === dateKey);
        if (!att) return '';
        const statusCharMap: Record<string, string> = {
          Hadir: 'H',
          Sakit: 'S',
          Izin: 'I',
          Alpa: 'A'
        };
        return statusCharMap[att.status] || '';
      });

      const totalH = dailyStatuses.filter(s => s === 'H').length;
      const totalS = dailyStatuses.filter(s => s === 'S').length;
      const totalI = dailyStatuses.filter(s => s === 'I').length;
      const totalA = dailyStatuses.filter(s => s === 'A').length;

      return [
        student.nisn,
        student.name,
        student.gender,
        ...dailyStatuses,
        String(totalH),
        String(totalS),
        String(totalI),
        String(totalA)
      ];
    });

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNames[monthlyMonth - 1];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    downloadFile(
      csvContent,
      `Rekap_Bulanan_Absensi_${monthlyClass || 'Semua_Kelas'}_${monthName}_${monthlyYear}.csv`,
      'text/csv;charset=utf-8;'
    );
  };

  // Monthly rekap PDF generator
  const handleExportMonthlyPDF = () => {
    const targetPrefix = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}`;
    const targetStudents = monthlyClass 
      ? students.filter(s => s.class === monthlyClass)
      : students;

    const headers = [
      'No',
      'NISN',
      'Nama Siswa',
      'Kelas',
      'Hadir (H)',
      'Sakit (S)',
      'Izin (I)',
      'Alpa (A)',
      'Persentase Kehadiran'
    ];

    const rows = targetStudents.map((student, idx) => {
      const studentAtts = attendance.filter(
        att => att.nisn === student.nisn && att.date.startsWith(targetPrefix)
      );

      const hadir = studentAtts.filter(a => a.status === 'Hadir').length;
      const sakit = studentAtts.filter(a => a.status === 'Sakit').length;
      const izin = studentAtts.filter(a => a.status === 'Izin').length;
      const alpa = studentAtts.filter(a => a.status === 'Alpa').length;
      const total = hadir + sakit + izin + alpa;
      const percentage = total > 0 ? `${Math.round((hadir / total) * 100)}%` : '100%';

      return [
        String(idx + 1),
        student.nisn,
        student.name,
        student.class,
        String(hadir),
        String(sakit),
        String(izin),
        String(alpa),
        percentage
      ];
    });

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNames[monthlyMonth - 1];

    printToPDF(
      `Rekap Absensi Bulanan - ${monthName} ${monthlyYear} (${monthlyClass || 'Semua Kelas'})`,
      headers,
      rows,
      schoolName,
      academicYear,
      semester
    );
  };

  // Audio simulation (Beep!)
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // Frequency in Hz
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15); // play for 0.15 seconds
    } catch (e) {
      // Ignore audio failure
    }
  };

  // Handle simulated scan submission
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNisn = scanInput.trim();
    if (!cleanNisn) return;
    handleScanWithStatus(cleanNisn, scanStatus);
    setScanInput('');
  };

  const handleQuickScan = (nisn: string, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' = 'Hadir') => {
    handleScanWithStatus(nisn, status);
  };

  // Filter Attendance Logs
  const filteredAttendance = attendance.filter(att => {
    // Basic Academic restrictions
    if (att.academicYear !== academicYear || att.semester !== semester) return false;

    // Student role restrictions
    if (role === 'SISWA') {
      return att.nisn === studentNisn;
    }

    // Filters for Admin / Guru
    const matchesSearch = att.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || att.nisn.includes(searchQuery);
    const matchesClass = classFilter ? att.class === classFilter : true;
    const matchesStatus = statusFilter ? att.status === statusFilter : true;
    const matchesDate = dateFilter ? att.date === dateFilter : true;

    return matchesSearch && matchesClass && matchesStatus && matchesDate;
  });

  // Export to Excel (CSV)
  const handleExportExcel = () => {
    const headers = ['ID Absen', 'NISN', 'Nama Siswa', 'Kelas', 'Tanggal', 'Status Kehadiran', 'Tahun Pelajaran', 'Semester', 'Waktu Tercatat'];
    const csvContent = convertToCSV(
      filteredAttendance,
      headers,
      ['id', 'nisn', 'studentName', 'class', 'date', 'status', 'academicYear', 'semester', 'timestamp']
    );
    downloadFile(csvContent, `Rekap_Absensi_${dateFilter || 'SemuaTanggal'}.csv`, 'text/csv;charset=utf-8;');
  };

  // Export to PDF
  const handleExportPDF = () => {
    const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Tanggal', 'Status', 'Waktu Tercatat'];
    const rows = filteredAttendance.map((att, idx) => [
      String(idx + 1),
      att.nisn,
      att.studentName,
      att.class,
      att.date,
      att.status,
      new Date(att.timestamp).toLocaleTimeString('id-ID')
    ]);
    printToPDF(`Laporan Absensi Siswa - ${dateFilter || 'Semua Tanggal'}`, headers, rows, schoolName, academicYear, semester);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 selection:bg-emerald-500 selection:text-white font-sans">
      {/* Header Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Sistem Absensi Digital (SIAP-Absen)</h2>
          <p className="text-slate-400 text-xs mt-1">Gunakan scanner barcode, QR code, atau rekap log data absensi siswa</p>
        </div>
      </div>

      {activeTab === 'scan' && role !== 'SISWA' ? (
        // --- VIEW 1: BARCODE SCANNER SIMULATION ---
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Virtual Scanner Box */}
          <div className="lg:col-span-2 p-6 bg-slate-950/40 border border-slate-800 rounded-2xl flex flex-col justify-between">
            <div className="text-center">
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest">
                Kamera Scanner Otomatis Aktif
              </span>
              
              {/* Animated Scan Stage */}
              <div className="relative my-8 mx-auto w-full max-w-[320px] aspect-square rounded-2xl border border-slate-700/60 overflow-hidden bg-slate-900 shadow-2xl flex flex-col items-center justify-center">
                {/* Real HTML5 QR Scanner Container */}
                <div 
                  id="real-camera-reader" 
                  className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
                />

                {/* Laser line animation */}
                <div className="absolute top-0 inset-x-0 h-0.5 bg-emerald-500 shadow-[0_0_10px_#10b981] animate-scanLaser pointer-events-none z-20" />

                {/* Grid guidelines */}
                <div className="absolute inset-8 border border-slate-600/40 border-dashed rounded-lg flex items-center justify-center z-10 pointer-events-none">
                  <Scan className="w-16 h-16 text-emerald-500/20 animate-pulse" />
                </div>

                {!hasCamera && (
                  <div className="relative text-center z-10 p-4">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Mengaktifkan Scanner Kamera...</p>
                    <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                      Dekatkan QR Code/Barcode Kartu Siswa ke kamera, atau gunakan input NISN manual di bawah.
                    </p>
                  </div>
                )}
              </div>

              {/* Active Scanner Status Selector */}
              <div className="mb-6 max-w-md mx-auto bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2.5 text-center">
                  Status Kehadiran Hasil Scan Barcode/QR
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as const).map((status) => {
                    const colors: Record<string, string> = {
                      Hadir: 'hover:text-emerald-400 active:bg-emerald-500 active:text-slate-950',
                      Sakit: 'hover:text-amber-400 active:bg-amber-500 active:text-slate-950',
                      Izin: 'hover:text-sky-400 active:bg-sky-500 active:text-slate-950',
                      Alpa: 'hover:text-rose-400 active:bg-rose-500 active:text-slate-950'
                    };
                    const selectedColors: Record<string, string> = {
                      Hadir: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.1)]',
                      Sakit: 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.1)]',
                      Izin: 'bg-sky-500/15 text-sky-400 border-sky-500/30 shadow-[0_0_8px_rgba(14,165,233,0.1)]',
                      Alpa: 'bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.1)]'
                    };
                    const inactiveColors = 'bg-slate-950/40 text-slate-400 border-slate-800/80';
                    const label = status === 'Hadir' ? 'Hadir (H)' : status === 'Sakit' ? 'Sakit (S)' : status === 'Izin' ? 'Izin (I)' : 'Alpa (A)';

                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setScanStatus(status)}
                        className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border transition-all text-center ${
                          scanStatus === status ? selectedColors[status] : `${inactiveColors} ${colors[status]}`
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Input for manual simulation */}
              <form onSubmit={handleScanSubmit} className="max-w-md mx-auto">
                <label className="block text-left text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                  Input NISN Siswa (Manual Scan)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Masukkan NISN Siswa (10 digit)"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono tracking-widest text-center"
                  />
                  <button
                    type="submit"
                    className="px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/15 flex items-center gap-1.5 text-xs uppercase"
                  >
                    <span>Input</span>
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* Notifications feed */}
            <div className="mt-6 border-t border-slate-800/80 pt-4">
              {scanSuccess && (
                <div className="flex gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-4 rounded-xl text-xs animate-fadeIn">
                  <UserCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Scan Absensi Berhasil</p>
                    <p className="text-emerald-300/80 mt-1 leading-relaxed">{scanSuccess}</p>
                    <p className="text-[10px] text-emerald-500 font-mono mt-2 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> MailApp: Notifikasi Terkirim Ke Wali Murid!
                    </p>
                  </div>
                </div>
              )}

              {scanError && (
                <div className="flex gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl text-xs">
                  <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Scan Absensi Gagal</p>
                    <p className="text-rose-300/80 mt-1">{scanError}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Attendance Selector */}
          <div className="p-5 bg-slate-950/20 border border-slate-800 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Daftar Pintasan Absen</h3>
              <p className="text-[10px] text-slate-500 mb-4">Klik tombol H, S, I, atau A untuk mencatat status siswa secara manual</p>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {students.map((student) => {
                  const existingAtt = attendance.find(
                    att => att.nisn === student.nisn && att.date === new Date().toISOString().split('T')[0] && att.academicYear === academicYear && att.semester === semester
                  );
                  const currentStatus = existingAtt ? existingAtt.status : null;

                  return (
                    <div
                      key={student.nisn}
                      className="p-2.5 bg-slate-900 border border-slate-800/60 rounded-xl flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-200 truncate">{student.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">NISN: {student.nisn} ({student.class})</p>
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleQuickScan(student.nisn, 'Hadir')}
                          className={`w-7 h-7 flex items-center justify-center text-[10px] font-extrabold rounded-lg transition-all border ${
                            currentStatus === 'Hadir'
                              ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-md shadow-emerald-500/10 scale-105'
                              : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-emerald-400 hover:border-emerald-500/30'
                          }`}
                          title="Hadir"
                        >
                          H
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickScan(student.nisn, 'Sakit')}
                          className={`w-7 h-7 flex items-center justify-center text-[10px] font-extrabold rounded-lg transition-all border ${
                            currentStatus === 'Sakit'
                              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/10 scale-105'
                              : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-amber-400 hover:border-amber-500/30'
                          }`}
                          title="Sakit"
                        >
                          S
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickScan(student.nisn, 'Izin')}
                          className={`w-7 h-7 flex items-center justify-center text-[10px] font-extrabold rounded-lg transition-all border ${
                            currentStatus === 'Izin'
                              ? 'bg-sky-500 text-slate-950 border-sky-500 shadow-md shadow-sky-500/10 scale-105'
                              : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-sky-400 hover:border-sky-500/30'
                          }`}
                          title="Izin"
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickScan(student.nisn, 'Alpa')}
                          className={`w-7 h-7 flex items-center justify-center text-[10px] font-extrabold rounded-lg transition-all border ${
                            currentStatus === 'Alpa'
                              ? 'bg-rose-500 text-slate-950 border-rose-500 shadow-md shadow-rose-500/10 scale-105'
                              : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-rose-400 hover:border-rose-500/30'
                          }`}
                          title="Alpa"
                        >
                          A
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-4 leading-normal italic text-center">
              *Setelah diklik, data absensi langsung terhubung ke tabel log dan memicu pengiriman email otomatis.
            </p>
          </div>
        </div>
      ) : (
        // --- VIEW 2: LOG ABSENSI SISWA (TABLE WITH FILTERS & EXPORT & BULK MANUALS & HOLIDAYS) ---
        <div className="space-y-4">
          {/* Sub-Tabs Selector for Guru / Admin */}
          {role !== 'SISWA' && (
            <div className="flex border-b border-slate-800 mb-5 gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSubTab('rekap')}
                className={`px-4 py-2.5 border-b-2 text-xs font-bold transition flex items-center gap-2 flex-shrink-0 ${
                  subTab === 'rekap'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span>Rekap Log Harian</span>
              </button>

              <button
                type="button"
                onClick={() => setSubTab('manual')}
                className={`px-4 py-2.5 border-b-2 text-xs font-bold transition flex items-center gap-2 flex-shrink-0 ${
                  subTab === 'manual'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Edit2 className="w-4 h-4" />
                <span>Absensi Kelas Manual</span>
              </button>

              <button
                type="button"
                onClick={() => setSubTab('holiday')}
                className={`px-4 py-2.5 border-b-2 text-xs font-bold transition flex items-center gap-2 flex-shrink-0 ${
                  subTab === 'holiday'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Atur Hari Libur Madrasah</span>
              </button>
            </div>
          )}

          {/* Render Tab Contents */}
          {subTab === 'rekap' || role === 'SISWA' ? (
            <div className="space-y-4">
              {/* Controls Bar */}
              {role !== 'SISWA' && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Cari absensi berdasarkan nama, NISN..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950/40 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-300 text-xs focus:outline-none focus:border-emerald-500/80 transition-all placeholder:text-slate-600"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Date Picker Filter */}
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="bg-slate-950/40 border border-slate-800 rounded-xl py-2 px-3 text-slate-300 text-xs font-semibold focus:outline-none focus:border-emerald-500/80"
                    />

                    {/* Class filter */}
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="bg-slate-950/40 border border-slate-800 rounded-xl py-2 px-3 text-slate-300 text-xs font-semibold focus:outline-none focus:border-emerald-500/80"
                    >
                      <option value="">Semua Kelas</option>
                      {availableClasses.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    {/* Status filter */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-950/40 border border-slate-800 rounded-xl py-2 px-3 text-slate-300 text-xs font-semibold focus:outline-none focus:border-emerald-500/80"
                    >
                      <option value="">Semua Status</option>
                      <option value="Hadir">Hadir</option>
                      <option value="Sakit">Sakit</option>
                      <option value="Izin">Izin</option>
                      <option value="Alpa">Alpa</option>
                    </select>

                    {/* Export buttons */}
                    <button
                      onClick={handleExportExcel}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700/80 text-emerald-400 border border-slate-700/60 rounded-xl transition duration-150"
                      title="Ekspor Rekap Harian (CSV)"
                    >
                      <FileSpreadsheet className="w-4.5 h-4.5" />
                    </button>

                    <button
                      onClick={handleExportPDF}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700/80 text-red-400 border border-slate-700/60 rounded-xl transition duration-150"
                      title="Ekspor Rekap Harian PDF"
                    >
                      <FileDown className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Monthly report card */}
              {role !== 'SISWA' && (
                <div className="p-5 bg-slate-950/20 border border-slate-800/80 rounded-2xl space-y-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">Unduh Rekap Absensi Bulanan</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Dapatkan laporan lengkap kehadiran siswa per kelas tiap bulan</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pilih Bulan</label>
                      <select
                        value={monthlyMonth}
                        onChange={(e) => setMonthlyMonth(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-slate-300 font-semibold text-xs focus:outline-none focus:border-slate-700"
                      >
                        <option value={1}>Januari</option>
                        <option value={2}>Februari</option>
                        <option value={3}>Maret</option>
                        <option value={4}>April</option>
                        <option value={5}>Mei</option>
                        <option value={6}>Juni</option>
                        <option value={7}>Juli</option>
                        <option value={8}>Agustus</option>
                        <option value={9}>September</option>
                        <option value={10}>Oktober</option>
                        <option value={11}>November</option>
                        <option value={12}>Desember</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pilih Tahun</label>
                      <select
                        value={monthlyYear}
                        onChange={(e) => setMonthlyYear(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-slate-300 font-semibold text-xs focus:outline-none focus:border-slate-700"
                      >
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                        <option value="2028">2028</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pilih Kelas</label>
                      <select
                        value={monthlyClass}
                        onChange={(e) => setMonthlyClass(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-slate-300 font-semibold text-xs focus:outline-none focus:border-slate-700"
                      >
                        <option value="">Semua Kelas</option>
                        {availableClasses.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleExportMonthlyCSV}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-1.5 rounded-lg text-[10px] uppercase flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-500/10"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Unduh CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportMonthlyPDF}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-red-400 border border-slate-700 rounded-lg font-bold py-1.5 text-[10px] uppercase flex items-center justify-center gap-1.5 transition"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Unduh PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Record Creator for teachers manually */}
              {role !== 'SISWA' && (
                <div className="p-4 bg-slate-950/20 border border-slate-800/80 rounded-xl text-xs flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-white uppercase tracking-wider">Pencatatan Cepat Satuan</h4>
                    <p className="text-slate-500 mt-0.5">Catat kehadiran satu siswa secara langsung</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      id="manual-nisn-select"
                      className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-slate-300 font-semibold focus:outline-none"
                      defaultValue=""
                    >
                      <option value="" disabled>Pilih Siswa...</option>
                      {students.map(s => (
                        <option key={s.nisn} value={s.nisn}>{s.name} ({s.class})</option>
                      ))}
                    </select>
                    <select
                      id="manual-status-select"
                      className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-slate-300 font-semibold focus:outline-none"
                      defaultValue="Hadir"
                    >
                      <option value="Hadir">Hadir</option>
                      <option value="Sakit">Sakit</option>
                      <option value="Izin">Izin</option>
                      <option value="Alpa">Alpa</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const selectNisn = (document.getElementById('manual-nisn-select') as HTMLSelectElement).value;
                        const selectStatus = (document.getElementById('manual-status-select') as HTMLSelectElement).value as any;
                        if (!selectNisn) {
                          alert('Silakan pilih siswa terlebih dahulu.');
                          return;
                        }
                        onMarkAttendance(selectNisn, selectStatus, dateFilter);
                        alert(`Absensi ${selectStatus} berhasil dicatat.`);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg transition"
                    >
                      Catat Kehadiran
                    </button>
                  </div>
                </div>
              )}

              {/* Attendance Log Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/10">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider">
                      <th className="p-4 w-12 text-center">No</th>
                      <th className="p-4">NISN / Nama Siswa</th>
                      <th className="p-4">Kelas</th>
                      <th className="p-4">Tanggal Absen</th>
                      <th className="p-4">Waktu Log</th>
                      <th className="p-4">Tahun / Semester</th>
                      <th className="p-4 text-center">Status</th>
                      {(role === 'ADMIN' || role === 'GURU') && <th className="p-4 text-center w-28">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-10 text-center text-slate-500 italic">
                          {role === 'SISWA' ? 'Anda belum memiliki riwayat absensi di semester ini.' : 'Belum ada rekaman absensi terdaftar untuk kriteria filter ini.'}
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map((att, idx) => (
                        <tr key={att.id} className="hover:bg-slate-800/20 text-slate-300 transition duration-100">
                          <td className="p-4 text-center font-semibold text-slate-500">{idx + 1}</td>
                          <td className="p-4">
                            <p className="font-bold text-white text-sm">{att.studentName}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">NISN: {att.nisn}</p>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 text-[10px] font-bold text-teal-400 bg-teal-500/10 rounded border border-teal-500/10">
                              {att.class}
                            </span>
                          </td>
                          <td className="p-4 font-semibold text-slate-300">{att.date}</td>
                          <td className="p-4 text-slate-400 font-mono">
                            {new Date(att.timestamp).toLocaleTimeString('id-ID')} WIB
                          </td>
                          <td className="p-4">
                            <p className="text-slate-400">{att.academicYear}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Semester {att.semester}</p>
                          </td>
                          <td className="p-4 text-center">
                            {editingRecordId === att.id ? (
                              <select
                                value={att.status}
                                onChange={(e) => {
                                  onMarkAttendance(att.nisn, e.target.value as any, att.date);
                                  setEditingRecordId(null);
                                }}
                                className="bg-slate-900 border border-slate-700 text-white rounded text-xs px-2 py-1.5 focus:outline-none"
                                onBlur={() => setEditingRecordId(null)}
                                autoFocus
                              >
                                <option value="Hadir">Hadir</option>
                                <option value="Sakit">Sakit</option>
                                <option value="Izin">Izin</option>
                                <option value="Alpa">Alpa</option>
                              </select>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                att.status === 'Hadir'
                                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/10'
                                  : att.status === 'Sakit'
                                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/10'
                                  : att.status === 'Izin'
                                  ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/10'
                                  : 'text-rose-400 bg-rose-500/10 border-rose-500/10'
                              }`}>
                                {att.status}
                              </span>
                            )}
                          </td>
                          {(role === 'ADMIN' || role === 'GURU') && (
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingRecordId(editingRecordId === att.id ? null : att.id)}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-lg transition"
                                  title="Edit Status"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {role === 'ADMIN' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Hapus log kehadiran ${att.studentName}?`)) {
                                        onDeleteAttendance(att.id);
                                      }
                                    }}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 rounded-lg transition"
                                    title="Hapus Log"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : subTab === 'manual' ? (
            // --- SUB-VIEW 2: ABSENSI KELAS MANUAL MATRIX ---
            <div className="space-y-4">
              <div className="p-5 bg-slate-950/20 border border-slate-800 rounded-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-white text-sm">Absensi Kelas Konvensional</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Pilih kelas dan tanggal (bisa tanggal yang telah lalu) untuk mengisi & mengedit absensi secara massal.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Class Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Kelas</label>
                      <select
                        value={manualClass}
                        onChange={(e) => setManualClass(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-slate-300 font-semibold text-xs focus:outline-none"
                      >
                        {availableClasses.map(c => (
                          <option key={c} value={c}>Kelas {c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date Picker */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tanggal Absen</label>
                      <input
                        type="date"
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg py-1 px-3 text-slate-300 font-semibold text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Holiday Warning Banner */}
                {getHolidayInfo(manualDate) && (
                  <div className="mt-4 flex gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3.5 rounded-xl text-xs animate-fadeIn">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="font-bold">Perhatian: Hari Libur Terdeteksi</p>
                      <p className="text-amber-300/80 mt-0.5 leading-relaxed">
                        Tanggal {manualDate} adalah {getHolidayInfo(manualDate)}. Absensi pada hari libur biasanya tidak diwajibkan. Namun Anda tetap dapat menginput jika diperlukan.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Students Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {students.filter(s => s.class === manualClass).length === 0 ? (
                  <div className="col-span-full p-12 text-center text-slate-500 italic bg-slate-950/10 border border-slate-800/60 rounded-xl">
                    Tidak ada siswa terdaftar di Kelas {manualClass || '-'}. Silakan tambahkan siswa di menu Manajemen Siswa.
                  </div>
                ) : (
                  students
                    .filter(s => s.class === manualClass)
                    .map((student) => {
                      // Get current record on the selected manualDate
                      const currentRecord = attendance.find(
                        a => a.nisn === student.nisn && a.date === manualDate
                      );
                      const currentStatus = currentRecord ? currentRecord.status : 'Belum Diabsen';

                      return (
                        <div
                          key={student.nisn}
                          className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 uppercase">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">{student.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">NISN: {student.nisn} | Kelas {student.class}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/50">
                            <div className="text-xs">
                              <span className="text-slate-500">Status: </span>
                              <span className={`font-bold uppercase ${
                                currentStatus === 'Hadir'
                                  ? 'text-emerald-400'
                                  : currentStatus === 'Sakit'
                                  ? 'text-amber-400'
                                  : currentStatus === 'Izin'
                                  ? 'text-cyan-400'
                                  : currentStatus === 'Alpa'
                                  ? 'text-rose-400'
                                  : 'text-slate-400'
                              }`}>
                                {currentStatus}
                              </span>
                            </div>

                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => onMarkAttendance(student.nisn, 'Hadir', manualDate)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded transition border ${
                                  currentStatus === 'Hadir'
                                    ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-md shadow-emerald-500/10'
                                    : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:bg-slate-800'
                                }`}
                              >
                                H
                              </button>
                              <button
                                type="button"
                                onClick={() => onMarkAttendance(student.nisn, 'Sakit', manualDate)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded transition border ${
                                  currentStatus === 'Sakit'
                                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/10'
                                    : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:bg-slate-800'
                                }`}
                                title="Sakit"
                              >
                                S
                              </button>
                              <button
                                type="button"
                                onClick={() => onMarkAttendance(student.nisn, 'Izin', manualDate)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded transition border ${
                                  currentStatus === 'Izin'
                                    ? 'bg-cyan-500 text-slate-950 border-cyan-500 shadow-md shadow-cyan-500/10'
                                    : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:bg-slate-800'
                                }`}
                                title="Izin"
                              >
                                I
                              </button>
                              <button
                                type="button"
                                onClick={() => onMarkAttendance(student.nisn, 'Alpa', manualDate)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded transition border ${
                                  currentStatus === 'Alpa'
                                    ? 'bg-rose-500 text-slate-950 border-rose-500 shadow-md shadow-rose-500/10'
                                    : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:bg-slate-800'
                                }`}
                                title="Alpa"
                              >
                                A
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          ) : (
            // --- SUB-VIEW 3: HARI LIBUR MADRASAH ---
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form to Add Holiday */}
                <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-white text-sm">Tambah Hari Libur Baru</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">Kustomisasi hari libur madrasah selain hari Minggu. Hari libur ini otomatis mematikan kewajiban absensi siswa pada kalender tersebut.</p>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newHolidayDate || !newHolidayDesc) {
                        alert('Silakan isi tanggal dan keterangan libur.');
                        return;
                      }
                      if (onAddHoliday) {
                        onAddHoliday(newHolidayDate, newHolidayDesc);
                        setNewHolidayDate('');
                        setNewHolidayDesc('');
                        alert('Hari libur berhasil didaftarkan.');
                      }
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tanggal Libur</label>
                      <input
                        type="date"
                        required
                        value={newHolidayDate}
                        onChange={(e) => setNewHolidayDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama / Keterangan Libur</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Isra Mi'raj, Libur Nasional"
                        value={newHolidayDesc}
                        onChange={(e) => setNewHolidayDesc(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs uppercase flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Simpan Hari Libur</span>
                    </button>
                  </form>
                </div>

                {/* Holiday list */}
                <div className="lg:col-span-2 p-5 bg-slate-950/20 border border-slate-800 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Daftar Hari Libur Kustom Madrasah</h3>
                    
                    <div className="overflow-x-auto border border-slate-850 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider">
                            <th className="p-3 w-12 text-center">No</th>
                            <th className="p-3">Tanggal</th>
                            <th className="p-3">Keterangan</th>
                            <th className="p-3 text-center w-16">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {holidays.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-8 text-center text-slate-500 italic">
                                Belum ada hari libur kustom yang terdaftar. Gunakan panel kiri untuk mendaftarkan libur baru.
                              </td>
                            </tr>
                          ) : (
                            holidays.map((h, idx) => (
                              <tr key={h.id} className="hover:bg-slate-800/10 text-slate-300">
                                <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                                <td className="p-3 font-semibold font-mono text-emerald-400">{h.date}</td>
                                <td className="p-3 text-slate-200">{h.description}</td>
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Hapus konfigurasi libur pada tanggal ${h.date}?`)) {
                                        if (onDeleteHoliday) onDeleteHoliday(h.id);
                                      }
                                    }}
                                    className="p-1 text-rose-400 hover:text-rose-300 transition"
                                    title="Hapus Libur"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-4 leading-relaxed italic">
                    *Catatan: Sistem secara otomatis menandai hari Minggu sebagai hari libur (Hari Minggu - Libur Akhir Pekan), sehingga Anda tidak perlu menambahkannya secara manual.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
