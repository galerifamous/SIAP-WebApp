/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { toast, showConfirm } from '../utils/dialog';
import {
  Coins,
  Wallet,
  Mail,
  Search,
  Filter,
  Check,
  Edit,
  CreditCard,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Sparkles,
  Info,
  FileSpreadsheet,
  FileText,
  FileDown,
  Printer,
  ClipboardList,
  Calendar,
  TrendingDown
} from 'lucide-react';
import { Student, Teacher, ClassStaff, User as UserType } from '../types';
import * as XLSX from 'xlsx';
import { downloadToPDF } from '../utils/export';

interface UangKasSecProps {
  students: Student[];
  onEditStudent: (nisn: string, updated: Student) => void;
  onSendCashBillEmail: (nisn: string, type: 'Uang Kas' | 'Tabungan') => void;
  schoolName: string;
  academicYear: string;
  semester: string;
  availableClasses: string[];
  role: 'ADMIN' | 'GURU' | 'SISWA';
  studentNisn?: string;
  teachers?: Teacher[];
  classStaffs?: ClassStaff[];
  activeMenu?: string;
  currentUser?: UserType;
}

export default function UangKasSec({
  students,
  onEditStudent,
  onSendCashBillEmail,
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
}: UangKasSecProps) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const handleThemeChange = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const loggedTeacher = (role === 'GURU' && teachers && currentUser)
    ? teachers.find(t => t.nuptk === currentUser?.id || t.username === currentUser?.username)
    : undefined;
  const showClassFilter = role === 'ADMIN' || (role === 'GURU' && loggedTeacher?.dutyType === 'GURU_MAPEL');
  const teacherClass = (role === 'GURU' && loggedTeacher && loggedTeacher.dutyType === 'GURU_KELAS')
    ? (loggedTeacher.assignedClass || (classStaffs ? classStaffs.find(cs => cs.waliKelasNuptk === loggedTeacher.nuptk)?.classId : '') || '')
    : '';

  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState(() => {
    return (role === 'GURU' && availableClasses && availableClasses.length > 0)
      ? availableClasses[0]
      : '';
  });
  const [financeTypeFilter, setFinanceTypeFilter] = useState<'all' | 'has_bill' | 'has_savings'>('all');

  // Rekapitulasi State
  const [subTab, setSubTab] = useState<'kelola' | 'rekap' | 'pengeluaran'>('kelola');
  const [rekapType, setRekapType] = useState<'uang-kas' | 'tabungan'>(() => {
    return activeMenu === 'tabungan' ? 'tabungan' : 'uang-kas';
  });

  useEffect(() => {
    if (activeMenu === 'tabungan') {
      setRekapType('tabungan');
    } else if (activeMenu === 'uang-kas') {
      setRekapType('uang-kas');
    }
  }, [activeMenu]);
  const [monthlyMonth, setMonthlyMonth] = useState(() => new Date().getMonth() + 1);
  const [monthlyYear, setMonthlyYear] = useState(() => String(new Date().getFullYear()));
  const [monthlyClass, setMonthlyClass] = useState(() => {
    return (role === 'GURU' && availableClasses && availableClasses.length > 0)
      ? availableClasses[0]
      : (availableClasses[0] || '');
  });

  useEffect(() => {
    if (teacherClass) {
      setClassFilter(teacherClass);
      setMonthlyClass(teacherClass);
    }
  }, [teacherClass]);

  // Pengeluaran Kas State
  interface CashExpense {
    id: string;
    date: string;
    description: string;
    amount: number;
    classId: string;
  }

  const [cashExpenses, setCashExpenses] = useState<CashExpense[]>(() => {
    const stored = localStorage.getItem('siap_cash_expenses');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'exp-1',
        date: '2026-06-10',
        description: 'Pembelian Sapu, Ember, dan Alat Pel Kelas',
        amount: 45000,
        classId: 'VII-A'
      },
      {
        id: 'exp-2',
        date: '2026-06-18',
        description: 'Membeli Spidol dan Penghapus Papan Tulis Baru',
        amount: 25000,
        classId: 'VII-A'
      },
      {
        id: 'exp-3',
        date: '2026-06-25',
        description: 'Konsumsi Kerja Bakti dan Hias Kelas VII-A',
        amount: 60000,
        classId: 'VII-A'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('siap_cash_expenses', JSON.stringify(cashExpenses));
  }, [cashExpenses]);

  // Form states for adding cash expense
  const [expenseDateInput, setExpenseDateInput] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [expenseDescInput, setExpenseDescInput] = useState('');
  const [expenseAmountInput, setExpenseAmountInput] = useState<number | ''>('');
  const [expenseClassInput, setExpenseClassInput] = useState(() => {
    return (availableClasses && availableClasses.length > 0) ? availableClasses[0] : '';
  });

  // Transaction Modals State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [modalType, setModalType] = useState<'pay_bill' | 'deposit_savings' | 'withdraw_savings' | null>(null);
  const [amountInput, setAmountInput] = useState<number | ''>('');
  const [showStatusMsg, setShowStatusMsg] = useState<string | null>(null);

  // Savings transaction history helper
  interface SavingsTransaction {
    date: string;
    description: string;
    type: 'Masuk' | 'Keluar';
    amount: number;
    balance: number;
  }

  const getSavingsTransactions = (student: Student): SavingsTransaction[] => {
    const sessionKey = `siap_savings_tx_${student.nisn}`;
    const stored = localStorage.getItem(sessionKey);
    let sessionTx: any[] = [];
    if (stored) {
      try {
        sessionTx = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }

    const baseTx: SavingsTransaction[] = [];
    const balance = student.savings;

    if (balance > 0) {
      let sessionDiff = 0;
      sessionTx.forEach(tx => {
        if (tx.type === 'Masuk') sessionDiff += tx.amount;
        if (tx.type === 'Keluar') sessionDiff -= tx.amount;
      });

      const startingBalance = balance - sessionDiff;
      if (startingBalance > 0) {
        const part1 = Math.floor(startingBalance * 0.4);
        const part2 = Math.floor(startingBalance * 0.7);
        const part3 = part1 + part2 - startingBalance;

        let running = 0;
        
        running += part1;
        baseTx.push({
          date: '2026-06-01',
          description: 'Setoran Awal Tabungan',
          type: 'Masuk',
          amount: part1,
          balance: running
        });

        running += part2;
        baseTx.push({
          date: '2026-06-12',
          description: 'Setoran Sukarela',
          type: 'Masuk',
          amount: part2,
          balance: running
        });

        if (part3 > 0) {
          running -= part3;
          baseTx.push({
            date: '2026-06-18',
            description: 'Penarikan Dana (Keperluan Sekolah)',
            type: 'Keluar',
            amount: part3,
            balance: running
          });
        }
      }
    }

    const allTx = [...baseTx];
    let currentRunning = baseTx.length > 0 ? baseTx[baseTx.length - 1].balance : 0;

    sessionTx.forEach(stx => {
      if (stx.type === 'Masuk') {
        currentRunning += stx.amount;
      } else {
        currentRunning -= stx.amount;
      }
      allTx.push({
        date: stx.date,
        description: stx.description,
        type: stx.type,
        amount: stx.amount,
        balance: currentRunning
      });
    });

    return allTx;
  };

  interface CashTransaction {
    date: string;
    description: string;
    amount: number;
  }

  const getCashTransactions = (student: Student): CashTransaction[] => {
    const sessionKey = `siap_cash_tx_${student.nisn}`;
    const stored = localStorage.getItem(sessionKey);
    let sessionTx: any[] = [];
    if (stored) {
      try {
        sessionTx = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }

    const baseTx: CashTransaction[] = [];
    const seedAmount = 50000 - student.cashBill;
    if (seedAmount > 0) {
      if (seedAmount >= 20000) {
        const p1 = Math.floor(seedAmount / 2);
        const p2 = seedAmount - p1;
        baseTx.push({
          date: '2026-06-05',
          description: 'Pembayaran Uang Kas (P1)',
          amount: p1
        });
        baseTx.push({
          date: '2026-06-15',
          description: 'Pembayaran Uang Kas (P2)',
          amount: p2
        });
      } else {
        baseTx.push({
          date: '2026-06-05',
          description: 'Pembayaran Uang Kas',
          amount: seedAmount
        });
      }
    }

    return [...baseTx, ...sessionTx];
  };

  const handleDownloadSavingsExcel = (student: Student) => {
    const transactions = getSavingsTransactions(student);
    const headers = ['No', 'Tanggal', 'Keterangan', 'Jenis Transaksi', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Saldo (Rp)'];
    const rows = transactions.map((t, idx) => {
      return [
        idx + 1,
        t.date,
        t.description,
        t.type === 'Masuk' ? 'Setoran / Pemasukan' : 'Penarikan / Pengeluaran',
        t.type === 'Masuk' ? t.amount : 0,
        t.type === 'Keluar' ? t.amount : 0,
        t.balance
      ];
    });

    const titleRow = [`LAPORAN BUKU TABUNGAN SISWA - ${student.name.toUpperCase()}`];
    const infoRows = [
      ['NISN', ':', student.nisn],
      ['Nama Siswa', ':', student.name],
      ['Kelas', ':', student.class],
      ['Saldo Akhir', ':', `Rp ${student.savings.toLocaleString('id-ID')}`],
      []
    ];

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
    const logoStatus = logoUrl ? 'TERUNGGAH & AKTIF' : 'BELUM DIUNGGAH';
    const govLogoStatus = govLogoUrl ? 'TERUNGGAH & AKTIF' : 'BELUM DIUNGGAH';

    const kopSurat = [
      ['KEMENTERIAN AGAMA REPUBLIK INDONESIA'],
      [schoolName],
      [schoolAddress || 'Alamat lengkap instansi sekolah belum disetting.'],
      [`STATUS LOGO INSTANSI/DINAS: ${govLogoStatus} | STATUS LOGO MADRASAH: ${logoStatus}`],
      [],
    ];

    const aoa = [
      ...kopSurat,
      titleRow,
      [],
      ...infoRows,
      headers,
      ...rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 5 },  // No
      { wch: 12 }, // Tanggal
      { wch: 35 }, // Keterangan
      { wch: 25 }, // Jenis
      { wch: 18 }, // Pemasukan
      { wch: 18 }, // Pengeluaran
      { wch: 18 }  // Saldo
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Buku Tabungan');
    XLSX.writeFile(wb, `Laporan_Tabungan_${student.nisn}_${student.name.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleDownloadSavingsPDF = (student: Student) => {
    const transactions = getSavingsTransactions(student);

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
    if (student.class && classStaffs && teachers) {
      const staff = classStaffs.find(cs => cs.classId === student.class);
      if (staff) {
        const teacher = teachers.find(t => t.nuptk === staff.waliKelasNuptk);
        if (teacher) {
          waliKelasName = teacher.name;
        }
      }
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.warning('Mohon izinkan popup browser Anda untuk mengunduh PDF.');
      return;
    }

    const rowsHtml = transactions.map((t, idx) => {
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-size: 10px;">${idx + 1}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-size: 10px;">${t.date}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 10px;">${t.description}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-size: 10px; color: #166534; font-weight: ${t.type === 'Masuk' ? 'bold' : 'normal'};">
            ${t.type === 'Masuk' ? 'Rp ' + t.amount.toLocaleString('id-ID') : '-'}
          </td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-size: 10px; color: #991b1b; font-weight: ${t.type === 'Keluar' ? 'bold' : 'normal'};">
            ${t.type === 'Keluar' ? 'Rp ' + t.amount.toLocaleString('id-ID') : '-'}
          </td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-size: 10px; font-weight: bold; background-color: #f8fafc;">
            Rp ${t.balance.toLocaleString('id-ID')}
          </td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Laporan Tabungan - ${student.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              font-size: 11px;
            }
            .kop-container {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 3.5px double #0f172a;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .kop-logo {
              width: 70px;
              height: 70px;
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
              font-size: 16px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0;
              color: #0f172a;
            }
            .kop-sub {
              font-size: 10px;
              color: #475569;
              margin: 4px 0 0 0;
              line-height: 1.4;
            }
            .title-section {
              text-align: center;
              margin-bottom: 20px;
            }
            .title-main {
              font-size: 13px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0;
              text-decoration: underline;
            }
            .title-sub {
              font-size: 10px;
              color: #475569;
              margin: 4px 0 0 0;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 100px 10px 1fr;
              gap: 6px;
              margin-bottom: 20px;
              font-size: 11px;
              background-color: #f8fafc;
              padding: 12px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            .info-label {
              font-weight: 600;
              color: #475569;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th {
              background-color: #f1f5f9;
              color: #1e293b;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 10px;
              padding: 10px;
              border: 1px solid #94a3b8;
            }
            .signature-container {
              margin-top: 30px;
              display: flex;
              justify-content: flex-end;
              page-break-inside: avoid;
            }
            .signature-box {
              text-align: center;
              width: 220px;
              font-size: 10px;
            }
            .signature-space {
              height: 55px;
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
              <div class="kop-logo kop-logo-left" style="width: 70px; height: 70px; border-radius: 50%; background: #f1f5f9; border: 1px solid #0f172a; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #475569; text-align: center; line-height: 1.2;">KOP<br/>DINAS</div>
            `}
            <div class="kop-text" style="text-align: center; flex-grow: 1;">
              <p class="kop-kemendikbud" style="font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #1e293b; margin: 0 0 3px 0;">KEMENTERIAN AGAMA REPUBLIK INDONESIA</p>
              <h1 class="kop-school-name" style="font-size: 18px; font-weight: bold; text-transform: uppercase; color: #0f172a; margin: 0 0 4px 0; letter-spacing: 0.5px; line-height: 1.1;">${schoolName}</h1>
              <p class="kop-alamat" style="font-size: 9px; color: #475569; margin: 0; line-height: 1.4; font-weight: 500;">${schoolAddress || 'Alamat lengkap instansi sekolah belum disetting.'}</p>
            </div>
            ${logoUrl ? `
              <img src="${logoUrl}" class="kop-logo kop-logo-right" />
            ` : `
              <div class="kop-logo kop-logo-right" style="width: 70px; height: 70px; border-radius: 50%; background: #f1f5f9; border: 1px solid #0f172a; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #475569; text-align: center; line-height: 1.2;">KOP<br/>SEKOLAH</div>
            `}
          </div>

          <div class="title-section">
            <h2 class="title-main">LAPORAN MUTASI TABUNGAN SISWA</h2>
            <p class="title-sub">Rincian Buku Tabungan Periode Aktif</p>
          </div>

          <div class="info-grid">
            <div class="info-label">NISN</div>
            <div>:</div>
            <div style="font-family: monospace; font-weight: bold;">${student.nisn}</div>

            <div class="info-label">Nama Siswa</div>
            <div>:</div>
            <div style="font-weight: bold;">${student.name}</div>

            <div class="info-label">Kelas</div>
            <div>:</div>
            <div>${student.class}</div>

            <div class="info-label">Saldo Saat Ini</div>
            <div>:</div>
            <div style="font-weight: 800; color: #166534; font-size: 12px;">Rp ${student.savings.toLocaleString('id-ID')}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: center; width: 40px;">No</th>
                <th style="text-align: center; width: 90px;">Tanggal</th>
                <th style="text-align: left;">Keterangan</th>
                <th style="text-align: right; width: 110px;">Pemasukan</th>
                <th style="text-align: right; width: 110px;">Pengeluaran</th>
                <th style="text-align: right; width: 120px; background-color: #f1f5f9;">Saldo</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
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

  // Download PDF directly calling downloadToPDF
  const handleDirectDownloadSavingsPDF = (student: Student) => {
    const transactions = getSavingsTransactions(student);
    const headers = ['No', 'Tanggal', 'Keterangan', 'Pemasukan', 'Pengeluaran', 'Saldo'];
    const rows = transactions.map((t, idx) => [
      String(idx + 1),
      t.date,
      t.description,
      t.type === 'Masuk' ? `Rp ${t.amount.toLocaleString('id-ID')}` : '-',
      t.type === 'Keluar' ? `Rp ${t.amount.toLocaleString('id-ID')}` : '-',
      `Rp ${t.balance.toLocaleString('id-ID')}`
    ]);

    let waliKelasName = '';
    if (student.class && classStaffs && teachers) {
      const staff = classStaffs.find(cs => cs.classId === student.class);
      if (staff) {
        const teacher = teachers.find(t => t.nuptk === staff.waliKelasNuptk);
        if (teacher) {
          waliKelasName = teacher.name;
        }
      }
    }

    downloadToPDF(
      `Laporan Mutasi Buku Tabungan - NISN: ${student.nisn} - ${student.name}`,
      headers,
      rows,
      `Laporan_Tabungan_${student.nisn}_${student.name.replace(/\s+/g, '_')}.pdf`,
      schoolName,
      academicYear,
      semester,
      student.class,
      waliKelasName || undefined
    );
  };

  // Filter students
  const filteredStudents = students.filter(student => {
    if (role === 'SISWA') {
      return student.nisn === studentNisn;
    }

    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.nisn.includes(searchQuery);
    const matchesClass = classFilter ? student.class === classFilter : true;
    
    if (financeTypeFilter === 'has_bill') {
      return matchesSearch && matchesClass && student.cashBill > 0;
    }
    if (financeTypeFilter === 'has_savings') {
      return matchesSearch && matchesClass && student.savings > 0;
    }

    return matchesSearch && matchesClass;
  });

  // Top level stats (calculated based on filtered/unfiltered list)
  const totalCashBill = filteredStudents.reduce((sum, s) => sum + s.cashBill, 0);
  const totalSavings = filteredStudents.reduce((sum, s) => sum + s.savings, 0);
  const paidCount = filteredStudents.filter(s => s.cashBill === 0).length;
  const unpaidCount = filteredStudents.filter(s => s.cashBill > 0).length;

  // Handlers for Cash Expenses
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDescInput.trim() || !expenseAmountInput || expenseAmountInput <= 0) {
      toast.error('Mohon isi deskripsi dan jumlah pengeluaran dengan benar!');
      return;
    }

    const newExpense: CashExpense = {
      id: `exp-${Date.now()}`,
      date: expenseDateInput,
      description: expenseDescInput.trim(),
      amount: Number(expenseAmountInput),
      classId: expenseClassInput
    };

    setCashExpenses(prev => [newExpense, ...prev]);
    setExpenseDescInput('');
    setExpenseAmountInput('');
    toast.success('Berhasil mencatat pengeluaran kas baru.');
  };

  const handleDeleteExpense = (id: string) => {
    showConfirm('Apakah Anda yakin ingin menghapus catatan pengeluaran ini?').then((confirmed) => {
      if (confirmed) {
        setCashExpenses(prev => prev.filter(exp => exp.id !== id));
        toast.success('Pengeluaran berhasil dihapus.');
      }
    });
  };

  // Open transaction modal
  const openModal = (student: Student, type: 'pay_bill' | 'deposit_savings' | 'withdraw_savings') => {
    setSelectedStudent(student);
    setModalType(type);
    setAmountInput('');
  };

  // Handle transaction submission
  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || amountInput === '' || amountInput <= 0) return;

    const updatedStudent = { ...selectedStudent };

    if (modalType === 'pay_bill') {
      if (amountInput > selectedStudent.cashBill) {
        toast.error('Jumlah pembayaran melebihi sisa tagihan!');
        return;
      }
      updatedStudent.cashBill = selectedStudent.cashBill - amountInput;
      setShowStatusMsg(`Berhasil mencatat pembayaran uang kas sebesar Rp ${amountInput.toLocaleString('id-ID')} untuk ${selectedStudent.name}.`);

      // Save cash transaction to log
      const sessionKey = `siap_cash_tx_${selectedStudent.nisn}`;
      const existing = localStorage.getItem(sessionKey);
      const list = existing ? JSON.parse(existing) : [];
      list.push({
        date: new Date().toISOString().split('T')[0],
        description: 'Pembayaran Uang Kas',
        amount: amountInput
      });
      localStorage.setItem(sessionKey, JSON.stringify(list));
    } else if (modalType === 'deposit_savings') {
      updatedStudent.savings = selectedStudent.savings + amountInput;
      setShowStatusMsg(`Berhasil menabung sebesar Rp ${amountInput.toLocaleString('id-ID')} untuk ${selectedStudent.name}.`);

      const sessionKey = `siap_savings_tx_${selectedStudent.nisn}`;
      const existing = localStorage.getItem(sessionKey);
      const list = existing ? JSON.parse(existing) : [];
      list.push({
        date: new Date().toISOString().split('T')[0],
        description: 'Setoran Tabungan',
        type: 'Masuk',
        amount: amountInput
      });
      localStorage.setItem(sessionKey, JSON.stringify(list));

    } else if (modalType === 'withdraw_savings') {
      if (amountInput > selectedStudent.savings) {
        toast.error('Saldo tabungan tidak mencukupi!');
        return;
      }
      updatedStudent.savings = selectedStudent.savings - amountInput;
      setShowStatusMsg(`Berhasil menarik tabungan sebesar Rp ${amountInput.toLocaleString('id-ID')} untuk ${selectedStudent.name}.`);

      const sessionKey = `siap_savings_tx_${selectedStudent.nisn}`;
      const existing = localStorage.getItem(sessionKey);
      const list = existing ? JSON.parse(existing) : [];
      list.push({
        date: new Date().toISOString().split('T')[0],
        description: 'Penarikan Tabungan',
        type: 'Keluar',
        amount: amountInput
      });
      localStorage.setItem(sessionKey, JSON.stringify(list));
    }

    onEditStudent(selectedStudent.nisn, updatedStudent);
    setModalType(null);
    setSelectedStudent(null);

    setTimeout(() => {
      setShowStatusMsg(null);
    }, 5000);
  };

  // Mass Email Send helper
  const handleSendMassEmails = async () => {
    const debtors = filteredStudents.filter(s => s.cashBill > 0);
    if (debtors.length === 0) {
      toast.warning('Tidak ada siswa dengan tagihan uang kas aktif untuk dikirimi email.');
      return;
    }

    const confirmed = await showConfirm(`Kirim email tagihan uang kas ke ${debtors.length} orangtua siswa?`, {
      title: 'Kirim Email Massal',
      type: 'info'
    });
    if (confirmed) {
      debtors.forEach(s => {
        onSendCashBillEmail(s.nisn, 'Uang Kas');
      });
      toast.success(`Antrean email tagihan untuk ${debtors.length} siswa berhasil dibuat dan sedang diproses.`);
    }
  };

  const formatShorthand = (amount: number): string => {
    if (amount <= 0) return '';
    return amount.toLocaleString('id-ID');
  };

  const getActiveDates = (): string[] => {
    const targetPrefix = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}`;
    const targetStudents = role === 'SISWA'
      ? students.filter(s => s.nisn === studentNisn)
      : (monthlyClass 
          ? students.filter(s => s.class === monthlyClass)
          : students);

    const datesSet = new Set<string>();

    targetStudents.forEach(student => {
      if (rekapType === 'uang-kas') {
        const txs = getCashTransactions(student);
        txs.forEach(tx => {
          if (tx.date.startsWith(targetPrefix)) {
            datesSet.add(tx.date);
          }
        });
      } else {
        const txs = getSavingsTransactions(student);
        txs.forEach(tx => {
          if (tx.date.startsWith(targetPrefix)) {
            datesSet.add(tx.date);
          }
        });
      }
    });

    return Array.from(datesSet).sort((a, b) => a.localeCompare(b));
  };

  const handleExportMonthlyExcel = () => {
    const yearNum = Number(monthlyYear);
    const monthNum = Number(monthlyMonth);
    const activeDates = getActiveDates();
    const activeDatesLength = activeDates.length || 1;
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

    const isUangKas = rekapType === 'uang-kas';

    // Header 1
    const row1 = ['No', 'NISN', 'Nama Siswa', 'JK (L/P)', `${monthName.toUpperCase()} ${monthlyYear}`];
    for (let d = 1; d < activeDatesLength; d++) {
      row1.push(''); // spacing for monthly merge
    }
    if (isUangKas) {
      row1.push('Jumlah', '');
    } else {
      row1.push('Jumlah', '', '');
    }

    // Header 2
    const row2 = ['', '', '', ''];
    if (activeDates.length === 0) {
      row2.push('-');
    } else {
      activeDates.forEach(dateStr => {
        const dayNum = Number(dateStr.split('-')[2]);
        row2.push(String(dayNum));
      });
    }
    if (isUangKas) {
      row2.push('Total Bayar', 'Sisa Tagihan');
    } else {
      row2.push('Total Setor', 'Total Tarik', 'Saldo Tabungan');
    }

    // Rows data
    const dataRows = targetStudents.map((student, idx) => {
      const dailyVals = [];
      if (activeDates.length === 0) {
        dailyVals.push('');
      } else {
        activeDates.forEach(dateStr => {
          if (isUangKas) {
            const paid = getCashTransactions(student)
              .filter(tx => tx.date === dateStr)
              .reduce((sum, tx) => sum + tx.amount, 0);
            dailyVals.push(paid > 0 ? paid : '');
          } else {
            const txs = getSavingsTransactions(student).filter(tx => tx.date === dateStr);
            let net = 0;
            txs.forEach(tx => {
              if (tx.type === 'Masuk') net += tx.amount;
              if (tx.type === 'Keluar') net -= tx.amount;
            });
            dailyVals.push(net !== 0 ? (net > 0 ? `+${net}` : `${net}`) : '');
          }
        });
      }

      if (isUangKas) {
        const totalPaidMonth = getCashTransactions(student)
          .filter(tx => tx.date.startsWith(targetPrefix))
          .reduce((sum, tx) => sum + tx.amount, 0);
        return [
          idx + 1,
          student.nisn,
          student.name,
          student.gender === 'Laki-laki' ? 'L' : 'P',
          ...dailyVals,
          totalPaidMonth,
          student.cashBill
        ];
      } else {
        const sTxs = getSavingsTransactions(student).filter(tx => tx.date.startsWith(targetPrefix));
        const totalDepositMonth = sTxs.filter(tx => tx.type === 'Masuk').reduce((sum, tx) => sum + tx.amount, 0);
        const totalWithdrawMonth = sTxs.filter(tx => tx.type === 'Keluar').reduce((sum, tx) => sum + tx.amount, 0);
        return [
          idx + 1,
          student.nisn,
          student.name,
          student.gender === 'Laki-laki' ? 'L' : 'P',
          ...dailyVals,
          totalDepositMonth,
          totalWithdrawMonth,
          student.savings
        ];
      }
    });

    const logoStatus = logoUrl ? 'TERUNGGAH & AKTIF' : 'BELUM DIUNGGAH';
    const govLogoStatus = govLogoUrl ? 'TERUNGGAH & AKTIF' : 'BELUM DIUNGGAH';
    const headerRows = [
      ['KEMENTERIAN AGAMA REPUBLIK INDONESIA'],
      [schoolName],
      [schoolAddress || 'Alamat lengkap instansi sekolah belum disetting.'],
      [`STATUS LOGO INSTANSI/DINAS: ${govLogoStatus} | STATUS LOGO MADRASAH: ${logoStatus}`],
      [],
      [`REKAP BULANAN ${isUangKas ? 'UANG KAS' : 'TABUNGAN'} SISWA`],
      [`Bulan: ${monthName} ${monthlyYear}`],
      [`Kelas: ${monthlyClass || 'SEMUA KELAS'}`],
      [`Tahun Pelajaran: ${academicYear}`],
      [`Semester: ${semester}`],
      [],
    ];

    const aoa = [...headerRows, row1, row2, ...dataRows];

    if (isUangKas) {
      aoa.push([]);
      aoa.push([]);
      aoa.push(['TABEL DATA PENGELUARAN KAS KELAS']);
      aoa.push(['Bulan:', `${monthName} ${monthlyYear}`, 'Kelas:', monthlyClass || 'Semua Kelas']);
      aoa.push([]);
      aoa.push(['No', 'Tanggal', 'Kelas', 'Keterangan Pengeluaran', 'Jumlah Nominal']);

      const targetPrefixExp = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}`;
      const filteredExp = cashExpenses.filter(exp => {
        const matchesMonth = exp.date.startsWith(targetPrefixExp);
        const matchesClass = monthlyClass ? exp.classId === monthlyClass : true;
        return matchesMonth && matchesClass;
      });

      if (filteredExp.length === 0) {
        aoa.push(['-', 'Tidak ada riwayat pengeluaran kas pada bulan ini.', '', '', '']);
      } else {
        filteredExp.forEach((exp, expIdx) => {
          aoa.push([
            expIdx + 1,
            exp.date,
            exp.classId || 'Semua Kelas',
            exp.description,
            exp.amount
          ]);
        });
        const totalFilteredAmount = filteredExp.reduce((sum, exp) => sum + exp.amount, 0);
        aoa.push(['TOTAL PENGELUARAN KAS KELAS', '', '', '', totalFilteredAmount]);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Set columns widths
    const cols = [
      { wch: 5 },  // No
      { wch: 15 }, // NISN
      { wch: 28 }, // Nama Siswa
      { wch: 6 },  // JK
    ];
    for (let d = 0; d < activeDatesLength; d++) {
      cols.push({ wch: 10 }); // Compact daily amount cells
    }
    if (isUangKas) {
      cols.push({ wch: 12 }, { wch: 12 });
    } else {
      cols.push({ wch: 12 }, { wch: 12 }, { wch: 15 });
    }
    ws['!cols'] = cols;

    // Set merges shifted by 11 header rows
    ws['!merges'] = [
      { s: { r: 11, c: 0 }, e: { r: 12, c: 0 } }, // No
      { s: { r: 11, c: 1 }, e: { r: 12, c: 1 } }, // NISN
      { s: { r: 11, c: 2 }, e: { r: 12, c: 2 } }, // Nama Siswa
      { s: { r: 11, c: 3 }, e: { r: 12, c: 3 } }, // JK
      { s: { r: 11, c: 4 }, e: { r: 11, c: 4 + activeDatesLength - 1 } }, // Bulan dynamic
      { s: { r: 11, c: 4 + activeDatesLength }, e: { r: 11, c: 4 + activeDatesLength + (isUangKas ? 1 : 2) } } // Jumlah columns
    ];

    // Configure for landscape & folio/F4 size
    ws['!pageSetup'] = {
      orientation: 'landscape',
      paperSize: 14 // 14 corresponds to Folio / F4 (8.5in x 13in)
    };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Rekap ${isUangKas ? 'Uang Kas' : 'Tabungan'}`);
    XLSX.writeFile(wb, `Rekap_${isUangKas ? 'Uang_Kas' : 'Tabungan'}_Bulanan_${monthlyClass || 'Semua'}_${monthName}_${monthlyYear}.xlsx`);
  };

  const handleExportMonthlyPDF = () => {
    const yearNum = Number(monthlyYear);
    const monthNum = Number(monthlyMonth);
    const targetPrefix = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}`;
    const targetStudents = monthlyClass 
      ? students.filter(s => s.class === monthlyClass)
      : students;

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNames[monthNum - 1];

    // Retrieve system details
    let schoolAddress = '';
    let logoUrl = '';
    let govLogoUrl = '';
    let headmasterName = 'Makhfud, S.Pd.';
    let headmasterNip = '197812052005011002';
    try {
      const acadRaw = localStorage.getItem('siap_academic');
      if (acadRaw) {
        const acad = JSON.parse(acadRaw);
        if (acad.headmasterName) headmasterName = acad.headmasterName;
        else if (acad.headmaster) headmasterName = acad.headmaster;
        if (acad.headmasterNip) headmasterNip = acad.headmasterNip;
      }
    } catch (e) {}

    try {
      const sysRaw = localStorage.getItem('siap_system');
      if (sysRaw) {
        const sys = JSON.parse(sysRaw);
        if (sys.schoolAddress) schoolAddress = sys.schoolAddress;
        if (sys.logoUrl) logoUrl = sys.logoUrl;
        if (sys.govLogoUrl) govLogoUrl = sys.govLogoUrl;
        if (!localStorage.getItem('siap_academic')) {
          if (sys.headmasterName) headmasterName = sys.headmasterName;
          if (sys.headmasterNip) headmasterNip = sys.headmasterNip;
        }
      }
    } catch (e) {
      // ignore
    }

    let holidayList: any[] = [];
    try {
      const stored = localStorage.getItem('siap_holidays');
      if (stored) holidayList = JSON.parse(stored);
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
    const activeClass = monthlyClass || teacherClass;
    if (activeClass && classStaffs && teachers) {
      const staff = classStaffs.find(cs => cs.classId === activeClass);
      if (staff) {
        const teacher = teachers.find(t => t.nuptk === staff.waliKelasNuptk);
        if (teacher) {
          waliKelasName = teacher.name;
        }
      }
    }

    const isUangKas = rekapType === 'uang-kas';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.warning('Mohon aktifkan popup browser Anda untuk mencetak laporan.');
      return;
    }

    const activeDates = getActiveDates();
    const dateKeys: string[] = [...activeDates];
    const dateSubHeadersHtml: string[] = [];

    if (activeDates.length === 0) {
      dateSubHeadersHtml.push(
        `<th style="padding: 2px 1px; border: 1px solid #475569; text-align: center; font-size: 7px; min-width: 24px;">-</th>`
      );
    } else {
      activeDates.forEach(dateStr => {
        const dayNum = Number(dateStr.split('-')[2]);
        const dateObj = new Date(dateStr);
        const isSundayVal = dateObj.getDay() === 0;
        const holiday = holidayList.find((h: any) => h.date === dateStr);
        const isHoliday = isSundayVal || !!holiday;

        const bgStyle = isHoliday ? 'background-color: #fee2e2; color: #dc2626; font-weight: bold;' : '';
        dateSubHeadersHtml.push(
          `<th style="padding: 2px 1px; border: 1px solid #475569; text-align: center; font-size: 7px; min-width: 24px; ${bgStyle}">${dayNum}</th>`
        );
      });
    }

    const studentRowsHtml = targetStudents.map((student, sIdx) => {
      let totalPaidMonth = 0;
      let totalDepositMonth = 0;
      let totalWithdrawMonth = 0;

      const cellsHtml = dateKeys.length === 0
        ? `<td style="padding: 2px 1px; border: 1px solid #cbd5e1; text-align: center; font-size: 7px;">-</td>`
        : dateKeys.map((dateStr) => {
            const dateObj = new Date(dateStr);
            const isSundayVal = dateObj.getDay() === 0;
            const holiday = holidayList.find((h: any) => h.date === dateStr);
            const isHoliday = isSundayVal || !!holiday;
            const bgStyle = isHoliday ? 'background-color: #fee2e2; color: #dc2626;' : '';

            if (isUangKas) {
              const paid = getCashTransactions(student)
                .filter(tx => tx.date === dateStr)
                .reduce((sum, tx) => sum + tx.amount, 0);
              totalPaidMonth += paid;
              return `<td style="padding: 2px 1px; border: 1px solid #cbd5e1; text-align: center; font-size: 7px; ${bgStyle}">${paid > 0 ? formatShorthand(paid) : ''}</td>`;
            } else {
              const txs = getSavingsTransactions(student).filter(tx => tx.date === dateStr);
              let net = 0;
              txs.forEach(tx => {
                if (tx.type === 'Masuk') {
                  net += tx.amount;
                  totalDepositMonth += tx.amount;
                }
                if (tx.type === 'Keluar') {
                  net -= tx.amount;
                  totalWithdrawMonth += tx.amount;
                }
              });
              const display = net !== 0 ? (net > 0 ? `+${formatShorthand(net)}` : `-${formatShorthand(Math.abs(net))}`) : '';
              const textClass = net !== 0 ? (net > 0 ? 'color: #15803d; font-weight: bold;' : 'color: #b91c1c; font-weight: bold;') : '';
              return `<td style="padding: 2px 1px; border: 1px solid #cbd5e1; text-align: center; font-size: 7px; ${bgStyle} ${textClass}">${display}</td>`;
            }
          }).join('');

      if (isUangKas) {
        return `
          <tr>
            <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center; font-size: 8px;">${sIdx + 1}</td>
            <td style="padding: 4px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 8px;">${student.nisn}</td>
            <td class="student-name" style="padding: 4px; border: 1px solid #cbd5e1; text-align: left; font-size: 8px;">${student.name}</td>
            <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center; font-size: 8px;">${student.gender === 'Laki-laki' ? 'L' : 'P'}</td>
            ${cellsHtml}
            <td class="summary-col" style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; padding-right: 4px; font-size: 8px;">Rp ${totalPaidMonth.toLocaleString('id-ID')}</td>
            <td class="summary-col" style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; padding-right: 4px; font-size: 8px;">Rp ${student.cashBill.toLocaleString('id-ID')}</td>
          </tr>
        `;
      } else {
        return `
          <tr>
            <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center; font-size: 8px;">${sIdx + 1}</td>
            <td style="padding: 4px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 8px;">${student.nisn}</td>
            <td class="student-name" style="padding: 4px; border: 1px solid #cbd5e1; text-align: left; font-size: 8px;">${student.name}</td>
            <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center; font-size: 8px;">${student.gender === 'Laki-laki' ? 'L' : 'P'}</td>
            ${cellsHtml}
            <td class="summary-col" style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; padding-right: 4px; font-size: 8px;">Rp ${totalDepositMonth.toLocaleString('id-ID')}</td>
            <td class="summary-col" style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; padding-right: 4px; font-size: 8px;">Rp ${totalWithdrawMonth.toLocaleString('id-ID')}</td>
            <td class="summary-col" style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; padding-right: 4px; font-size: 8px;">Rp ${student.savings.toLocaleString('id-ID')}</td>
          </tr>
        `;
      }
    }).join('');

    let expensesHtml = '';
    if (isUangKas) {
      const targetPrefixExp = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}`;
      const filteredExp = cashExpenses.filter(exp => {
        const matchesMonth = exp.date.startsWith(targetPrefixExp);
        const matchesClass = monthlyClass ? exp.classId === monthlyClass : true;
        return matchesMonth && matchesClass;
      });

      const totalFilteredAmount = filteredExp.reduce((sum, exp) => sum + exp.amount, 0);

      let tableRows = '';
      if (filteredExp.length === 0) {
        tableRows = `
          <tr>
            <td colspan="5" style="padding: 15px; text-align: center; color: #64748b; font-style: italic;">
              Tidak ada riwayat pengeluaran kas pada bulan ini.
            </td>
          </tr>
        `;
      } else {
        tableRows = filteredExp.map((exp, expIdx) => `
          <tr>
            <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center;">${expIdx + 1}</td>
            <td style="padding: 4px; border: 1px solid #cbd5e1; font-family: monospace;">${exp.date}</td>
            <td style="padding: 4px; border: 1px solid #cbd5e1;">${exp.classId || 'Semua Kelas'}</td>
            <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: left; padding-left: 6px;">${exp.description}</td>
            <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; padding-right: 6px; font-family: monospace;">Rp ${exp.amount.toLocaleString('id-ID')}</td>
          </tr>
        `).join('');

        tableRows += `
          <tr style="font-weight: bold; background-color: #f8fafc;">
            <td colspan="4" style="padding: 5px; border: 1px solid #cbd5e1; text-align: left; padding-left: 6px;">TOTAL PENGELUARAN KAS KELAS</td>
            <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: right; padding-right: 6px; font-family: monospace;">Rp ${totalFilteredAmount.toLocaleString('id-ID')}</td>
          </tr>
        `;
      }

      expensesHtml = `
        <div style="margin-top: 25px; page-break-inside: avoid;">
          <h3 style="font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; border-bottom: 2px solid #0f172a; padding-bottom: 3px;">
            II. DATA REKAPITULASI PENGELUARAN KAS KELAS
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 7.5px;">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="padding: 4px; width: 30px; border: 1px solid #475569;">No</th>
                <th style="padding: 4px; width: 80px; border: 1px solid #475569;">Tanggal</th>
                <th style="padding: 4px; width: 80px; border: 1px solid #475569;">Kelas</th>
                <th style="padding: 4px; border: 1px solid #475569; text-align: left; padding-left: 6px;">Keterangan Pengeluaran</th>
                <th style="padding: 4px; width: 120px; border: 1px solid #475569; text-align: right; padding-right: 6px;">Jumlah Nominal</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Rekap Bulanan Keuangan - ${monthName} ${monthlyYear}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            @page {
              size: 8.5in 13in landscape; /* Folio / F4 landscape size */
              margin: 8mm 8mm 12mm 8mm;
            }
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              font-size: 9px;
            }
            .kop-container {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 3px double #0f172a;
              padding-bottom: 6px;
              margin-bottom: 10px;
            }
            .kop-logo {
              width: 50px;
              height: 50px;
              object-fit: contain;
            }
            .kop-logo-left { margin-right: 12px; }
            .kop-logo-right { margin-left: 12px; }
            .kop-text { text-align: center; flex-grow: 1; }
            .kop-school {
              font-size: 13px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0;
              color: #0f172a;
            }
            .kop-sub {
              font-size: 8px;
              color: #475569;
              margin: 2px 0 0 0;
              line-height: 1.3;
            }
            .title-section { text-align: center; margin-bottom: 12px; }
            .title-main {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0;
            }
            .title-sub { font-size: 8px; color: #475569; margin: 2px 0 0 0; }
            
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 7.5px;
              margin-bottom: 15px;
            }
            th, td {
              border: 1px solid #475569;
              text-align: center;
              padding: 3px 1px;
              vertical-align: middle;
            }
            th {
              background-color: #f1f5f9;
              font-weight: bold;
              color: #0f172a;
              text-transform: uppercase;
              font-size: 7px;
            }
            .student-name {
              text-align: left;
              padding-left: 4px;
              font-weight: bold;
              max-width: 100px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .summary-col { background-color: #f8fafc; font-weight: bold; font-size: 7.5px; white-space: nowrap; }
            
            .sign-section {
              display: flex;
              justify-content: space-between;
              margin-top: 15px;
              font-size: 9px;
              page-break-inside: avoid;
            }
            .sign-box {
              width: 220px;
              text-align: center;
            }
            .sign-space {
              height: 45px;
            }
            .sign-name {
              font-weight: bold;
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <!-- Double logo header kop -->
          <div class="kop-container">
            ${govLogoUrl ? `<img class="kop-logo kop-logo-left" src="${govLogoUrl}" referrerPolicy="no-referrer" />` : '<div style="width: 50px;"></div>'}
            <div class="kop-text">
              <h3 class="kop-school">KEMENTERIAN AGAMA REPUBLIK INDONESIA</h3>
              <h1 class="kop-school" style="font-size: 14px; margin-top: 2px;">${schoolName}</h1>
              <p class="kop-sub">${schoolAddress || 'Alamat instansi belum dikonfigurasi.'}</p>
            </div>
            ${logoUrl ? `<img class="kop-logo kop-logo-right" src="${logoUrl}" referrerPolicy="no-referrer" />` : '<div style="width: 50px;"></div>'}
          </div>

          <div class="title-section" style="line-height: 1.5; font-size: 10px; text-align: center; margin-bottom: 15px;">
            <h2 class="title-main" style="margin-bottom: 12px; font-size: 11px; font-weight: 800; text-transform: uppercase;">REKAPITULASI BULANAN ${isUangKas ? 'UANG KAS' : 'TABUNGAN'} SISWA</h2>
          </div>

          <div class="meta-grid" style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 15px; font-size: 9px; width: 100%; box-sizing: border-box; text-align: left;">
            <span style="color: #64748b; font-weight: 500;">Bulan</span>
            <span style="color: #0f172a; font-weight: 700;">: ${monthName} ${monthlyYear}</span>
            <span style="color: #64748b; font-weight: 500;">Kelas</span>
            <span style="color: #0f172a; font-weight: 700;">: ${monthlyClass || 'Semua Kelas'}</span>
            <span style="color: #64748b; font-weight: 500;">Tahun Pelajaran</span>
            <span style="color: #0f172a; font-weight: 700;">: ${academicYear}</span>
            <span style="color: #64748b; font-weight: 500;">Semester</span>
            <span style="color: #0f172a; font-weight: 700;">: ${semester}</span>
          </div>

          <table>
            <thead>
              <tr>
                <th rowspan="2" style="width: 25px;">No</th>
                <th rowspan="2" style="width: 65px;">NISN</th>
                <th rowspan="2" style="width: 110px; text-align: left; padding-left: 4px;">Nama Siswa</th>
                <th rowspan="2" style="width: 25px;">JK</th>
                <th colspan="${activeDates.length || 1}">Tanggal</th>
                ${isUangKas ? `
                  <th colspan="2">Jumlah</th>
                ` : `
                  <th colspan="3">Jumlah</th>
                `}
              </tr>
              <tr>
                ${dateSubHeadersHtml.join('')}
                ${isUangKas ? `
                  <th style="width: 75px; font-size: 7px;">Total Bayar</th>
                  <th style="width: 75px; font-size: 7px;">Sisa Tagihan</th>
                ` : `
                  <th style="width: 70px; font-size: 7px;">Total Setor</th>
                  <th style="width: 70px; font-size: 7px;">Total Tarik</th>
                  <th style="width: 75px; font-size: 7px;">Saldo Aktif</th>
                `}
              </tr>
            </thead>
            <tbody>
              ${studentRowsHtml || `<tr><td colspan="${(activeDates.length || 1) + (isUangKas ? 6 : 7)}" style="padding: 15px; font-style: italic; color: #64748b;">Tidak ada data siswa.</td></tr>`}
            </tbody>
          </table>

          ${expensesHtml}

          <div class="sign-section">
            <div class="sign-box">
              <p>Mengetahui,</p>
              <p style="margin-top: 2px; font-weight: bold;">Kepala Madrasah</p>
              <div class="sign-space"></div>
              <p class="sign-name">${headmasterName}</p>
              ${headmasterNip ? `<p style="margin: 2px 0 0 0; font-size: 8px;">NIP. ${headmasterNip}</p>` : ''}
            </div>
            
            <div class="sign-box">
              <p>${cityName}, ${formattedDate}</p>
              <p style="margin-top: 2px; font-weight: bold;">Wali Kelas / Bendahara</p>
              <div class="sign-space"></div>
              <p class="sign-name">${waliKelasName || '____________________'}</p>
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

  return (
    <div className="space-y-6">
      {/* Alert Status Banner */}
      {showStatusMsg && (
        <div className={`p-4 border rounded-2xl flex items-center gap-3 text-xs font-semibold animate-fadeIn ${
          isDark 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-[1px_1px_3px_#cbd5ce]'
        }`}>
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{showStatusMsg}</span>
        </div>
      )}

      {/* Header section */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 ${
        isDark ? 'border-[#17221c]' : 'border-[#cbd5ce]'
      }`}>
        <div>
          <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {activeMenu === 'tabungan' 
              ? (role === 'SISWA' ? 'Keuangan Saya - Tabungan' : 'Manajemen Tabungan Siswa')
              : (activeMenu === 'uang-kas' 
                  ? (role === 'SISWA' ? 'Keuangan Saya - Uang Kas' : 'Manajemen Uang Kas Siswa')
                  : 'Manajemen Uang Kas & Tabungan Siswa')}
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {activeMenu === 'tabungan'
              ? (role === 'SISWA' ? 'Lacak saldo tabungan dan riwayat mutasi tabungan Anda' : 'Catat setoran/penarikan tabungan siswa, unduh mutasi tabungan, dan kirimkan laporan tabungan ke email orangtua')
              : (activeMenu === 'uang-kas'
                  ? (role === 'SISWA' ? 'Lacak status pembayaran dan tagihan uang kas kelas Anda' : 'Lacak tagihan kas kelas, catat pembayaran uang kas, dan kirimkan tagihan ke email orangtua siswa')
                  : 'Lacak tagihan kas kelas, catat setoran/penarikan tabungan, dan kirimkan tagihan ke email orangtua siswa')}
          </p>
        </div>

        {role !== 'SISWA' && activeMenu !== 'tabungan' && (
          <button
            onClick={handleSendMassEmails}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 transition duration-150 shadow-md shadow-emerald-500/10 self-start md:self-auto cursor-pointer"
          >
            <Mail className="w-4 h-4" />
            <span>Kirim Email Tagihan Massal</span>
          </button>
        )}
      </div>

      {/* Statistic Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeMenu !== 'tabungan' && (
          <div className={`p-5 rounded-2xl flex items-center justify-between border transition-all duration-300 ${
            isDark 
              ? 'bg-[#121e15] border-[#17221c]' 
              : 'bg-white border-[#cbd5ce]/60 shadow-[1px_1px_3px_#cbd5ce]'
          }`}>
            <div className="space-y-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Total Tagihan Kas</span>
              <div className={`text-xl font-extrabold font-mono ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                Rp {totalCashBill.toLocaleString('id-ID')}
              </div>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{unpaidCount} siswa belum lunas</p>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
              <Coins className="w-5 h-5" />
            </div>
          </div>
        )}

        {activeMenu !== 'uang-kas' && (
          <div className={`p-5 rounded-2xl flex items-center justify-between border transition-all duration-300 ${
            isDark 
              ? 'bg-[#121e15] border-[#17221c]' 
              : 'bg-white border-[#cbd5ce]/60 shadow-[1px_1px_3px_#cbd5ce]'
          }`}>
            <div className="space-y-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Total Tabungan</span>
              <div className={`text-xl font-extrabold font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Rp {totalSavings.toLocaleString('id-ID')}
              </div>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Penyimpanan kas sekolah</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        )}

        {activeMenu !== 'tabungan' && (
          <div className={`p-5 rounded-2xl flex items-center justify-between border transition-all duration-300 ${
            isDark 
              ? 'bg-[#121e15] border-[#17221c]' 
              : 'bg-white border-[#cbd5ce]/60 shadow-[1px_1px_3px_#cbd5ce]'
          }`}>
            <div className="space-y-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Siswa Lunas</span>
              <div className={`text-xl font-extrabold font-mono ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                {paidCount} <span className="text-xs text-slate-500 font-sans font-normal">Siswa</span>
              </div>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Sudah menyelesaikan uang kas</p>
            </div>
            <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20 text-teal-400">
              <Check className="w-5 h-5" />
            </div>
          </div>
        )}

        <div className={`p-5 rounded-2xl flex items-center justify-between border transition-all duration-300 ${
          isDark 
            ? 'bg-[#121e15] border-[#17221c]' 
            : 'bg-white border-[#cbd5ce]/60 shadow-[1px_1px_3px_#cbd5ce]'
        }`}>
          <div className="space-y-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Tahun & Semester</span>
            <div className={`text-sm font-bold font-mono ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
              {academicYear}
            </div>
            <p className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Semester {semester}</p>
          </div>
          <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20 text-teal-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div className={`flex border-b gap-1 overflow-x-auto ${isDark ? 'border-[#17221c]' : 'border-[#cbd5ce]'}`}>
        <button
          type="button"
          onClick={() => setSubTab('kelola')}
          className={`px-4 py-2.5 border-b-2 text-xs font-bold transition flex items-center gap-2 flex-shrink-0 cursor-pointer ${
            subTab === 'kelola'
              ? 'border-emerald-500 text-emerald-400'
              : `border-transparent ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Kelola Keuangan</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('rekap')}
          className={`px-4 py-2.5 border-b-2 text-xs font-bold transition flex items-center gap-2 flex-shrink-0 cursor-pointer ${
            subTab === 'rekap'
              ? 'border-emerald-500 text-emerald-400'
              : `border-transparent ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Rekap Keuangan Bulanan (Tabel)</span>
        </button>

        {activeMenu !== 'tabungan' && (
          <button
            type="button"
            onClick={() => setSubTab('pengeluaran')}
            className={`px-4 py-2.5 border-b-2 text-xs font-bold transition flex items-center gap-2 flex-shrink-0 cursor-pointer ${
              subTab === 'pengeluaran'
                ? 'border-emerald-500 text-emerald-400'
                : `border-transparent ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>Pengeluaran Kas Kelas</span>
          </button>
        )}
      </div>

      {subTab === 'kelola' ? (
        <>
          {role !== 'SISWA' && (
            /* Filters and Search toolbar */
        <div className={`p-4 border rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between text-xs transition-all duration-300 ${
          isDark 
            ? 'bg-[#121e15]/40 border-[#17221c]' 
            : 'bg-[#ebf1ec] border-[#cbd5ce]'
        }`}>
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari siswa berdasarkan nama atau NISN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full border rounded-xl pl-9 pr-4 py-2 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition ${
                isDark 
                  ? 'bg-slate-950 border-[#17221c] text-slate-200' 
                  : 'bg-white border-[#cbd5ce] text-slate-800 shadow-[inset_1px_1px_3px_#cbd5ce]'
              }`}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Filter by Class */}
            {showClassFilter && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border w-full sm:w-auto ${
                isDark 
                  ? 'bg-slate-950 border-[#17221c]' 
                  : 'bg-white border-[#cbd5ce] shadow-[1px_1px_3px_#cbd5ce]'
              }`}>
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className={`bg-transparent focus:outline-none cursor-pointer font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                >
                  <option value="" className={isDark ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-800"}>Semua Kelas</option>
                  {availableClasses.map(c => (
                    <option key={c} value={c} className={isDark ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-800"}>Kelas {c}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter by Finance status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border w-full sm:w-auto ${
              isDark 
                ? 'bg-slate-950 border-[#17221c]' 
                : 'bg-white border-[#cbd5ce] shadow-[1px_1px_3px_#cbd5ce]'
            }`}>
              <Coins className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={financeTypeFilter}
                onChange={(e) => setFinanceTypeFilter(e.target.value as any)}
                className={`bg-transparent focus:outline-none cursor-pointer font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
              >
                {activeMenu !== 'tabungan' && activeMenu !== 'uang-kas' && (
                  <>
                    <option value="all" className={isDark ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-800"}>Semua Data</option>
                    <option value="has_bill" className={isDark ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-800"}>Belum Lunas Kas</option>
                    <option value="has_savings" className={isDark ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-800"}>Memiliki Tabungan</option>
                  </>
                )}
                {activeMenu === 'uang-kas' && (
                  <>
                    <option value="all" className={isDark ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-800"}>Semua Siswa</option>
                    <option value="has_bill" className={isDark ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-800"}>Belum Lunas Kas</option>
                  </>
                )}
                {activeMenu === 'tabungan' && (
                  <>
                    <option value="all" className={isDark ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-800"}>Semua Siswa</option>
                    <option value="has_savings" className={isDark ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-800"}>Memiliki Tabungan</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Student Cards & List */}
      <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
        isDark 
          ? 'bg-[#121e15] border-[#17221c]' 
          : 'bg-white border-[#cbd5ce] shadow-[2px_2px_5px_#cbd5ce]'
      }`}>
        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Info className="w-8 h-8 mx-auto mb-3 text-slate-600" />
            <p className="text-sm font-semibold">Tidak ada data keuangan siswa yang cocok.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <thead className={`font-bold border-b uppercase tracking-wider text-[10px] ${
                isDark 
                  ? 'bg-slate-950 text-slate-400 border-[#17221c]' 
                  : 'bg-[#ebf1ec] text-slate-600 border-[#cbd5ce]'
              }`}>
                <tr>
                  <th className="p-4">NISN</th>
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4">Kelas</th>
                  {activeMenu !== 'tabungan' && <th className="p-4 text-right">Tagihan Uang Kas</th>}
                  {activeMenu !== 'uang-kas' && <th className="p-4 text-right">Saldo Tabungan</th>}
                  {activeMenu !== 'uang-kas' && <th className="p-4 text-center">Mutasi Tabungan</th>}
                  {role !== 'SISWA' && <th className="p-4 text-center">Notifikasi Email</th>}
                  {role !== 'SISWA' && <th className="p-4 text-center w-48">Aksi</th>}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-[#17221c]' : 'divide-[#cbd5ce]/50'}`}>
                {filteredStudents.map((student) => (
                  <tr key={student.nisn} className={`transition ${isDark ? 'hover:bg-slate-950/40' : 'hover:bg-[#ebf1ec]/20'}`}>
                    <td className={`p-4 font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{student.nisn}</td>
                    <td className={`p-4 font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{student.name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-md font-bold font-mono text-[10px] border ${
                        isDark 
                          ? 'bg-slate-800 text-slate-300 border-slate-750/60' 
                          : 'bg-[#ebf1ec] text-emerald-800 border-[#cbd5ce]'
                      }`}>
                        {student.class}
                      </span>
                    </td>
                    {activeMenu !== 'tabungan' && (
                      <td className="p-4 text-right font-mono font-bold">
                        {student.cashBill > 0 ? (
                          <span className={isDark ? 'text-rose-400' : 'text-rose-600'}>Rp {student.cashBill.toLocaleString('id-ID')}</span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full font-sans text-[10px] ${
                            isDark 
                              ? 'text-teal-400 bg-teal-500/10 border border-teal-500/20' 
                              : 'text-teal-700 bg-teal-50 border border-teal-200 font-semibold'
                          }`}>
                            Lunas
                          </span>
                        )}
                      </td>
                    )}
                    {activeMenu !== 'uang-kas' && (
                      <td className={`p-4 text-right font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        Rp {student.savings.toLocaleString('id-ID')}
                      </td>
                    )}
                    {activeMenu !== 'uang-kas' && (
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-1">
                          <button
                            onClick={() => handleDownloadSavingsExcel(student)}
                            className={`p-1 rounded-lg border text-[9px] font-bold flex items-center gap-0.5 transition cursor-pointer ${
                              isDark
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/30'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                            title="Unduh Excel Mutasi Tabungan"
                          >
                            <FileSpreadsheet className="w-3 h-3" />
                            <span>EXCEL</span>
                          </button>
                          <button
                            onClick={() => handleDirectDownloadSavingsPDF(student)}
                            className={`p-1 rounded-lg border text-[9px] font-bold flex items-center gap-0.5 transition cursor-pointer ${
                              isDark
                                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/30'
                                : 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                            }`}
                            title="Unduh PDF (.pdf) Mutasi Tabungan Langsung"
                          >
                            <FileDown className="w-3 h-3" />
                            <span>PDF</span>
                          </button>
                          <button
                            onClick={() => handleDownloadSavingsPDF(student)}
                            className={`p-1 rounded-lg border text-[9px] font-bold flex items-center gap-0.5 transition cursor-pointer ${
                              isDark
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/30'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                            title="Cetak Mutasi Tabungan PDF"
                          >
                            <Printer className="w-3 h-3" />
                            <span>CETAK</span>
                          </button>
                        </div>
                      </td>
                    )}
                    {role !== 'SISWA' && (
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          {/* Send Bill Email */}
                          {activeMenu !== 'tabungan' && (
                            <button
                              onClick={() => {
                                if (student.cashBill === 0) {
                                  toast.warning('Siswa sudah lunas, tidak perlu dikirimi email tagihan.');
                                  return;
                                }
                                onSendCashBillEmail(student.nisn, 'Uang Kas');
                                toast.success(`Email tagihan berhasil disimulasikan untuk dikirim ke ${student.parentEmail}`);
                              }}
                              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                                student.cashBill > 0
                                  ? (isDark 
                                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20'
                                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100')
                                  : (isDark
                                      ? 'bg-[#121e15] text-slate-600 border-[#17221c] cursor-not-allowed'
                                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed')
                              }`}
                              title="Kirim Tagihan Uang Kas"
                              disabled={student.cashBill === 0}
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Tagihan</span>
                            </button>
                          )}

                          {/* Send Savings Email */}
                          {activeMenu !== 'uang-kas' && (
                            <button
                              onClick={() => {
                                onSendCashBillEmail(student.nisn, 'Tabungan');
                                toast.success(`Email laporan tabungan disimulasikan untuk dikirim ke ${student.parentEmail}`);
                              }}
                              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                                isDark
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                              title="Kirim Laporan Tabungan"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Tabungan</span>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                    {role !== 'SISWA' && (
                      <td className="p-4">
                        <div className="flex justify-center items-center gap-2">
                          {/* Pay Cash Bill Button */}
                          {activeMenu !== 'tabungan' && (
                            <button
                              onClick={() => openModal(student, 'pay_bill')}
                              className={`p-1.5 rounded-lg border transition flex items-center gap-1 font-bold text-[10px] uppercase cursor-pointer ${
                                isDark
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 shadow-[1px_1px_2px_#cbd5ce]'
                              }`}
                              title="Bayar Uang Kas"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Bayar Kas</span>
                            </button>
                          )}

                          {/* Deposit Savings */}
                          {activeMenu !== 'uang-kas' && (
                            <button
                              onClick={() => openModal(student, 'deposit_savings')}
                              className={`p-1.5 rounded-lg border transition flex items-center gap-1 font-bold text-[10px] uppercase cursor-pointer ${
                                isDark
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-[1px_1px_2px_#cbd5ce]'
                              }`}
                              title="Setor Tabungan"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>Setor</span>
                            </button>
                          )}

                          {/* Withdraw Savings */}
                          {activeMenu !== 'uang-kas' && (
                            <button
                              onClick={() => openModal(student, 'withdraw_savings')}
                              className={`p-1.5 rounded-lg border transition flex items-center gap-1 font-bold text-[10px] uppercase cursor-pointer ${
                                student.savings > 0
                                  ? (isDark
                                      ? 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100')
                                  : (isDark
                                      ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed'
                                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed')
                              }`}
                              title="Tarik Tabungan"
                              disabled={student.savings === 0}
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              <span>Tarik</span>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      ) : subTab === 'rekap' ? (
        /* Rekap Sub-tab View */
        <div className="space-y-6">
          {/* Controls */}
          <div className={`p-5 border rounded-2xl flex flex-col lg:flex-row gap-4 items-end justify-between transition-all duration-300 ${
            isDark 
              ? 'bg-[#121e15]/40 border-[#17221c]' 
              : 'bg-[#ebf1ec] border-[#cbd5ce]'
          }`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full lg:w-auto flex-grow items-end">


              {/* Class Selector */}
              {showClassFilter && (
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Pilih Kelas</label>
                  <select
                    value={monthlyClass}
                    onChange={(e) => setMonthlyClass(e.target.value)}
                    className={`border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                      isDark 
                        ? 'bg-slate-900 border-slate-800 text-white' 
                        : 'bg-white border-[#cbd5ce] text-slate-800 shadow-[1px_1px_3px_#cbd5ce]'
                    }`}
                  >
                    <option value="">Semua Kelas</option>
                    {availableClasses.map(c => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Month Selector */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Bulan</label>
                <select
                  value={monthlyMonth}
                  onChange={(e) => setMonthlyMonth(Number(e.target.value))}
                  className={`border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white' 
                      : 'bg-white border-[#cbd5ce] text-slate-800 shadow-[1px_1px_3px_#cbd5ce]'
                  }`}
                >
                  {[
                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                  ].map((name, idx) => (
                    <option key={idx} value={idx + 1}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Year Selector */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tahun</label>
                <select
                  value={monthlyYear}
                  onChange={(e) => setMonthlyYear(e.target.value)}
                  className={`border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white' 
                      : 'bg-white border-[#cbd5ce] text-slate-800 shadow-[1px_1px_3px_#cbd5ce]'
                  }`}
                >
                  {['2025', '2026', '2027', '2028'].map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Export and Print Buttons */}
            <div className="flex gap-2.5 w-full lg:w-auto justify-end">
              <button
                type="button"
                onClick={handleExportMonthlyExcel}
                className="flex-1 lg:flex-initial bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold uppercase py-2.5 px-4 rounded-xl transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 hover:shadow-md active:scale-95"
                title="Unduh format Excel Landscape Folio"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel (F4)</span>
              </button>
              <button
                type="button"
                onClick={handleExportMonthlyPDF}
                className="flex-1 lg:flex-initial bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase py-2.5 px-4 rounded-xl transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 hover:shadow-md active:scale-95 border border-sky-500/20"
                title="Cetak/Unduh format PDF Landscape Folio"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak (F4)</span>
              </button>
            </div>
          </div>

          {/* Table Grid */}
          <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
            isDark 
              ? 'bg-[#121e15] border-[#17221c]' 
              : 'bg-white border-[#cbd5ce] shadow-[2px_2px_5px_#cbd5ce]'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  {/* Row 1 Headers */}
                  <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                    isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-[#ebf1ec] text-slate-600 border-[#cbd5ce]'
                  }`}>
                    <th rowSpan={2} className={`p-2 border-r w-10 text-center ${isDark ? 'border-slate-800' : 'border-[#cbd5ce]'}`}>No</th>
                    <th rowSpan={2} className={`p-2 border-r w-24 text-center ${isDark ? 'border-slate-800' : 'border-[#cbd5ce]'}`}>NISN</th>
                    <th rowSpan={2} className={`p-2 border-r w-44 text-left ${isDark ? 'border-slate-800' : 'border-[#cbd5ce]'}`}>Nama Siswa</th>
                    <th rowSpan={2} className={`p-2 border-r w-10 text-center ${isDark ? 'border-slate-800' : 'border-[#cbd5ce]'}`}>JK</th>
                    <th colSpan={getActiveDates().length || 1} className={`p-2 border-b border-r text-center ${isDark ? 'border-slate-800' : 'border-[#cbd5ce]'}`}>
                      Tanggal ({[
                        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                      ][Number(monthlyMonth)-1].toUpperCase()} {monthlyYear})
                    </th>
                    <th colSpan={rekapType === 'uang-kas' ? 2 : 3} className="p-2 text-center">Jumlah</th>
                  </tr>
                  {/* Row 2 Headers (Dates) */}
                  <tr className={`text-[8px] border-b font-bold ${
                    isDark ? 'bg-slate-950 text-slate-500 border-slate-800' : 'bg-[#f7faf8] text-slate-500 border-[#cbd5ce]'
                  }`}>
                    {getActiveDates().length === 0 ? (
                      <th className={`p-1 border-r text-center text-slate-500 font-normal ${isDark ? 'border-slate-800' : 'border-[#cbd5ce]'}`}>
                        -
                      </th>
                    ) : (
                      getActiveDates().map((dateStr, dIdx) => {
                        const dayNum = Number(dateStr.split('-')[2]);
                        const dateObj = new Date(dateStr);
                        const isSundayVal = dateObj.getDay() === 0;
                        return (
                          <th
                            key={dIdx}
                            className={`p-1 border-r w-12 text-center text-[10px] font-bold ${isDark ? 'border-slate-850/60' : 'border-[#cbd5ce]/60'} ${
                              isSundayVal ? 'text-rose-400 bg-rose-500/5' : ''
                            }`}
                          >
                            Tgl {dayNum}
                          </th>
                        );
                      })
                    )}
                    {rekapType === 'uang-kas' ? (
                      <>
                        <th className={`p-1 border-r text-center w-16 ${isDark ? 'border-slate-800' : 'border-[#cbd5ce]'}`}>Total Bayar</th>
                        <th className="p-1 text-center w-16">Sisa Tagihan</th>
                      </>
                    ) : (
                      <>
                        <th className={`p-1 border-r text-center w-16 ${isDark ? 'border-slate-800' : 'border-[#cbd5ce]'}`}>Total Setor</th>
                        <th className={`p-1 border-r text-center w-16 ${isDark ? 'border-slate-800' : 'border-[#cbd5ce]'}`}>Total Tarik</th>
                        <th className="p-1 text-center w-16">Saldo Aktif</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-[#cbd5ce]/40 text-slate-700'}`}>
                  {(() => {
                    const activeDates = getActiveDates();
                    const targetPrefix = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}`;
                    const listStudents = role === 'SISWA'
                      ? students.filter(s => s.nisn === studentNisn)
                      : (monthlyClass 
                          ? students.filter(s => s.class === monthlyClass)
                          : students);

                    if (listStudents.length === 0) {
                      return (
                        <tr>
                          <td colSpan={(activeDates.length || 1) + (rekapType === 'uang-kas' ? 6 : 7)} className="p-10 text-xs text-slate-500 italic">
                            Tidak ada data keuangan siswa yang terekam.
                          </td>
                        </tr>
                      );
                    }

                    return listStudents.map((student, sIdx) => {
                      const totalPaidMonth = getCashTransactions(student)
                        .filter(tx => tx.date.startsWith(targetPrefix))
                        .reduce((sum, tx) => sum + tx.amount, 0);

                      const sTxs = getSavingsTransactions(student).filter(tx => tx.date.startsWith(targetPrefix));
                      const totalDepositMonth = sTxs.filter(tx => tx.type === 'Masuk').reduce((sum, tx) => sum + tx.amount, 0);
                      const totalWithdrawMonth = sTxs.filter(tx => tx.type === 'Keluar').reduce((sum, tx) => sum + tx.amount, 0);

                      return (
                        <tr key={student.nisn} className={`transition-colors ${isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50'}`}>
                          <td className={`p-1.5 border-r text-center font-mono ${isDark ? 'border-slate-850/60 text-slate-500' : 'border-[#cbd5ce]/40 text-slate-400'}`}>{sIdx + 1}</td>
                          <td className={`p-1.5 border-r text-center font-mono ${isDark ? 'border-slate-850/60 text-slate-400' : 'border-[#cbd5ce]/40 text-slate-500'}`}>{student.nisn}</td>
                          <td className={`p-1.5 border-r font-bold text-left truncate max-w-[150px] ${isDark ? 'border-slate-850/60 text-slate-100' : 'border-[#cbd5ce]/40 text-slate-800'}`} title={student.name}>{student.name}</td>
                          <td className={`p-1.5 border-r text-center ${isDark ? 'border-slate-850/60 text-slate-400' : 'border-[#cbd5ce]/40 text-slate-500'}`}>{student.gender === 'Laki-laki' ? 'L' : 'P'}</td>
                          
                          {/* Daily cells */}
                          {activeDates.length === 0 ? (
                            <td className={`p-1.5 border-r text-center text-slate-500 italic ${isDark ? 'border-slate-850/60' : 'border-[#cbd5ce]/40'}`}>
                              Tidak ada transaksi
                            </td>
                          ) : (
                            activeDates.map((dateStr, dIdx) => {
                              const dateObj = new Date(dateStr);
                              const isSundayVal = dateObj.getDay() === 0;

                              if (rekapType === 'uang-kas') {
                                const paid = getCashTransactions(student)
                                  .filter(tx => tx.date === dateStr)
                                  .reduce((sum, tx) => sum + tx.amount, 0);
                                return (
                                  <td
                                    key={dIdx}
                                    className={`p-1 border-r text-[10px] text-center min-w-[50px] ${isDark ? 'border-slate-850/60' : 'border-[#cbd5ce]/40'} ${
                                      isSundayVal ? 'bg-rose-500/5' : ''
                                    }`}
                                  >
                                    {paid > 0 ? (
                                      <span className="font-bold text-emerald-500" title={`Bayar Rp ${paid.toLocaleString('id-ID')}`}>
                                        Rp {paid.toLocaleString('id-ID')}
                                      </span>
                                    ) : (
                                      <span className="text-slate-500">-</span>
                                    )}
                                  </td>
                                );
                              } else {
                                const txs = getSavingsTransactions(student).filter(tx => tx.date === dateStr);
                                let net = 0;
                                txs.forEach(tx => {
                                  if (tx.type === 'Masuk') net += tx.amount;
                                  if (tx.type === 'Keluar') net -= tx.amount;
                                });
                                return (
                                  <td
                                    key={dIdx}
                                    className={`p-1 border-r text-[10px] text-center min-w-[50px] ${isDark ? 'border-slate-850/60' : 'border-[#cbd5ce]/40'} ${
                                      isSundayVal ? 'bg-rose-500/5' : ''
                                    }`}
                                  >
                                    {net !== 0 ? (
                                      <span
                                        className={`font-bold ${net > 0 ? 'text-emerald-500' : 'text-rose-400'}`}
                                        title={net > 0 ? `Setor Rp ${net.toLocaleString('id-ID')}` : `Tarik Rp ${Math.abs(net).toLocaleString('id-ID')}`}
                                      >
                                        {net > 0 ? `+Rp ${net.toLocaleString('id-ID')}` : `-Rp ${Math.abs(net).toLocaleString('id-ID')}`}
                                      </span>
                                    ) : (
                                      <span className="text-slate-500">-</span>
                                    )}
                                  </td>
                                );
                              }
                            })
                          )}

                          {/* Sum / totals cells */}
                          {rekapType === 'uang-kas' ? (
                            <>
                              <td className={`p-1.5 border-r text-right pr-2 font-mono font-bold bg-slate-900/20 text-emerald-500 ${isDark ? 'border-slate-850/60' : 'border-[#cbd5ce]/40'}`}>
                                Rp {totalPaidMonth.toLocaleString('id-ID')}
                              </td>
                              <td className="p-1.5 text-right pr-2 font-mono font-bold bg-slate-900/20 text-rose-400">
                                Rp {student.cashBill.toLocaleString('id-ID')}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className={`p-1.5 border-r text-right pr-2 font-mono font-semibold text-emerald-500 bg-slate-900/20 ${isDark ? 'border-slate-850/60' : 'border-[#cbd5ce]/40'}`}>
                                Rp {totalDepositMonth.toLocaleString('id-ID')}
                              </td>
                              <td className={`p-1.5 border-r text-right pr-2 font-mono font-semibold text-rose-400 bg-slate-900/20 ${isDark ? 'border-slate-850/60' : 'border-[#cbd5ce]/40'}`}>
                                Rp {totalWithdrawMonth.toLocaleString('id-ID')}
                              </td>
                              <td className="p-1.5 text-right pr-2 font-mono font-bold text-sky-400 bg-slate-900/20">
                                Rp {student.savings.toLocaleString('id-ID')}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* subTab === 'pengeluaran' view */
        <div className="space-y-6 animate-fadeIn">
          {role !== 'SISWA' && (
            <div className={`p-6 border rounded-2xl transition-all duration-300 ${
              isDark 
                ? 'bg-[#121e15] border-[#17221c]' 
                : 'bg-white border-[#cbd5ce] shadow-[2px_2px_5px_#cbd5ce]'
            }`}>
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Catat Pengeluaran Kas Baru</span>
              </h3>
              
              <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={expenseDateInput}
                    onChange={(e) => setExpenseDateInput(e.target.value)}
                    className={`border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isDark 
                        ? 'bg-slate-900 border-slate-800 text-white' 
                        : 'bg-white border-[#cbd5ce] text-slate-800 shadow-[inset_1px_1px_3px_#cbd5ce]'
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Pilih Kelas *</label>
                  <select
                    value={expenseClassInput}
                    onChange={(e) => setExpenseClassInput(e.target.value)}
                    className={`border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                      isDark 
                        ? 'bg-slate-900 border-slate-800 text-white' 
                        : 'bg-white border-[#cbd5ce] text-slate-800 shadow-[1px_1px_3px_#cbd5ce]'
                    }`}
                  >
                    <option value="">Semua Kelas (Umum)</option>
                    {availableClasses.map(c => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <label className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Keterangan Pengeluaran *</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Pembelian sapu kelas"
                        value={expenseDescInput}
                        onChange={(e) => setExpenseDescInput(e.target.value)}
                        className={`border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                          isDark 
                            ? 'bg-slate-900 border-slate-800 text-white' 
                            : 'bg-white border-[#cbd5ce] text-slate-800 shadow-[inset_1px_1px_3px_#cbd5ce]'
                        }`}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Jumlah Nominal *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-500 font-bold">Rp</span>
                        <input
                          type="number"
                          required
                          min={100}
                          placeholder="Jumlah"
                          value={expenseAmountInput}
                          onChange={(e) => setExpenseAmountInput(e.target.value === '' ? '' : Number(e.target.value))}
                          className={`w-full border rounded-xl pl-8 pr-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                            isDark 
                              ? 'bg-slate-900 border-slate-800 text-white' 
                              : 'bg-white border-[#cbd5ce] text-slate-800 shadow-[inset_1px_1px_3px_#cbd5ce]'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-4 flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2 px-5 rounded-xl transition duration-150 shadow-md shadow-emerald-500/10 cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Simpan Pengeluaran</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Table display of expenditures */}
          <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
            isDark 
              ? 'bg-[#121e15] border-[#17221c]' 
              : 'bg-white border-[#cbd5ce] shadow-[2px_2px_5px_#cbd5ce]'
          }`}>
            <div className={`p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isDark ? 'border-[#17221c]' : 'border-[#cbd5ce]/60'
            }`}>
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  Riwayat Pengeluaran Uang Kas Kelas
                </h3>
                <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Menampilkan pengeluaran kas berdasarkan bulan, tahun, dan kelas terpilih.
                </p>
              </div>

              {/* Expense filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={monthlyClass}
                  onChange={(e) => setMonthlyClass(e.target.value)}
                  className={`border rounded-xl px-2.5 py-1.5 text-xs focus:outline-none cursor-pointer ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white' 
                      : 'bg-white border-[#cbd5ce] text-slate-800 shadow-[1px_1px_3px_#cbd5ce]'
                  }`}
                >
                  <option value="">Semua Kelas</option>
                  {availableClasses.map(c => (
                    <option key={c} value={c}>Kelas {c}</option>
                  ))}
                </select>

                <select
                  value={monthlyMonth}
                  onChange={(e) => setMonthlyMonth(Number(e.target.value))}
                  className={`border rounded-xl px-2.5 py-1.5 text-xs focus:outline-none cursor-pointer ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white' 
                      : 'bg-white border-[#cbd5ce] text-slate-800 shadow-[1px_1px_3px_#cbd5ce]'
                  }`}
                >
                  {[
                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                  ].map((name, idx) => (
                    <option key={idx} value={idx + 1}>{name}</option>
                  ))}
                </select>

                <select
                  value={monthlyYear}
                  onChange={(e) => setMonthlyYear(e.target.value)}
                  className={`border rounded-xl px-2.5 py-1.5 text-xs focus:outline-none cursor-pointer ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white' 
                      : 'bg-white border-[#cbd5ce] text-slate-800 shadow-[1px_1px_3px_#cbd5ce]'
                  }`}
                >
                  {['2025', '2026', '2027', '2028'].map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <thead className={`font-bold border-b uppercase tracking-wider text-[10px] ${
                  isDark 
                    ? 'bg-slate-950 text-slate-400 border-[#17221c]' 
                    : 'bg-[#ebf1ec] text-slate-600 border-[#cbd5ce]'
                }`}>
                  <tr>
                    <th className="p-4 w-16 text-center">No</th>
                    <th className="p-4 w-32">Tanggal</th>
                    <th className="p-4 w-32">Kelas</th>
                    <th className="p-4">Keterangan Pengeluaran</th>
                    <th className="p-4 text-right w-44">Jumlah Nominal</th>
                    {role !== 'SISWA' && <th className="p-4 text-center w-28">Aksi</th>}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-[#17221c]' : 'divide-[#cbd5ce]/50'}`}>
                  {(() => {
                    const targetPrefix = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}`;
                    const filteredExp = cashExpenses.filter(exp => {
                      const matchesMonth = exp.date.startsWith(targetPrefix);
                      const matchesClass = monthlyClass ? exp.classId === monthlyClass : true;
                      return matchesMonth && matchesClass;
                    });

                    if (filteredExp.length === 0) {
                      return (
                        <tr>
                          <td colSpan={role !== 'SISWA' ? 6 : 5} className="p-12 text-center text-slate-500">
                            <Info className="w-8 h-8 mx-auto mb-3 text-slate-600" />
                            <p className="text-sm font-semibold">Tidak ada riwayat pengeluaran kas pada bulan ini.</p>
                          </td>
                        </tr>
                      );
                    }

                    const totalFilteredAmount = filteredExp.reduce((sum, exp) => sum + exp.amount, 0);

                    return (
                      <>
                        {filteredExp.map((exp, idx) => (
                          <tr key={exp.id} className={`transition ${isDark ? 'hover:bg-slate-950/40' : 'hover:bg-[#ebf1ec]/20'}`}>
                            <td className="p-4 text-center font-bold">{idx + 1}</td>
                            <td className="p-4 font-mono font-bold">{exp.date}</td>
                            <td className="p-4 font-bold">
                              <span className={`px-2 py-0.5 rounded-md font-bold font-mono text-[10px] border ${
                                isDark 
                                  ? 'bg-slate-800 text-slate-300 border-slate-750/60' 
                                  : 'bg-[#ebf1ec] text-emerald-800 border-[#cbd5ce]'
                              }`}>
                                {exp.classId || 'Semua Kelas'}
                              </span>
                            </td>
                            <td className="p-4 font-semibold">{exp.description}</td>
                            <td className="p-4 text-right font-mono font-bold text-rose-500">
                              Rp {exp.amount.toLocaleString('id-ID')}
                            </td>
                            {role !== 'SISWA' && (
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => handleDeleteExpense(exp.id)}
                                  className={`p-1 px-2.5 rounded-lg border text-xs font-bold transition duration-150 cursor-pointer ${
                                    isDark
                                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/30'
                                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                  }`}
                                >
                                  Hapus
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                        <tr className={`${isDark ? 'bg-slate-950/60' : 'bg-[#ebf1ec]/30'} font-bold`}>
                          <td colSpan={3} className="p-4">TOTAL PENGELUARAN</td>
                          <td className="p-4"></td>
                          <td className="p-4 text-right font-mono text-rose-500 text-sm">
                            Rp {totalFilteredAmount.toLocaleString('id-ID')}
                          </td>
                          {role !== 'SISWA' && <td className="p-4"></td>}
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION COMPONENT MODAL */}
      {modalType && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border transition-all duration-300 ${
            isDark 
              ? 'bg-slate-900 border-slate-800 text-white animate-scaleIn' 
              : 'bg-white border-[#cbd5ce] text-slate-800 shadow-[4px_4px_15px_rgba(0,0,0,0.15)] animate-scaleIn'
          }`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDark ? 'border-slate-800' : 'border-[#cbd5ce]'}`}>
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {modalType === 'pay_bill' && '💵 Pembayaran Uang Kas'}
                {modalType === 'deposit_savings' && '💰 Setoran Tabungan Siswa'}
                {modalType === 'withdraw_savings' && '🏧 Penarikan Tabungan Siswa'}
              </h3>
              <button
                onClick={() => { setModalType(null); setSelectedStudent(null); }}
                className={`p-1 rounded-lg transition cursor-pointer ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-[#ebf1ec] text-slate-500 hover:text-slate-850'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Nama Siswa:</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedStudent.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Kelas / NISN:</span>
                <span className={`font-mono font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{selectedStudent.class} / {selectedStudent.nisn}</span>
              </div>
              {modalType === 'pay_bill' && (
                <div className="flex justify-between text-xs">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Sisa Tagihan Kas:</span>
                  <span className={`font-mono font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>Rp {selectedStudent.cashBill.toLocaleString('id-ID')}</span>
                </div>
              )}
              {(modalType === 'deposit_savings' || modalType === 'withdraw_savings') && (
                <div className="flex justify-between text-xs">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Saldo Tabungan Saat Ini:</span>
                  <span className={`font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Rp {selectedStudent.savings.toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleTransactionSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className={`block font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Jumlah Nominal (Rupiah) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-bold font-mono text-[10px]">Rp</span>
                  <input
                    type="number"
                    required
                    min={1}
                    max={modalType === 'pay_bill' ? selectedStudent.cashBill : modalType === 'withdraw_savings' ? selectedStudent.savings : undefined}
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className={`w-full border rounded-xl pl-9 pr-4 py-2 font-mono font-bold focus:outline-none focus:border-emerald-500 ${
                      isDark 
                        ? 'bg-slate-950 border-slate-850 text-slate-200' 
                        : 'bg-white border-[#cbd5ce] text-slate-800 shadow-[inset_1px_1px_3px_#cbd5ce]'
                    }`}
                    placeholder="Contoh: 10000"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalType(null); setSelectedStudent(null); }}
                  className={`flex-1 font-bold py-2.5 px-4 rounded-xl border transition cursor-pointer ${
                    isDark 
                      ? 'bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-white' 
                      : 'bg-[#ebf1ec] hover:bg-[#cbd5ce] border-[#cbd5ce] text-slate-750'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl transition shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  Konfirmasi Selesai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
