/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Scan, 
  SwitchCamera, 
  Search, 
  Calendar, 
  Users, 
  ChevronDown, 
  ChevronRight, 
  Mail, 
  Check, 
  AlertTriangle, 
  X, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  HelpCircle
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, Teacher, ClassStaff, EmailLog, User as UserType } from '../types';

// Toast Notification System
const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
  // Let's create a visual toast that looks amazing
  const toastContainerId = 'sholat-toast-container';
  let container = document.getElementById(toastContainerId);
  if (!container) {
    container = document.createElement('div');
    container.id = toastContainerId;
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none';
    document.body.appendChild(container);
  }

  const toastEl = document.createElement('div');
  const bgClass = type === 'success' ? 'bg-slate-900/95 border-emerald-500/30' : type === 'warning' ? 'bg-slate-900/95 border-amber-500/30' : 'bg-slate-900/95 border-sky-500/30';
  const textClass = type === 'success' ? 'text-emerald-400' : type === 'warning' ? 'text-amber-400' : 'text-sky-400';
  const iconHtml = type === 'success' 
    ? `<span class="p-1 rounded-full bg-emerald-500/10 text-emerald-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg></span>` 
    : type === 'warning' 
      ? `<span class="p-1 rounded-full bg-amber-500/10 text-amber-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></span>` 
      : `<span class="p-1 rounded-full bg-sky-500/10 text-sky-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></span>`;

  toastEl.className = `p-4 rounded-2xl border ${bgClass} shadow-2xl flex items-start gap-3 transform translate-y-2 opacity-0 transition-all duration-300 pointer-events-auto bg-slate-950/95`;
  toastEl.innerHTML = `
    ${iconHtml}
    <div class="flex-1">
      <p class="text-xs font-semibold text-white">Sistem Sholat Dzuhur</p>
      <p class="text-[11px] text-slate-300 mt-0.5 leading-relaxed">${message}</p>
    </div>
    <button class="text-slate-500 hover:text-slate-300 transition cursor-pointer self-start" onclick="this.parentElement.remove()">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
    </button>
  `;

  container.appendChild(toastEl);
  
  // animate enter
  setTimeout(() => {
    toastEl.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  // auto dismiss
  setTimeout(() => {
    toastEl.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toastEl.remove(), 300);
  }, 4000);
};

export interface SholatAttendance {
  id: string;
  nisn: string;
  studentName: string;
  class: string;
  date: string; // YYYY-MM-DD
  status: 'Hadir' | 'Izin' | 'Bolos';
  academicYear: string;
  semester: string;
  timestamp: string;
  emailSent?: boolean;
}

interface SholatDzuhurSecProps {
  students: Student[];
  schoolName: string;
  academicYear: string;
  semester: string;
  availableClasses: string[];
  role: string;
  studentNisn?: string;
  teachers: Teacher[];
  classStaffs: ClassStaff[];
  activeMenu?: string;
  currentUser?: UserType;
}

