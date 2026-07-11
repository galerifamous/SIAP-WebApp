/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { toast, showConfirm } from '../utils/dialog';
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
  Printer,
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
  Undo,
  SwitchCamera
} from 'lucide-react';
import { Student, Attendance, Holiday, Teacher, ClassStaff } from '../types';
import { downloadFile, convertToCSV, printToPDF, downloadToPDF } from '../utils/export';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  teachers?: Teacher[];
  classStaffs?: ClassStaff[];
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
  onDeleteHoliday,
  teachers,
  classStaffs
}: AbsensiSecProps) {
  const activeTab = activeMenu ? (activeMenu === 'absensi-scan' ? 'scan' : 'list') : (role === 'SISWA' ? 'list' : 'scan');

  // Scanner Simulator States
  const [scanInput, setScanInput] = useState('');
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'Hadir' | 'Sakit' | 'Izin' | 'Alpa'>('Hadir');

  // Real Camera States
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'environment' | 'user'>('environment');
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
            { facingMode: cameraMode },
            {
              fps: 10,
              qrbox: { width: 300, height: 300 }
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
  }, [activeTab, role, cameraMode]);

  // List States
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState(() => {
    return (role === 'GURU' && availableClasses && availableClasses.length > 0)
      ? availableClasses[0]
      : '';
  });
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

  // Monthly rekap Excel generator (highly structured dual-row merged format)
  const handleExportMonthlyCSV = () => {
    const yearNum = Number(monthlyYear);
    const monthNum = Number(monthlyMonth);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const targetPrefix = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}`;
    const targetStudents = monthlyClass 
      ? students.filter(s => s.class === monthlyClass)
      : students;

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNames[monthNum - 1];

    let schoolAddress = '';
    let logoUrl = '';
    let govLogoUrl = '';
    try {
      const sysRaw = localStorage.getItem('siap_system');
      if (sysRaw) {
        const sys = JSON.parse(sysRaw);
        if (sys.schoolAddress) schoolAddress = sys.schoolAddress;
        if (sys.logoUrl) logoUrl = sys.logoUrl;
        if (sys.govLogoUrl) govLogoUrl = sys.govLogoUrl;
      }
    } catch (e) {
      // ignore
    }

    // Header 1
    const row1 = ['No', 'NISN', 'Nama Siswa', 'JK (L/P)', `${monthName.toUpperCase()} ${monthlyYear}`];
    for (let d = 1; d < daysInMonth; d++) {
      row1.push(''); // spacing for monthly merge
    }
    row1.push('Jumlah', '', '', '');

    // Header 2
    const row2 = ['', '', '', ''];
    for (let d = 1; d <= daysInMonth; d++) {
      row2.push(String(d));
    }
    row2.push('H', 'S', 'I', 'A');

    // Rows data
    const dataRows = targetStudents.map((student, idx) => {
      const studentAtts = attendance.filter(
        att => att.nisn === student.nisn && att.date.startsWith(targetPrefix)
      );

      let hCount = 0;
      let sCount = 0;
      let iCount = 0;
      let aCount = 0;

      const dailyStatuses = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${targetPrefix}-${String(d).padStart(2, '0')}`;
        const att = studentAtts.find(a => a.date === dateStr);
        let char = '';
        if (att) {
          if (att.status === 'Hadir') { char = 'H'; hCount++; }
          else if (att.status === 'Sakit') { char = 'S'; sCount++; }
          else if (att.status === 'Izin') { char = 'I'; iCount++; }
          else if (att.status === 'Alpa') { char = 'A'; aCount++; }
        }
        dailyStatuses.push(char);
      }

      return [
        idx + 1,
        student.nisn,
        student.name,
        student.gender === 'Laki-laki' ? 'L' : 'P',
        ...dailyStatuses,
        hCount,
        sCount,
        iCount,
        aCount
      ];
    });

    const logoStatus = logoUrl ? 'TERUNGGAH & AKTIF' : 'BELUM DIUNGGAH';
    const govLogoStatus = govLogoUrl ? 'TERUNGGAH & AKTIF' : 'BELUM DIUNGGAH';
    const headerRows = [
      ['KEMENTERIAN AGAMA REPUBLIK INDONESIA'],
      [schoolName],
      [schoolAddress || 'Alamat lengkap instansi sekolah belum disetting.'],
      [`STATUS LOGO INSTANSI/DINAS: ${govLogoStatus} | STATUS LOGO MADRASAH: ${logoStatus}`],
      [],
      [`REKAP BULANAN PRESENSI SISWA - KELAS ${monthlyClass || 'SEMUA KELAS'}`],
      [`Bulan: ${monthName} ${monthlyYear} | TP: ${academicYear} | Semester: ${semester}`],
      [],
    ];

    const aoa = [...headerRows, row1, row2, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Set neat, fixed column widths (paten) so user doesn't need to resize manually
    const cols = [
      { wch: 5 },  // No
      { wch: 15 }, // NISN
      { wch: 28 }, // Nama Siswa
      { wch: 6 },  // JK
    ];
    for (let d = 1; d <= daysInMonth; d++) {
      cols.push({ wch: 4 }); // Very compact day columns
    }
    cols.push({ wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 4 }); // H, S, I, A count columns
    ws['!cols'] = cols;

    // Set merges shifted by 8 header rows
    ws['!merges'] = [
      { s: { r: 8, c: 0 }, e: { r: 9, c: 0 } }, // No
      { s: { r: 8, c: 1 }, e: { r: 9, c: 1 } }, // NISN
      { s: { r: 8, c: 2 }, e: { r: 9, c: 2 } }, // Nama Siswa
      { s: { r: 8, c: 3 }, e: { r: 9, c: 3 } }, // JK
      { s: { r: 8, c: 4 }, e: { r: 8, c: 4 + daysInMonth - 1 } }, // Bulan 1-31
      { s: { r: 8, c: 4 + daysInMonth }, e: { r: 8, c: 4 + daysInMonth + 3 } } // Jumlah
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Presensi Bulanan');
    XLSX.writeFile(wb, `Rekap_Presensi_Bulanan_${monthlyClass || 'Semua'}_${monthName}_${monthlyYear}.xlsx`);
  };

  // Monthly rekap PDF generator (A4 landscape high fidelity printer)
  const handleExportMonthlyPDF = () => {
    const yearNum = Number(monthlyYear);
    const monthNum = Number(monthlyMonth);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const targetPrefix = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}`;
    const targetStudents = monthlyClass 
      ? students.filter(s => s.class === monthlyClass)
      : students;

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNames[monthNum - 1];

    // Retrieve headmaster and system variables
    let schoolAddress = '';
    let logoUrl = '';
    let govLogoUrl = '';
    let headmasterName = 'Makhfud, S.Pd.';
    try {
      const sysRaw = localStorage.getItem('siap_system');
      if (sysRaw) {
        const sys = JSON.parse(sysRaw);
        if (sys.schoolAddress) schoolAddress = sys.schoolAddress;
        if (sys.logoUrl) logoUrl = sys.logoUrl;
        if (sys.govLogoUrl) govLogoUrl = sys.govLogoUrl;
        if (sys.headmasterName) headmasterName = sys.headmasterName;
      }
    } catch (e) {
      // ignore
    }

    let cityName = 'Indonesia';
    if (schoolAddress) {
      const parts = schoolAddress.split(',');
      if (parts.length > 1) {
        cityName = parts[parts.length - 2].trim().replace(/Kec\.|Kab\.|Kota/g, '').trim();
      } else if (parts.length > 0) {
        cityName = parts[0].trim();
      }
    }
    if (!cityName || cityName.length > 20) {
      cityName = 'Kota Sekolah';
    }

    const formattedDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    let waliKelasName = '';
    if (monthlyClass && classStaffs && teachers) {
      const staff = classStaffs.find(cs => cs.classId === monthlyClass);
      if (staff) {
        const teacher = teachers.find(t => t.nuptk === staff.waliKelasNuptk);
        if (teacher) {
          waliKelasName = teacher.name;
        }
      }
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.warning('Mohon aktifkan popup browser Anda untuk mencetak laporan.');
      return;
    }

    const dateKeys: string[] = [];
    const dateSubHeadersHtml: string[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${targetPrefix}-${String(d).padStart(2, '0')}`;
      dateKeys.push(dateStr);

      const dateObj = new Date(yearNum, monthNum - 1, d);
      const isSunday = dateObj.getDay() === 0;
      const holiday = holidays.find(h => h.date === dateStr);
      const isHoliday = isSunday || !!holiday;

      const bgStyle = isHoliday ? 'background-color: #fee2e2; color: #dc2626; font-weight: bold;' : '';
      dateSubHeadersHtml.push(
        `<th style="padding: 4px; border: 1px solid #94a3b8; text-align: center; font-size: 8px; width: 18px; ${bgStyle}">${d}</th>`
      );
    }

    const studentRowsHtml = targetStudents.map((student, sIdx) => {
      const studentAtts = attendance.filter(
        att => att.nisn === student.nisn && att.date.startsWith(targetPrefix)
      );

      let hCount = 0;
      let sCount = 0;
      let iCount = 0;
      let aCount = 0;

      const cellsHtml = dateKeys.map((dateStr, dIdx) => {
        const dateObj = new Date(yearNum, monthNum - 1, dIdx + 1);
        const isSunday = dateObj.getDay() === 0;
        const holiday = holidays.find(h => h.date === dateStr);
        const isHoliday = isSunday || !!holiday;

        const att = studentAtts.find(a => a.date === dateStr);
        let statusChar = '';
        if (att) {
          if (att.status === 'Hadir') { statusChar = 'H'; hCount++; }
          else if (att.status === 'Sakit') { statusChar = 'S'; sCount++; }
          else if (att.status === 'Izin') { statusChar = 'I'; iCount++; }
          else if (att.status === 'Alpa') { statusChar = 'A'; aCount++; }
        }

        const bgStyle = isHoliday ? 'background-color: #fca5a5; color: #b91c1c; font-weight: bold;' : '';
        return `<td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center; font-size: 8px; ${bgStyle}">${statusChar}</td>`;
      }).join('');

      return `
        <tr>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 9px;">${sIdx + 1}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 9px;">${student.nisn}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 9px; text-align: left;">${student.name}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 9px;">${student.gender === 'Laki-laki' ? 'L' : 'P'}</td>
          ${cellsHtml}
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; font-size: 9px; background-color: #f8fafc;">${hCount}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; font-size: 9px; background-color: #f8fafc;">${sCount}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; font-size: 9px; background-color: #f8fafc;">${iCount}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; font-size: 9px; background-color: #f8fafc;">${aCount}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Rekap Bulanan Absensi - ${monthName} ${monthlyYear}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            @page {
              size: A4 landscape;
              margin: 8mm 8mm 12mm 8mm;
            }
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              font-size: 10px;
            }
            .kop-container {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 3px double #0f172a;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .kop-logo {
              width: 55px;
              height: 55px;
              object-fit: contain;
            }
            .kop-logo-left {
              margin-right: 15px;
            }
            .kop-logo-right {
              margin-left: 15px;
            }
            .kop-text {
              text-align: center;
              flex-grow: 1;
            }
            .kop-school {
              font-size: 14px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0;
              color: #0f172a;
            }
            .kop-sub {
              font-size: 9px;
              color: #475569;
              margin: 3px 0 0 0;
              line-height: 1.3;
            }
            .title-section {
              text-align: center;
              margin-bottom: 15px;
            }
            .title-main {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0;
            }
            .title-sub {
              font-size: 9px;
              color: #475569;
              margin: 3px 0 0 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background-color: #f1f5f9;
              color: #1e293b;
              font-weight: bold;
              text-transform: uppercase;
            }
            .signature-container {
              margin-top: 15px;
              display: flex;
              justify-content: flex-end;
              page-break-inside: avoid;
            }
            .signature-box {
              text-align: center;
              width: 220px;
              font-size: 9px;
            }
            .signature-space {
              height: 45px;
            }
            .document-footer {
              position: fixed;
              bottom: -5mm;
              left: 0;
              right: 0;
              height: 15px;
              display: flex;
              justify-content: space-between;
              font-size: 8px;
              color: #94a3b8;
              font-family: 'Inter', sans-serif;
              border-top: 1px solid #cbd5e1;
              padding-top: 4px;
              z-index: 9999;
            }
            .document-footer-left {
              font-weight: bold;
            }
            .document-footer-right::after {
              content: "Halaman " counter(page);
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <!-- Footer on every page -->
          <div class="document-footer">
            <div class="document-footer-left">Aplikasi SIAP • Dokumen Resmi Madrasah</div>
            <div class="document-footer-right"></div>
          </div>

          <!-- Beautiful Kop Surat (Letterhead) -->
          <div class="kop-container">
            ${govLogoUrl ? `
              <img src="${govLogoUrl}" class="kop-logo kop-logo-left" />
            ` : `
              <div class="kop-logo kop-logo-left" style="width: 55px; height: 55px; border-radius: 50%; background: #f1f5f9; border: 1px solid #0f172a; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #475569; text-align: center; line-height: 1.2;">KOP<br/>DINAS</div>
            `}
            <div class="kop-text" style="text-align: center; flex-grow: 1;">
              <p class="kop-kemendikbud" style="font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #1e293b; margin: 0 0 3px 0;">KEMENTERIAN AGAMA REPUBLIK INDONESIA</p>
              <h1 class="kop-school-name" style="font-size: 18px; font-weight: bold; text-transform: uppercase; color: #0f172a; margin: 0 0 4px 0; letter-spacing: 0.5px; line-height: 1.1;">${schoolName}</h1>
              <p class="kop-alamat" style="font-size: 9px; color: #475569; margin: 0; line-height: 1.4; font-weight: 500;">${schoolAddress || 'Alamat lengkap instansi sekolah belum disetting.'}</p>
            </div>
            ${logoUrl ? `
              <img src="${logoUrl}" class="kop-logo kop-logo-right" />
            ` : `
              <div class="kop-logo kop-logo-right" style="width: 55px; height: 55px; border-radius: 50%; background: #f1f5f9; border: 1px solid #0f172a; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #475569; text-align: center; line-height: 1.2;">KOP<br/>SEKOLAH</div>
            `}
          </div>

          <div class="title-section">
            <h2 class="title-main">REKAPITULASI PRESENSI BULANAN SISWA</h2>
            <p class="title-sub">Bulan: <strong>${monthName.toUpperCase()} ${monthlyYear}</strong> | Kelas: <strong>${monthlyClass || 'SEMUA KELAS'}</strong> | TP: <strong>${academicYear}</strong></p>
          </div>

          <table>
            <thead>
              <tr>
                <th rowspan="2" style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-size: 9px; width: 30px;">No</th>
                <th rowspan="2" style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-size: 9px; width: 75px;">NISN</th>
                <th rowspan="2" style="padding: 6px; border: 1px solid #94a3b8; text-align: left; font-size: 9px; width: 180px;">Nama Siswa</th>
                <th rowspan="2" style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-size: 9px; width: 40px;">JK</th>
                <th colspan="${daysInMonth}" style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-size: 9px;">Tanggal</th>
                <th colspan="4" style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-size: 9px; width: 80px;">Jumlah</th>
              </tr>
              <tr>
                ${dateSubHeadersHtml.join('')}
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: center; font-size: 8px; width: 20px; background-color: #f8fafc;">H</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: center; font-size: 8px; width: 20px; background-color: #f8fafc;">S</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: center; font-size: 8px; width: 20px; background-color: #f8fafc;">I</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: center; font-size: 8px; width: 20px; background-color: #f8fafc;">A</th>
              </tr>
            </thead>
            <tbody>
              ${studentRowsHtml}
            </tbody>
          </table>

          <!-- Aligned Dual Signature Footer -->
          <div class="signature-container" style="display: flex; justify-content: space-between; margin-top: 30px; page-break-inside: avoid; text-align: center; font-size: 11px;">
            <div class="signature-box" style="width: 250px; text-align: left;">
              <p style="visibility: hidden;">${cityName}, ${formattedDate}</p>
              <p style="margin-top: 3px; font-weight: bold; margin-bottom: 15px;">Mengetahui,</p>
              <p style="margin-top: 3px; font-weight: bold;">Kepala Madrasah,</p>
              <div class="signature-space" style="height: 50px;"></div>
              <p style="font-weight: bold; text-decoration: underline; margin: 0; text-transform: uppercase;">${headmasterName}</p>
              <p style="color: #64748b; margin: 2px 0 0 0;">NIP. 197812052005011002</p>
            </div>

            <div class="signature-box" style="width: 250px; text-align: right;">
              <p>${cityName}, ${formattedDate}</p>
              <p style="visibility: hidden; margin-top: 3px; margin-bottom: 15px;">&nbsp;</p>
              <p style="margin-top: 3px; font-weight: bold; padding-right: 25px;">Wali Kelas,</p>
              <div class="signature-space" style="height: 50px;"></div>
              <p style="font-weight: bold; text-decoration: underline; margin: 0; text-transform: uppercase; padding-right: 25px;">${waliKelasName || '........................'}</p>
              <p style="color: #64748b; margin: 2px 0 0 0; padding-right: 25px;">NIP. ................................</p>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Download Monthly PDF Directly in widescreen landscape orientation
  const handleDownloadMonthlyPDF = () => {
    const yearNum = Number(monthlyYear);
    const monthNum = Number(monthlyMonth);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const targetPrefix = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}`;
    const targetStudents = monthlyClass 
      ? students.filter(s => s.class === monthlyClass)
      : students;

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNames[monthNum - 1];

    let waliKelasName = '';
    if (monthlyClass && classStaffs && teachers) {
      const staff = classStaffs.find(cs => cs.classId === monthlyClass);
      if (staff) {
        const teacher = teachers.find(t => t.nuptk === staff.waliKelasNuptk);
        if (teacher) {
          waliKelasName = teacher.name;
        }
      }
    }

    const dayHeaders = [];
    for (let d = 1; d <= daysInMonth; d++) {
      dayHeaders.push(String(d));
    }
    const headers = ['No', 'NISN', 'Nama Siswa', 'JK', ...dayHeaders, 'H', 'S', 'I', 'A'];

    const rows = targetStudents.map((student, sIdx) => {
      const studentAtts = attendance.filter(
        att => att.nisn === student.nisn && att.date.startsWith(targetPrefix)
      );

      let hCount = 0;
      let sCount = 0;
      let iCount = 0;
      let aCount = 0;

      const dayStatuses = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${targetPrefix}-${String(d).padStart(2, '0')}`;
        const att = studentAtts.find(a => a.date === dateStr);
        let statusChar = '-';
        if (att) {
          if (att.status === 'Hadir') { statusChar = 'H'; hCount++; }
          else if (att.status === 'Sakit') { statusChar = 'S'; sCount++; }
          else if (att.status === 'Izin') { statusChar = 'I'; iCount++; }
          else if (att.status === 'Alpa') { statusChar = 'A'; aCount++; }
        }
        dayStatuses.push(statusChar);
      }

      return [
        String(sIdx + 1),
        student.nisn,
        student.name,
        student.gender === 'Laki-laki' ? 'L' : 'P',
        ...dayStatuses,
        String(hCount),
        String(sCount),
        String(iCount),
        String(aCount)
      ];
    });

    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

    let schoolAddress = '';
    let headmasterName = 'Makhfud, S.Pd.';
    let logoUrl = '';
    let govLogoUrl = '';
    try {
      const sysRaw = localStorage.getItem('siap_system');
      if (sysRaw) {
        const sys = JSON.parse(sysRaw);
        if (sys.schoolAddress) schoolAddress = sys.schoolAddress;
        if (sys.headmasterName) headmasterName = sys.headmasterName;
        if (sys.logoUrl) logoUrl = sys.logoUrl;
        if (sys.govLogoUrl) govLogoUrl = sys.govLogoUrl;
      }
    } catch (e) {
      // ignore
    }

    if (govLogoUrl) {
      try {
        doc.addImage(govLogoUrl, 'PNG', 15, 8, 18, 18);
      } catch (e) {
        console.error("Error adding gov logo to Landscape PDF:", e);
      }
    }

    if (logoUrl) {
      try {
        doc.addImage(logoUrl, 'PNG', 264, 8, 18, 18);
      } catch (e) {
        console.error("Error adding school logo to Landscape PDF:", e);
      }
    }

    let cityName = 'Indonesia';
    if (schoolAddress) {
      const parts = schoolAddress.split(',');
      if (parts.length > 1) {
        cityName = parts[parts.length - 2].trim().replace(/Kec\.|Kab\.|Kota/g, '').trim();
      } else if (parts.length > 0) {
        cityName = parts[0].trim();
      }
    }
    if (!cityName || cityName.length > 20) {
      cityName = 'Kota Sekolah';
    }
    const formattedDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', 148, 12, { align: 'center' });
    
    doc.setFontSize(15);
    doc.text(schoolName, 148, 18, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(schoolAddress || 'Alamat sekolah belum dikonfigurasi.', 148, 23, { align: 'center' });

    doc.setLineWidth(0.8);
    doc.line(15, 27, 282, 27);
    doc.setLineWidth(0.2);
    doc.line(15, 28, 282, 28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`REKAP BULANAN ABSENSI SISWA`, 148, 35, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Bulan: ${monthName} ${monthlyYear} | Kelas: ${monthlyClass || 'Semua Kelas'} | TP: ${academicYear} | Semester: ${semester}`, 15, 42);

    autoTable(doc, {
      startY: 46,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], fontSize: 6.5, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 6, cellPadding: 1, halign: 'center' },
      columnStyles: {
        2: { halign: 'left', fontStyle: 'bold' }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 15, right: 15 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;
    const pageHeight = doc.internal.pageSize.height;
    let sigY = finalY;
    if (finalY + 35 > pageHeight) {
      doc.addPage();
      sigY = 20;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    // Right signature (Wali Kelas)
    doc.text(`${cityName}, ${formattedDate}`, 210, sigY);
    doc.text('Wali Kelas,', 210, sigY + 10);
    doc.text(waliKelasName || '........................', 210, sigY + 27);
    doc.text('NIP. ................................', 210, sigY + 31);

    // Left signature (Kepala Madrasah)
    doc.text('Mengetahui,', 30, sigY + 5);
    doc.text('Kepala Madrasah,', 30, sigY + 10);
    doc.text(headmasterName, 30, sigY + 27);
    doc.text('NIP. 197812052005011002', 30, sigY + 31);

    doc.save(`Rekap_Absensi_${monthlyClass || 'Semua'}_${monthName}_${monthlyYear}.pdf`);
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
  }).sort((a, b) => {
    const classA = (a.class || '').toLowerCase();
    const classB = (b.class || '').toLowerCase();
    if (classA !== classB) {
      return classA.localeCompare(classB, 'id');
    }
    const nameA = (a.studentName || '').toLowerCase();
    const nameB = (b.studentName || '').toLowerCase();
    return nameA.localeCompare(nameB, 'id');
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

  // Download PDF directly
  const handleDownloadPDF = () => {
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
    downloadToPDF(
      `Laporan Absensi Siswa - ${dateFilter || 'Semua Tanggal'}`,
      headers,
      rows,
      `Rekap_Absensi_${dateFilter || 'SemuaTanggal'}.pdf`,
      schoolName,
      academicYear,
      semester
    );
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
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-1 mb-2">
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest">
                  Kamera Scanner Otomatis Aktif
                </span>
                <button
                  type="button"
                  onClick={() => setCameraMode(prev => prev === 'environment' ? 'user' : 'environment')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold uppercase border border-slate-750 transition cursor-pointer active:scale-95"
                  title="Balik kamera (Kamera Depan / Belakang)"
                >
                  <SwitchCamera className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Kamera: {cameraMode === 'environment' ? 'Belakang (Utama)' : 'Depan (Selfie)'}</span>
                </button>
              </div>
              
              {/* Animated Scan Stage */}
              <div className="relative my-8 mx-auto w-full max-w-[420px] aspect-square rounded-2xl border border-slate-700/60 overflow-hidden bg-slate-900 shadow-2xl flex flex-col items-center justify-center">
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
              <p className="text-[10px] text-slate-500 mb-4">Klik tombol H, S, I, atau A untuk mencatat status siswa secara manual. Data otomatis sinkron real-time di semua akun Guru Kelas, Guru Mapel, & Admin.</p>

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
                    {role !== 'GURU' && (
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
                    )}

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
                      className="p-2.5 bg-slate-800 hover:bg-slate-700/80 text-emerald-400 border border-slate-700/60 rounded-xl transition duration-150 cursor-pointer"
                      title="Unduh Rekap Harian Excel"
                    >
                      <FileSpreadsheet className="w-4.5 h-4.5" />
                    </button>

                    <button
                      onClick={handleDownloadPDF}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700/80 text-sky-400 border border-slate-700/60 rounded-xl transition duration-150 cursor-pointer"
                      title="Unduh Rekap Harian PDF (.pdf) Langsung"
                    >
                      <FileDown className="w-4.5 h-4.5" />
                    </button>

                    <button
                      onClick={handleExportPDF}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700/80 text-rose-400 border border-slate-700/60 rounded-xl transition duration-150 cursor-pointer"
                      title="Cetak Rekap Harian PDF"
                    >
                      <Printer className="w-4.5 h-4.5" />
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

                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleExportMonthlyCSV}
                        className="flex-1 min-w-[75px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-1.5 rounded-lg text-[9px] uppercase flex items-center justify-center gap-1 transition shadow-lg shadow-emerald-500/10 cursor-pointer"
                        title="Unduh Excel (.xlsx) Rekap Bulanan"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Excel</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadMonthlyPDF}
                        className="flex-1 min-w-[75px] bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-1.5 rounded-lg text-[9px] uppercase flex items-center justify-center gap-1 transition shadow-lg shadow-sky-500/10 cursor-pointer"
                        title="Unduh PDF (.pdf) Rekap Bulanan Langsung"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportMonthlyPDF}
                        className="flex-1 min-w-[75px] bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 rounded-lg font-bold py-1.5 text-[9px] uppercase flex items-center justify-center gap-1 transition cursor-pointer"
                        title="Cetak Laporan Bulanan PDF / Pratinjau"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak</span>
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
                          toast.warning('Silakan pilih siswa terlebih dahulu.');
                          return;
                        }
                        onMarkAttendance(selectNisn, selectStatus, dateFilter);
                        toast.success(`Absensi ${selectStatus} berhasil dicatat.`);
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
                                    onClick={async () => {
                                      const confirmed = await showConfirm(`Hapus log kehadiran ${att.studentName}?`, {
                                        title: 'Hapus Log Kehadiran',
                                        type: 'danger'
                                      });
                                      if (confirmed) {
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
                    <p className="text-slate-500 text-xs mt-0.5">Pilih kelas dan tanggal untuk mengisi & mengedit absensi secara massal. Semua perubahan langsung sinkron di akun Guru Kelas, Guru Mapel, & Admin.</p>
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
                        toast.warning('Silakan isi tanggal dan keterangan libur.');
                        return;
                      }
                      if (onAddHoliday) {
                        onAddHoliday(newHolidayDate, newHolidayDesc);
                        setNewHolidayDate('');
                        setNewHolidayDesc('');
                        toast.success('Hari libur berhasil didaftarkan.');
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
                                    onClick={async () => {
                                      const confirmed = await showConfirm(`Hapus konfigurasi libur pada tanggal ${h.date}?`, {
                                        title: 'Hapus Hari Libur',
                                        type: 'danger'
                                      });
                                      if (confirmed) {
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