export default function SholatDzuhurSec({
  students,
  schoolName,
  academicYear,
  semester,
  availableClasses,
  role,
  studentNisn,
  teachers,
  classStaffs,
  activeMenu,
  currentUser
}: SholatDzuhurSecProps) {
  const loggedTeacher = (role === 'GURU' && teachers && currentUser)
    ? teachers.find(t => t.nuptk === currentUser?.id || t.username === currentUser?.username)
    : undefined;
  const showClassFilter = role === 'ADMIN' || (role === 'GURU' && loggedTeacher?.dutyType === 'GURU_MAPEL');
  const teacherClass = (role === 'GURU' && loggedTeacher && loggedTeacher.dutyType === 'GURU_KELAS')
    ? (loggedTeacher.assignedClass || (classStaffs ? classStaffs.find(cs => cs.waliKelasNuptk === loggedTeacher.nuptk)?.classId : '') || '')
    : '';

  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'rekap'>(() => {
    if (activeMenu === 'sholat-rekap') return 'rekap';
    if (activeMenu === 'sholat-scan') return 'scan';
    return role === 'SISWA' ? 'rekap' : 'scan';
  });

  // Load holidays list from localStorage
  const [holidays] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('siap_holidays');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Sync activeTab when activeMenu prop changes
  useEffect(() => {
    if (activeMenu === 'sholat-rekap') {
      setActiveTab('rekap');
    } else if (activeMenu === 'sholat-scan') {
      // If we switch to scan submenu, default back to 'scan' or 'manual'
      if (activeTab === 'rekap') {
        setActiveTab('scan');
      }
    }
  }, [activeMenu]);

  // Local Attendance State loaded from LocalStorage
  const [sholatAttendance, setSholatAttendance] = useState<SholatAttendance[]>(() => {
    try {
      const stored = localStorage.getItem('siap_sholat_attendance');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Save State Helper
  const saveSholatAttendance = (data: SholatAttendance[]) => {
    setSholatAttendance(data);
    localStorage.setItem('siap_sholat_attendance', JSON.stringify(data));
  };

  // 1. Scan states
  const [scanStatus, setScanStatus] = useState<'Hadir' | 'Izin' | 'Bolos'>('Hadir');
  const [cameraMode, setCameraMode] = useState<'environment' | 'user'>('environment');
  const [hasCamera, setHasCamera] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [recentScans, setRecentScans] = useState<{ studentName: string; nisn: string; class: string; status: 'Hadir' | 'Izin' | 'Bolos'; time: string; emailStatus: string }[]>([]);

  // 2. Manual attendance states
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    // Local date in YYYY-MM-DD format
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [selectedClass, setSelectedClass] = useState(() => {
    return (role === 'GURU' && availableClasses && availableClasses.length > 0) ? availableClasses[0] : (availableClasses[0] || '');
  });
  const [searchManual, setSearchManual] = useState('');

  // 3. Monthly Rekap states
  const [rekapMonth, setRekapMonth] = useState(() => {
    const d = new Date();
    return String(d.getMonth() + 1); // 1-12
  });
  const [rekapYear, setRekapYear] = useState(() => {
    return String(new Date().getFullYear());
  });
  const [rekapClass, setRekapClass] = useState(() => {
    return (availableClasses && availableClasses.length > 0) ? availableClasses[0] : '';
  });

  useEffect(() => {
    if (teacherClass) {
      setRekapClass(teacherClass);
    }
  }, [teacherClass]);

  const scanStatusRef = useRef(scanStatus);
  useEffect(() => {
    scanStatusRef.current = scanStatus;
  }, [scanStatus]);

  // Audio simulation (Beep!)
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(900, audioCtx.currentTime); // Beep frequency
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      // ignore
    }
  };

  // SMTP Email Dispatch Simulator
  const triggerParentEmailNotification = (student: Student, status: 'Hadir' | 'Izin' | 'Bolos', dateStr: string) => {
    if (!student.parentEmail) return 'TIDAK TERKIRIM (Email Orangtua Kosong)';

    const formattedDate = new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let statusText = '';
    let emoji = '';
    let guidance = '';

    if (status === 'Hadir') {
      statusText = 'HADIR & IKUT BERJAMA’AH';
      emoji = '✔';
      guidance = 'Alhamdulillah, putra/putri Bapak/Ibu senantiasa menjaga kedisiplinan beribadah dengan melaksanakan Sholat Dzuhur Berjama\'ah tepat waktu di mushola sekolah. Semoga konsisten dan menjadi anak yang sholeh/sholehah.';
    } else if (status === 'Izin') {
      statusText = 'IZIN (Berhalangan Syar’i / Sakit)';
      emoji = '⚠';
      guidance = 'Putra/putri Bapak/Ibu telah melaporkan halangan syar’i atau uzur sakit yang dapat dimaklumi kepada petugas piket keagamaan. Semoga lekas sembuh atau dimudahkan.';
    } else if (status === 'Bolos') {
      statusText = 'BOLOS / TIDAK HADIR SHOLAT';
      emoji = '✘';
      guidance = 'PENTING: Putra/putri Bapak/Ibu tidak mengikuti kegiatan Sholat Dzuhur Berjama\'ah tanpa keterangan yang sah (bolos). Mohon kerjasamanya di rumah untuk memberikan pembinaan serta menanyakan kendala ibadah ananda agar senantiasa taat beribadah.';
    }

    const emailSubject = `[SIAP Ibadah] Laporan Sholat Dzuhur Jama’ah: ${student.name} - ${statusText}`;
    const emailContent = `Yth. Bapak/Ibu Wali Murid dari ananda ${student.name} (Kelas ${student.class}),

Kami menginformasikan laporan ibadah harian putra/putri Anda untuk ibadah:
Nama Kegiatan: Sholat Dzuhur Berjama'ah
Tanggal Ibadah: ${formattedDate}
Status Kehadiran: ${statusText} [${emoji}]

Pesan Pembinaan:
${guidance}

Terima kasih atas perhatian dan kerjasama Bapak/Ibu sekalian demi mewujudkan akhlakul karimah serta kebiasaan beribadah yang kokoh pada ananda tercinta.

Hormat kami,
Bidang Keagamaan & Kesiswaan
${schoolName}`;

    // Get sender info
    let senderEmail = 'noreply@madrasah.sch.id';
    let senderName = 'Sistem Informasi SIAP';
    try {
      const sessionRaw = localStorage.getItem('siap_session');
      if (sessionRaw) {
        const sess = JSON.parse(sessionRaw);
        senderName = sess.name || 'Petugas Keagamaan (SIAP)';
        senderEmail = sess.email || 'keagamaan@madrasah.sch.id';
      }
    } catch (e) {}

    const antiSpamFooter = `\n\n---\nEmail ini dikirim secara aman menggunakan akun terautentikasi ${senderEmail} (${senderName}). Memenuhi standar keamanan SPF, DKIM, & DMARC untuk menjamin pengantaran langsung ke Kotak Masuk (Inbox) tanpa masuk folder Spam.`;

    // Save to EmailLogs
    const newLogId = 'em-sholat-' + Date.now() + Math.random().toString(36).substring(2, 5);
    const emailLog: EmailLog = {
      id: newLogId,
      timestamp: new Date().toISOString(),
      recipient: student.parentEmail,
      role: `Orangtua ${student.name}`,
      subject: emailSubject,
      content: emailContent + antiSpamFooter,
      status: 'Success',
      type: 'Absensi', // categorized as Absensi
      sender: senderEmail,
      senderName: senderName
    };

    try {
      const oldLogsRaw = localStorage.getItem('siap_emails');
      const oldLogs = oldLogsRaw ? JSON.parse(oldLogsRaw) : [];
      localStorage.setItem('siap_emails', JSON.stringify([emailLog, ...oldLogs]));
      window.dispatchEvent(new Event('storage')); // notify other components
    } catch (e) {}

    // POST request to real backend endpoint
    fetch("/api/send-email", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: student.parentEmail,
        subject: emailSubject,
        content: emailContent + antiSpamFooter,
        senderName: senderName,
        senderEmail: senderEmail
      })
    }).catch(e => console.error("Email send API fail:", e));

    return `TERKIRIM KE: ${student.parentEmail}`;
  };

  // Record Attendance Handler (Core Logic)
  const handleMarkSholat = (nisn: string, status: 'Hadir' | 'Izin' | 'Bolos', dateStr: string) => {
    const student = students.find(s => s.nisn === nisn);
    if (!student) {
      showToast(`Siswa dengan NISN ${nisn} tidak terdaftar di database!`, 'warning');
      return null;
    }

    // Check duplicate on this date
    const existingIndex = sholatAttendance.findIndex(
      a => a.nisn === nisn && a.date === dateStr && a.academicYear === academicYear && a.semester === semester
    );

    const updated = [...sholatAttendance];
    let isNew = false;

    if (existingIndex > -1) {
      // update
      updated[existingIndex] = {
        ...updated[existingIndex],
        status,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        emailSent: true
      };
      saveSholatAttendance(updated);
    } else {
      // create
      isNew = true;
      const newRecord: SholatAttendance = {
        id: 'sholat-' + Date.now() + Math.random().toString(36).substring(2, 5),
        nisn,
        studentName: student.name,
        class: student.class,
        date: dateStr,
        status,
        academicYear,
        semester,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        emailSent: true
      };
      updated.unshift(newRecord);
      saveSholatAttendance(updated);
    }

    // Automatic dispatch email to parent
    const emailStatusStr = triggerParentEmailNotification(student, status, dateStr);

    showToast(
      `Absen Sholat Dzuhur ${student.name} (${status.toUpperCase()}) berhasil dicatat! Otomatis mengirim email laporan kepada orang tua.`,
      status === 'Hadir' ? 'success' : status === 'Izin' ? 'info' : 'warning'
    );

    return { student, emailStatusStr };
  };

  // Handle scanned results
  const handleBarcodeScanned = (decodedText: string) => {
    const cleanNisn = decodedText.trim();
    if (!cleanNisn) return;

    playBeep();

    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    const result = handleMarkSholat(cleanNisn, scanStatusRef.current, todayStr);

    if (result) {
      const { student, emailStatusStr } = result;
      setRecentScans(prev => [
        {
          studentName: student.name,
          nisn: student.nisn,
          class: student.class,
          status: scanStatusRef.current,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          emailStatus: emailStatusStr
        },
        ...prev.slice(0, 9) // Limit to 10 recent scans
      ]);
    }
  };

  const handleBarcodeScannedRef = useRef(decodedText => {});
  useEffect(() => {
    handleBarcodeScannedRef.current = handleBarcodeScanned;
  });

  // Scanner mounting
  useEffect(() => {
    let html5QrCode: any = null;
    let isMounted = true;

    if (activeTab === 'scan' && role !== 'SISWA') {
      const timer = setTimeout(() => {
        if (!isMounted) return;
        try {
          const readerEl = document.getElementById("sholat-camera-reader");
          if (!readerEl) return;

          html5QrCode = new Html5Qrcode("sholat-camera-reader");
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
            console.log("Kamera tidak diijinkan atau tidak ditemukan:", err);
            if (isMounted) setHasCamera(false);
          });
        } catch (e) {
          console.error("Scanner instantiation failed:", e);
          if (isMounted) setHasCamera(false);
        }
      }, 200);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (html5QrCode) {
          try {
            if (html5QrCode.isScanning) {
              html5QrCode.stop().then(() => {
                try {
                  html5QrCode.clear();
                } catch (e) {}
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

  // Handle scanned input form submit
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNisn = scanInput.trim();
    if (!cleanNisn) return;

    playBeep();

    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    const result = handleMarkSholat(cleanNisn, scanStatus, todayStr);

    if (result) {
      const { student, emailStatusStr } = result;
      setRecentScans(prev => [
        {
          studentName: student.name,
          nisn: student.nisn,
          class: student.class,
          status: scanStatus,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          emailStatus: emailStatusStr
        },
        ...prev.slice(0, 9)
      ]);
    }
    setScanInput('');
  };

  // EXCEL REKAP DOWNLOAD - Exact same as standard attendance
  const handleExportExcel = () => {
    const yearNum = Number(rekapYear);
    const monthNum = Number(rekapMonth);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const targetPrefix = `${rekapYear}-${String(rekapMonth).padStart(2, '0')}`;
    const targetStudents = rekapClass 
      ? students.filter(s => s.class === rekapClass)
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
    } catch (e) {}

    // Headers Row 1
    const row1 = ['No', 'NISN', 'Nama Siswa', 'JK (L/P)', `${monthName.toUpperCase()} ${rekapYear}`];
    for (let d = 1; d < daysInMonth; d++) {
      row1.push(''); // monthly merge spacing
    }
    row1.push('Jumlah', '', '');

    // Headers Row 2
    const row2 = ['', '', '', ''];
    for (let d = 1; d <= daysInMonth; d++) {
      row2.push(String(d));
    }
    row2.push('H', 'I', 'B');

    // Student Rows
    const dataRows = targetStudents.map((student, idx) => {
      const studentAtts = sholatAttendance.filter(
        att => att.nisn === student.nisn && att.date.startsWith(targetPrefix) && att.academicYear === academicYear && att.semester === semester
      );

      let hCount = 0;
      let iCount = 0;
      let bCount = 0;

      const dailyStatuses = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${targetPrefix}-${String(d).padStart(2, '0')}`;
        const att = studentAtts.find(a => a.date === dateStr);
        let statusChar = '';
        if (att) {
          if (att.status === 'Hadir') { statusChar = '✔'; hCount++; }
          else if (att.status === 'Izin') { statusChar = '⚠'; iCount++; }
          else if (att.status === 'Bolos') { statusChar = '✘'; bCount++; }
        }
        dailyStatuses.push(statusChar);
      }

      return [
        idx + 1,
        student.nisn,
        student.name,
        student.gender === 'Laki-laki' ? 'L' : 'P',
        ...dailyStatuses,
        hCount,
        iCount,
        bCount
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
      [`REKAP BULANAN ABSEN SHOLAT DZUHUR BERJAMA'AH`],
      [`Bulan: ${monthName} ${rekapYear}`],
      [`Kelas: ${rekapClass || 'SEMUA KELAS'}`],
      [`Tahun Pelajaran: ${academicYear}`],
      [`Semester: ${semester}`],
      [],
    ];

    const aoa = [...headerRows, row1, row2, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Set Column Widths
    const cols = [
      { wch: 5 },  // No
      { wch: 15 }, // NISN
      { wch: 28 }, // Nama Siswa
      { wch: 6 },  // JK
    ];
    for (let d = 1; d <= daysInMonth; d++) {
      cols.push({ wch: 4 }); // Day columns
    }
    cols.push({ wch: 4 }, { wch: 4 }, { wch: 4 }); // H, I, B totals
    ws['!cols'] = cols;

    // Set merges shifted by 11 header rows
    ws['!merges'] = [
      { s: { r: 11, c: 0 }, e: { r: 12, c: 0 } }, // No
      { s: { r: 11, c: 1 }, e: { r: 12, c: 1 } }, // NISN
      { s: { r: 11, c: 2 }, e: { r: 12, c: 2 } }, // Nama Siswa
      { s: { r: 11, c: 3 }, e: { r: 12, c: 3 } }, // JK
      { s: { r: 11, c: 4 }, e: { r: 11, c: 4 + daysInMonth - 1 } }, // Date headers
      { s: { r: 11, c: 4 + daysInMonth }, e: { r: 11, c: 4 + daysInMonth + 2 } } // Totals
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Absen Sholat Dzuhur');
    XLSX.writeFile(wb, `Rekap_Sholat_Dzuhur_${rekapClass || 'Semua'}_${monthName}_${rekapYear}.xlsx`);
    showToast('Rekap data sholat dalam bentuk Excel berhasil diunduh.', 'success');
  };

  // Direct PDF Download (high fidelity landscape PDF file download via jsPDF & autoTable)
  const handleDownloadSholatPDF = () => {
    const yearNum = Number(rekapYear);
    const monthNum = Number(rekapMonth);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const targetPrefix = `${rekapYear}-${String(rekapMonth).padStart(2, '0')}`;
    const targetStudents = rekapClass 
      ? students.filter(s => s.class === rekapClass)
      : students;

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNames[monthNum - 1];

    let schoolAddress = '';
    let logoUrl = '';
    let govLogoUrl = '';
    let headmasterName = 'Makhfud, S.Pd.';
    let headmasterNip = '197812052005011002';
    try {
      const sysRaw = localStorage.getItem('siap_system');
      if (sysRaw) {
        const sys = JSON.parse(sysRaw);
        if (sys.schoolAddress) schoolAddress = sys.schoolAddress;
        if (sys.logoUrl) logoUrl = sys.logoUrl;
        if (sys.govLogoUrl) govLogoUrl = sys.govLogoUrl;
        if (sys.headmasterName) headmasterName = sys.headmasterName;
        if (sys.headmasterNip) headmasterNip = sys.headmasterNip;
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
    if (rekapClass && classStaffs && teachers) {
      const staff = classStaffs.find(cs => cs.classId === rekapClass);
      if (staff) {
        const teacher = teachers.find(t => t.nuptk === staff.waliKelasNuptk);
        if (teacher) {
          waliKelasName = teacher.name;
        }
      }
    }

    const doc = new jsPDF('l', 'mm', 'a4');

    // Ministry logo left
    if (govLogoUrl) {
      try {
        doc.addImage(govLogoUrl, 'PNG', 15, 10, 18, 18);
      } catch (e) {
        console.error("Error adding gov logo to PDF:", e);
      }
    }
    // School logo right
    if (logoUrl) {
      try {
        doc.addImage(logoUrl, 'PNG', 264, 10, 18, 18);
      } catch (e) {
        console.error("Error adding school logo to PDF:", e);
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', 148, 14, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(schoolName || 'MADRASAH TSANAWIYAH', 148, 20, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (schoolAddress) {
      const wrappedAddress = doc.splitTextToSize(schoolAddress, 220);
      doc.text(wrappedAddress, 148, 24, { align: 'center' });
    }

    // Double lines
    doc.setLineWidth(0.8);
    doc.line(15, 29, 282, 29);
    doc.setLineWidth(0.2);
    doc.line(15, 30, 282, 30);

    // Title Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`REKAPITULASI ABSENSI SHOLAT DZUHUR BERJAMA'AH SISWA`, 148, 36, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Bulan: ${monthName} ${rekapYear}`, 15, 41);
    doc.text(`Kelas: ${rekapClass || 'Semua Kelas'}`, 15, 45);
    doc.text(`Tahun Pelajaran: ${academicYear}`, 148, 41);
    doc.text(`Semester: ${semester}`, 148, 45);

    // Rows data
    const bodyRows = targetStudents.map((student, idx) => {
      const studentAtts = sholatAttendance.filter(
        att => att.nisn === student.nisn && att.date.startsWith(targetPrefix) && att.academicYear === academicYear && att.semester === semester
      );

      let hCount = 0;
      let iCount = 0;
      let bCount = 0;

      const dailyStatuses = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${targetPrefix}-${String(d).padStart(2, '0')}`;
        const att = studentAtts.find(a => a.date === dateStr);
        let char = '';
        if (att) {
          if (att.status === 'Hadir') { char = 'H'; hCount++; }
          else if (att.status === 'Izin') { char = 'I'; iCount++; }
          else if (att.status === 'Bolos') { char = 'B'; bCount++; }
        }
        dailyStatuses.push(char);
      }

      return [
        String(idx + 1),
        student.nisn,
        student.name,
        student.gender === 'Laki-laki' ? 'L' : 'P',
        ...dailyStatuses,
        String(hCount),
        String(iCount),
        String(bCount)
      ];
    });

    autoTable(doc, {
      startY: 50,
      head: [['No', 'NISN', 'Nama Siswa', 'JK', ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)), 'H', 'I', 'B']],
      body: bodyRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], fontSize: 6.5, fontStyle: 'bold', halign: 'center', valign: 'middle' },
      bodyStyles: { fontSize: 6.5, cellPadding: 1, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 15, right: 15 },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' }, // No
        1: { cellWidth: 16, halign: 'center' }, // NISN
        2: { cellWidth: 36 }, // Nama
        3: { cellWidth: 6, halign: 'center' }, // JK
      },
      didParseCell: function (data) {
        const colIndex = data.column.index;
        const isHeader = data.row.section === 'head' || data.section === 'head';

        if (colIndex >= 4 && colIndex < 4 + daysInMonth) {
          const dNum = colIndex - 3;
          const dateStr = `${targetPrefix}-${String(dNum).padStart(2, '0')}`;
          const dateObj = new Date(yearNum, monthNum - 1, dNum);
          const isSunday = dateObj.getDay() === 0;
          const holiday = holidays.find(h => h.date === dateStr);
          const isHoliday = isSunday || !!holiday;

          if (isHoliday) {
            if (isHeader) {
              data.cell.styles.fillColor = [220, 38, 38]; // Bright red header
              data.cell.styles.textColor = [255, 255, 255];
            } else {
              data.cell.styles.fillColor = [254, 226, 226]; // fee2e2 light red background
            }
          }

          if (!isHeader) {
            if (data.cell.text[0] === 'H') {
              data.cell.styles.textColor = [16, 185, 129]; // emerald
              data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.text[0] === 'I') {
              data.cell.styles.textColor = [217, 119, 6]; // amber
              data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.text[0] === 'B') {
              data.cell.styles.textColor = [239, 68, 68]; // red
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
        if (!isHeader && colIndex >= 4 + daysInMonth) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.halign = 'center';
          data.cell.styles.fillColor = [241, 245, 249]; // f1f5f9
          if (colIndex === 4 + daysInMonth) {
            data.cell.styles.textColor = [16, 185, 129]; // emerald
          } else if (colIndex === 4 + daysInMonth + 1) {
            data.cell.styles.textColor = [217, 119, 6]; // amber
          } else if (colIndex === 4 + daysInMonth + 2) {
            data.cell.styles.textColor = [239, 68, 68]; // red
          }
        }
      }
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
    
    // Left Signature (Kepala Madrasah)
    doc.text('Mengetahui,', 25, sigY);
    doc.text('Kepala Madrasah,', 25, sigY + 5);
    doc.text(headmasterName, 25, sigY + 25);
    doc.text(`NIP. ${headmasterNip}`, 25, sigY + 29);

    // Right Signature (Wali Kelas)
    doc.text(`${cityName}, ${formattedDate}`, 215, sigY);
    doc.text('Wali Kelas,', 215, sigY + 5);
    doc.text(waliKelasName || '........................', 215, sigY + 25);
    doc.text('NIP. ................................', 215, sigY + 29);

    doc.save(`Rekap_Sholat_Dzuhur_${rekapClass || 'Semua'}_${monthName}_${rekapYear}.pdf`);
    showToast('Rekap data sholat dalam bentuk PDF berhasil diunduh langsung.', 'success');
  };

  // HIGH FIDELITY PRINTABLE LANDSCAPE PDF - Exact same size, double logo, signature as standard attendance
  const handleExportPDF = () => {
    const yearNum = Number(rekapYear);
    const monthNum = Number(rekapMonth);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const targetPrefix = `${rekapYear}-${String(rekapMonth).padStart(2, '0')}`;
    const targetStudents = rekapClass 
      ? students.filter(s => s.class === rekapClass)
      : students;

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNames[monthNum - 1];

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
    } catch (e) {}

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
    if (rekapClass && classStaffs && teachers) {
      const staff = classStaffs.find(cs => cs.classId === rekapClass);
      if (staff) {
        const teacher = teachers.find(t => t.nuptk === staff.waliKelasNuptk);
        if (teacher) waliKelasName = teacher.name;
      }
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Mohon aktifkan popup browser Anda untuk mencetak rekapitulasi.', 'warning');
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

      // Sundays and holidays are shaded red slightly
      const bgStyle = isHoliday ? 'background-color: #fee2e2; color: #dc2626; font-weight: bold;' : '';
      dateSubHeadersHtml.push(
        `<th style="padding: 4px; border: 1px solid #94a3b8; text-align: center; font-size: 8px; width: 18px; ${bgStyle}">${d}</th>`
      );
    }

    const studentRowsHtml = targetStudents.map((student, sIdx) => {
      const studentAtts = sholatAttendance.filter(
        att => att.nisn === student.nisn && att.date.startsWith(targetPrefix) && att.academicYear === academicYear && att.semester === semester
      );

      let hCount = 0;
      let iCount = 0;
      let bCount = 0;

      const cellsHtml = dateKeys.map((dateStr, dIdx) => {
        const dateObj = new Date(yearNum, monthNum - 1, dIdx + 1);
        const isSunday = dateObj.getDay() === 0;
        const holiday = holidays.find(h => h.date === dateStr);
        const isHoliday = isSunday || !!holiday;

        const att = studentAtts.find(a => a.date === dateStr);
        let statusChar = '';
        let colorClass = '';

        if (att) {
          if (att.status === 'Hadir') { 
            statusChar = '✔'; 
            colorClass = 'color: #10b981; font-weight: bold; font-size: 10px;'; 
            hCount++; 
          }
          else if (att.status === 'Izin') { 
            statusChar = '⚠'; 
            colorClass = 'color: #d97706; font-weight: bold; font-size: 10px;'; 
            iCount++; 
          }
          else if (att.status === 'Bolos') { 
            statusChar = '✘'; 
            colorClass = 'color: #ef4444; font-weight: bold; font-size: 10px;'; 
            bCount++; 
          }
        }

        const bgStyle = isHoliday ? 'background-color: #fca5a5;' : '';
        return `<td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center; ${bgStyle} ${colorClass}">${statusChar}</td>`;
      }).join('');

      return `
        <tr>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 9px;">${sIdx + 1}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 9px;">${student.nisn}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 9px; text-align: left;">${student.name}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 9px;">${student.gender === 'Laki-laki' ? 'L' : 'P'}</td>
          ${cellsHtml}
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; font-size: 9px; color: #10b981; background-color: #f8fafc;">${hCount}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; font-size: 9px; color: #d97706; background-color: #f8fafc;">${iCount}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; font-size: 9px; color: #ef4444; background-color: #f8fafc;">${bCount}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Rekap Sholat Dzuhur - ${monthName} ${rekapYear}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            @page {
              size: A4 landscape;
              margin: 8mm 8mm 12mm 8mm;
            }
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
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
              justify-content: space-between;
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
            <div class="document-footer-left">Aplikasi SIAP • Rekap Absen Sholat Dzuhur Berjama'ah</div>
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
              <h1 class="kop-school" style="font-size: 18px; font-weight: bold; text-transform: uppercase; color: #0f172a; margin: 0 0 4px 0; letter-spacing: 0.5px; line-height: 1.1;">${schoolName}</h1>
              <p class="kop-sub" style="font-size: 9px; color: #475569; margin: 0; line-height: 1.4; font-weight: 500;">${schoolAddress || 'Alamat lengkap instansi sekolah belum disetting.'}</p>
            </div>
            ${logoUrl ? `
              <img src="${logoUrl}" class="kop-logo kop-logo-right" />
            ` : `
              <div class="kop-logo kop-logo-right" style="width: 55px; height: 55px; border-radius: 50%; background: #f1f5f9; border: 1px solid #0f172a; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #475569; text-align: center; line-height: 1.2;">KOP<br/>SEKOLAH</div>
            `}
          </div>

          <div class="title-section" style="line-height: 1.5; font-size: 10px;">
            <h2 class="title-main" style="margin-bottom: 6px;">REKAPITULASI ABSENSI SHOLAT DZUHUR BERJAMA'AH SISWA</h2>
            <div>Bulan: <strong>${monthName.toUpperCase()} ${rekapYear}</strong></div>
            <div>Kelas: <strong>${rekapClass || 'SEMUA KELAS'}</strong></div>
            <div>Tahun Pelajaran: <strong>${academicYear}</strong></div>
            <div>Semester: <strong>${semester}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th rowspan="2" style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-size: 9px; width: 30px;">No</th>
                <th rowspan="2" style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-size: 9px; width: 75px;">NISN</th>
                <th rowspan="2" style="padding: 6px; border: 1px solid #94a3b8; text-align: left; font-size: 9px; width: 180px;">Nama Siswa</th>
                <th rowspan="2" style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-size: 9px; width: 40px;">JK</th>
                <th colspan="${daysInMonth}" style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-size: 9px;">Tanggal</th>
                <th colspan="3" style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-size: 9px; width: 60px;">Jumlah</th>
              </tr>
              <tr>
                ${dateSubHeadersHtml.join('')}
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: center; font-size: 8px; width: 20px; background-color: #f8fafc; color: #10b981;">H</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: center; font-size: 8px; width: 20px; background-color: #f8fafc; color: #d97706;">I</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: center; font-size: 8px; width: 20px; background-color: #f8fafc; color: #ef4444;">B</th>
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

  // Helper arrays for Months and Years
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const rekapYears = [
    String(new Date().getFullYear() - 1),
    String(new Date().getFullYear()),
    String(new Date().getFullYear() + 1),
  ];

  // Students filtering for Manual List
  const filteredStudentsManual = students.filter(student => {
    const matchesClass = selectedClass ? student.class === selectedClass : true;
    const matchesSearch = student.name.toLowerCase().includes(searchManual.toLowerCase()) || student.nisn.includes(searchManual);
    return matchesClass && matchesSearch;
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Determine current student attendance history (if role is SISWA)
  const personalSholatAttendance = sholatAttendance.filter(
    a => a.nisn === studentNisn && a.academicYear === academicYear && a.semester === semester
  ).sort((a, b) => b.date.localeCompare(a.date));

  const totalHadirSiswa = personalSholatAttendance.filter(a => a.status === 'Hadir').length;
  const totalIzinSiswa = personalSholatAttendance.filter(a => a.status === 'Izin').length;
  const totalBolosSiswa = personalSholatAttendance.filter(a => a.status === 'Bolos').length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 selection:bg-emerald-500 selection:text-white font-sans">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest">
            Fasilitas Ibadah SIAP
          </span>
          <h2 className="text-xl font-extrabold text-white tracking-tight mt-2">Absensi Sholat Dzuhur Berjama'ah</h2>
          <p className="text-slate-400 text-xs mt-1">
            Pencatatan kehadiran, izin halangan syar’i, dan ketidakhadiran sholat dzuhur berjama'ah siswa madrasah secara real-time.
          </p>
        </div>

        {/* Tab Switcher */}
        {role !== 'SISWA' && activeMenu !== 'sholat-rekap' && (
          <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-850 self-start">
            <button
              onClick={() => setActiveTab('scan')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === 'scan' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Scan Barcode / QR
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === 'manual' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Absensi Manual
            </button>
            {(!activeMenu || activeMenu === 'all') && (
              <button
                onClick={() => setActiveTab('rekap')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'rekap' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Rekap Data
              </button>
            )}
          </div>
        )}
      </div>

      {/* VIEW 1: SCAN BARCODE (Admin / Guru Only) */}
      {role !== 'SISWA' && activeTab === 'scan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Scanner Container */}
          <div className="lg:col-span-2 p-6 bg-slate-950/40 border border-slate-800 rounded-2xl flex flex-col justify-between">
            <div className="text-center">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest animate-pulse">
                  Kamera Scanner Siap
                </span>
                <button
                  type="button"
                  onClick={() => setCameraMode(prev => prev === 'environment' ? 'user' : 'environment')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold uppercase border border-slate-750 transition cursor-pointer active:scale-95"
                >
                  <SwitchCamera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Kamera: {cameraMode === 'environment' ? 'Utama' : 'Selfie'}</span>
                </button>
              </div>

              {/* Animated QR Scanning Stage */}
              <div className="relative my-6 mx-auto w-full max-w-[320px] aspect-square rounded-2xl border border-slate-700/60 overflow-hidden bg-slate-900 shadow-2xl flex flex-col items-center justify-center">
                <div 
                  id="sholat-camera-reader" 
                  className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
                />

                {/* Laser scan line animation */}
                <div className="absolute top-0 inset-x-0 h-0.5 bg-emerald-500 shadow-[0_0_10px_#10b981] animate-scanLaser pointer-events-none z-20" />

                <div className="absolute inset-8 border border-slate-600/40 border-dashed rounded-lg flex items-center justify-center z-10 pointer-events-none">
                  <Scan className="w-12 h-12 text-emerald-500/20 animate-pulse" />
                </div>

                {!hasCamera && (
                  <div className="relative text-center z-10 p-4">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Mengaktifkan Scanner Kamera...</p>
                    <p className="text-[11px] text-slate-400 max-w-[180px] mx-auto leading-relaxed">
                      Dekatkan QR Code/Barcode Kartu Siswa ke kamera, atau gunakan input NISN manual di bawah.
                    </p>
                  </div>
                )}
              </div>

              {/* Attendance Status Selector for Scans */}
              <div className="mb-6 max-w-sm mx-auto bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 text-center">
                  Status Presensi Sholat saat Scan
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Hadir', 'Izin', 'Bolos'] as const).map((status) => {
                    const colors = {
                      Hadir: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.1)] font-bold',
                      Izin: 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.1)] font-bold',
                      Bolos: 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.1)] font-bold'
                    };
                    const hoverColors = {
                      Hadir: 'hover:text-emerald-400 border-slate-800 hover:border-emerald-500/30 text-slate-400',
                      Izin: 'hover:text-amber-400 border-slate-800 hover:border-amber-500/30 text-slate-400',
                      Bolos: 'hover:text-rose-400 border-slate-800 hover:border-rose-500/30 text-slate-400'
                    };

                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setScanStatus(status)}
                        className={`py-1.5 px-2 rounded-lg text-[10px] uppercase border transition-all text-center cursor-pointer ${
                          scanStatus === status ? colors[status] : hoverColors[status]
                        }`}
                      >
                        {status === 'Hadir' ? 'Hadir (✔)' : status === 'Izin' ? 'Izin (⚠)' : 'Bolos (✘)'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Manual Text Input Field Fallback */}
            <form onSubmit={handleScanSubmit} className="mt-2 border-t border-slate-800/60 pt-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Input NISN siswa secara manual di sini..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2 text-xs font-mono text-emerald-400 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs uppercase px-4 py-2 rounded-xl transition duration-200 cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Catat</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 text-left leading-normal italic">
                * Berguna jika kamera mati/bermasalah. Tekan enter/catat setelah mengetik NISN untuk merekam kehadiran sholat & otomatis mengirim email ke wali murid.
              </p>
            </form>
          </div>

          {/* Recent Scans Box */}
          <div className="p-6 bg-slate-950/40 border border-slate-800 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800/80 pb-2">
                Pencatatan Scan Terakhir
              </h3>

              {recentScans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-2">
                    <Scan className="w-4.5 h-4.5 text-slate-600" />
                  </div>
                  <p className="text-[11px] text-slate-500 italic">Belum ada aktivitas scan pada sesi ini.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[310px] overflow-y-auto pr-1">
                  {recentScans.map((log, index) => (
                    <div key={index} className="p-2.5 bg-slate-900/60 border border-slate-850 rounded-xl flex flex-col gap-1.5 hover:border-slate-800 transition">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{log.studentName}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{log.nisn} • {log.class}</p>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0 flex items-center gap-1 ${
                          log.status === 'Hadir' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : log.status === 'Izin'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {log.status === 'Hadir' ? '✔' : log.status === 'Izin' ? '⚠' : '✘'} {log.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-slate-850/60 pt-1.5 text-[9px] text-slate-500">
                        <span className="font-mono">{log.time} WITA</span>
                        <span className="text-[8px] uppercase tracking-wide text-emerald-400 font-bold bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10 flex items-center gap-1">
                          <Mail className="w-2.5 h-2.5" />
                          <span>EMAIL LAPORAN WALIMURID DIKIRIM</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-800/80 pt-4 mt-4">
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-[10px] text-slate-400 leading-normal">
                💡 <strong>Informasi Ibadah:</strong> Menjaga sholat dzuhur berjama'ah membentuk kedisiplinan dan akhlak islami siswa madrasah. Laporan dikirim otomatis sebagai sarana sinergi madrasah dengan wali murid.
              </div>
            </div>
          </div>

        </div>
      )}

      {/* VIEW 2: MANUAL ATTENDANCE ENTRY (Admin / Guru Only) */}
      {role !== 'SISWA' && activeTab === 'manual' && (
        <div>
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tanggal Presensi</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs font-mono text-teal-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {showClassFilter && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pilih Rombel / Kelas</label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="">-- Semua Kelas --</option>
                    {availableClasses.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cari Nama / NISN</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari nama atau NISN..."
                  value={searchManual}
                  onChange={(e) => setSearchManual(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Student Manual Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800">
                    <th className="p-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12">No</th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-36">NISN</th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Lengkap Siswa</th>
                    <th className="p-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24">Kelas</th>
                    <th className="p-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24">JK</th>
                    <th className="p-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider w-80">Catat Presensi Sholat Dzuhur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredStudentsManual.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-xs text-slate-500 italic">
                        Tidak ada data siswa yang cocok dengan filter. Silakan pilih kelas atau cari nama lain.
                      </td>
                    </tr>
                  ) : (
                    filteredStudentsManual.map((student, idx) => {
                      const record = sholatAttendance.find(
                        a => a.nisn === student.nisn && a.date === selectedDate && a.academicYear === academicYear && a.semester === semester
                      );

                      return (
                        <tr key={student.nisn} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-3 text-center text-xs text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3 text-xs text-slate-300 font-mono">{student.nisn}</td>
                          <td className="p-3 text-xs font-semibold text-white">{student.name}</td>
                          <td className="p-3 text-center text-xs text-slate-400"><span className="px-2 py-0.5 bg-slate-850 border border-slate-800 rounded-md">{student.class}</span></td>
                          <td className="p-3 text-center text-xs text-slate-400">{student.gender === 'Laki-laki' ? 'L' : 'P'}</td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center gap-1.5">
                              {/* Hadir (✔) */}
                              <button
                                onClick={() => handleMarkSholat(student.nisn, 'Hadir', selectedDate)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase transition-all duration-150 cursor-pointer flex items-center gap-1 ${
                                  record?.status === 'Hadir'
                                    ? 'bg-emerald-500 text-slate-950 font-bold scale-105 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                                    : 'bg-slate-900 border border-slate-800 text-emerald-400 hover:bg-emerald-500/10'
                                }`}
                                title="Catat Hadir sholat dzuhur berjama'ah"
                              >
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>Hadir (✔)</span>
                              </button>

                              {/* Izin (⚠) */}
                              <button
                                onClick={() => handleMarkSholat(student.nisn, 'Izin', selectedDate)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase transition-all duration-150 cursor-pointer flex items-center gap-1 ${
                                  record?.status === 'Izin'
                                    ? 'bg-amber-500 text-slate-950 font-bold scale-105 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                                    : 'bg-slate-900 border border-slate-800 text-amber-500 hover:bg-amber-500/10'
                                }`}
                                title="Catat Izin (Halangan Syar'i / Uzur)"
                              >
                                <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                                <span>Izin (⚠)</span>
                              </button>

                              {/* Bolos (✘) */}
                              <button
                                onClick={() => handleMarkSholat(student.nisn, 'Bolos', selectedDate)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase transition-all duration-150 cursor-pointer flex items-center gap-1 ${
                                  record?.status === 'Bolos'
                                    ? 'bg-rose-500 text-slate-950 font-bold scale-105 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                                    : 'bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-500/10'
                                }`}
                                title="Catat Bolos (Tidak Hadir tanpa uzur)"
                              >
                                <X className="w-3 h-3 stroke-[3]" />
                                <span>Bolos (✘)</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: REKAP BULANAN TABLE & EXPORTS (Admin, Guru & Siswa View) */}
      {activeTab === 'rekap' && (
        <div>
          {/* Rekap Filters Bar - Siswa cannot change rombel filter, they see their own class, Admin/Guru can filter anything */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5 p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
            {role !== 'SISWA' ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-semibold">Rombel / Kelas</label>
                <select
                  value={rekapClass}
                  onChange={(e) => setRekapClass(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">-- Semua Kelas --</option>
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Siswa Terpilih</label>
                <div className="w-full bg-slate-900 border border-slate-850 px-3.5 py-2 text-xs font-bold text-white rounded-xl">
                  {students.find(s => s.nisn === studentNisn)?.name || 'Ananda Siswa'}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-semibold">Bulan</label>
              <select
                value={rekapMonth}
                onChange={(e) => setRekapMonth(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {monthNames.map((name, idx) => (
                  <option key={idx} value={String(idx + 1)}>{name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-semibold">Tahun</label>
              <select
                value={rekapYear}
                onChange={(e) => setRekapYear(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {rekapYears.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-1.5">
              <button
                onClick={handleExportExcel}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[11px] font-bold uppercase py-2 px-3 rounded-xl transition duration-200 cursor-pointer flex items-center justify-center gap-1 hover:shadow-md active:scale-95"
                title="Unduh format Excel sama persis format absensi umum"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
              <button
                onClick={handleDownloadSholatPDF}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold uppercase py-2 px-3 rounded-xl transition duration-200 cursor-pointer flex items-center justify-center gap-1 hover:shadow-md active:scale-95 border border-red-500/20"
                title="Unduh format PDF landscape langsung"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="flex-1 bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold uppercase py-2 px-3 rounded-xl transition duration-200 cursor-pointer flex items-center justify-center gap-1 hover:shadow-md active:scale-95 border border-sky-500/20"
                title="Cetak/Unduh format PDF landscape double-logo madrasah"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak</span>
              </button>
            </div>
          </div>

          {/* SISWA ROLE PERSONAL BRIEF STATS */}
          {role === 'SISWA' && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 text-center">
                <span className="text-[10px] font-extrabold uppercase text-emerald-400 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Hadir Sholat
                </span>
                <p className="text-xl font-extrabold text-white mt-1">{totalHadirSiswa}</p>
                <span className="text-[8px] text-slate-500">Kali Berjama'ah</span>
              </div>
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 text-center">
                <span className="text-[10px] font-extrabold uppercase text-amber-400 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Izin Syar'i
                </span>
                <p className="text-xl font-extrabold text-white mt-1">{totalIzinSiswa}</p>
                <span className="text-[8px] text-slate-500">Halangan Sah</span>
              </div>
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 text-center">
                <span className="text-[10px] font-extrabold uppercase text-rose-400 flex items-center justify-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Bolos Sholat
                </span>
                <p className="text-xl font-extrabold text-white mt-1">{totalBolosSiswa}</p>
                <span className="text-[8px] text-slate-500">Tanpa Uzur</span>
              </div>
            </div>
          )}

          {/* Legend Banner */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-center gap-6 mb-4 text-[10px] font-bold text-slate-400">
            <span className="uppercase text-slate-500">Simbol Tabel:</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="font-extrabold text-xs">✔</span> Hadir Sholat (Hijau)
            </span>
            <span className="flex items-center gap-1 text-amber-500">
              <span className="font-extrabold text-xs">⚠</span> Izin Syar'i / Uzur (Kuning)
            </span>
            <span className="flex items-center gap-1 text-rose-500">
              <span className="font-extrabold text-xs">✘</span> Bolos / Tanpa Uzur (Merah)
            </span>
          </div>

          {/* High Fidelity Interactive Rekap Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  {/* Row 1 Headers */}
                  <tr className="bg-slate-900 border-b border-slate-800 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <th rowSpan={2} className="p-2 border-r border-slate-800 w-10 text-center">No</th>
                    <th rowSpan={2} className="p-2 border-r border-slate-800 w-28 text-center">NISN</th>
                    <th rowSpan={2} className="p-2 border-r border-slate-800 w-44 text-left">Nama Siswa</th>
                    <th rowSpan={2} className="p-2 border-r border-slate-800 w-12 text-center">JK</th>
                    <th colSpan={new Date(Number(rekapYear), Number(rekapMonth), 0).getDate()} className="p-2 border-b border-r border-slate-800 text-center">Tanggal ({monthNames[Number(rekapMonth)-1].toUpperCase()} {rekapYear})</th>
                    <th colSpan={3} className="p-2 border-b border-slate-800 text-center">Jumlah</th>
                  </tr>
                  {/* Row 2 Headers (Dates 1 to 31) */}
                  <tr className="bg-slate-900 text-[8px] border-b border-slate-800 font-bold text-slate-500">
                    {Array.from({ length: new Date(Number(rekapYear), Number(rekapMonth), 0).getDate() }).map((_, dIdx) => (
                      <th key={dIdx} className="p-1 border-r border-slate-800/60 w-5 text-center">{dIdx + 1}</th>
                    ))}
                    <th className="p-1 border-r border-slate-800/60 w-6 text-center text-emerald-400 bg-emerald-500/5">H</th>
                    <th className="p-1 border-r border-slate-800/60 w-6 text-center text-amber-500 bg-amber-500/5">I</th>
                    <th className="p-1 w-6 text-center text-rose-500 bg-rose-500/5">B</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-[10px]">
                  {/* Let's render filtered students */}
                  {(() => {
                    const shownStudents = role === 'SISWA'
                      ? students.filter(s => s.nisn === studentNisn)
                      : (rekapClass ? students.filter(s => s.class === rekapClass) : students);

                    if (shownStudents.length === 0) {
                      return (
                        <tr>
                          <td colSpan={35} className="p-10 text-xs italic text-slate-500">
                            Tidak ada data siswa yang terekam.
                          </td>
                        </tr>
                      );
                    }

                    return shownStudents.map((student, sIdx) => {
                      const studentAtts = sholatAttendance.filter(
                        att => att.nisn === student.nisn && att.date.startsWith(`${rekapYear}-${String(rekapMonth).padStart(2, '0')}`) && att.academicYear === academicYear && att.semester === semester
                      );

                      let hCount = 0;
                      let iCount = 0;
                      let bCount = 0;

                      return (
                        <tr key={student.nisn} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-1.5 border-r border-slate-850/60 text-slate-400 text-center font-mono">{sIdx + 1}</td>
                          <td className="p-1.5 border-r border-slate-850/60 text-slate-300 text-center font-mono">{student.nisn}</td>
                          <td className="p-1.5 border-r border-slate-850/60 font-bold text-slate-100 text-left truncate max-w-[150px]" title={student.name}>{student.name}</td>
                          <td className="p-1.5 border-r border-slate-850/60 text-slate-400 text-center">{student.gender === 'Laki-laki' ? 'L' : 'P'}</td>
                          
                          {/* Calendar Cells 1 - 28/31 */}
                          {Array.from({ length: new Date(Number(rekapYear), Number(rekapMonth), 0).getDate() }).map((_, dIdx) => {
                            const dateStr = `${rekapYear}-${String(rekapMonth).padStart(2, '0')}-${String(dIdx + 1).padStart(2, '0')}`;
                            const att = studentAtts.find(a => a.date === dateStr);

                            let symbol = '';
                            let textClass = '';

                            if (att) {
                              if (att.status === 'Hadir') {
                                symbol = '✔';
                                textClass = 'text-emerald-400 font-extrabold';
                                hCount++;
                              } else if (att.status === 'Izin') {
                                symbol = '⚠';
                                textClass = 'text-amber-500 font-extrabold';
                                iCount++;
                              } else if (att.status === 'Bolos') {
                                symbol = '✘';
                                textClass = 'text-rose-500 font-extrabold';
                                bCount++;
                              }
                            }

                            return (
                              <td key={dIdx} className={`p-1 border-r border-slate-850/60 text-center text-xs font-semibold ${textClass}`}>
                                {symbol}
                              </td>
                            );
                          })}

                          {/* Totals Columns */}
                          <td className="p-1.5 border-r border-slate-850/60 text-center font-extrabold text-emerald-400 bg-emerald-500/5">{hCount}</td>
                          <td className="p-1.5 border-r border-slate-850/60 text-center font-extrabold text-amber-500 bg-amber-500/5">{iCount}</td>
                          <td className="p-1.5 text-center font-extrabold text-rose-500 bg-rose-500/5">{bCount}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      )}

    </div>
  );
}
