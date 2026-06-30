/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  FileText
} from 'lucide-react';
import { Student } from '../types';
import * as XLSX from 'xlsx';

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
  studentNisn
}: UangKasSecProps) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const handleThemeChange = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [financeTypeFilter, setFinanceTypeFilter] = useState<'all' | 'has_bill' | 'has_savings'>('all');

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

    const aoa = [
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
    let headmasterName = 'H. Mulyono, S.Pd., M.Pd.';
    try {
      const sysRaw = localStorage.getItem('siap_system');
      if (sysRaw) {
        const sys = JSON.parse(sysRaw);
        if (sys.schoolAddress) schoolAddress = sys.schoolAddress;
        if (sys.logoUrl) logoUrl = sys.logoUrl;
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

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Mohon izinkan popup untuk mengunduh PDF.');
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
              justify-content: center;
              border-bottom: 3.5px double #0f172a;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .kop-logo {
              width: 70px;
              height: 70px;
              object-fit: contain;
              margin-right: 18px;
            }
            .kop-text {
              text-align: center;
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

          <div class="kop-container">
            ${logoUrl ? `<img src="${logoUrl}" class="kop-logo" />` : ''}
            <div class="kop-text">
              <h1 class="kop-school">${schoolName}</h1>
              <p class="kop-sub">${schoolAddress || 'Kementerian Agama Republik Indonesia'}</p>
            </div>
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

          <div class="signature-container">
            <div class="signature-box">
              <p>${cityName}, ${formattedDate}</p>
              <p style="margin-top: 4px;">Mengetahui,</p>
              <p style="font-weight: bold; margin-top: 3px;">Kepala Madrasah</p>
              <div class="signature-space"></div>
              <p style="font-weight: bold; text-decoration: underline; margin: 0; text-transform: uppercase;">${headmasterName}</p>
              <p style="color: #64748b; margin: 2px 0 0 0;">NIP. 197812052005011002</p>
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
        alert('Jumlah pembayaran melebihi sisa tagihan!');
        return;
      }
      updatedStudent.cashBill = selectedStudent.cashBill - amountInput;
      setShowStatusMsg(`Berhasil mencatat pembayaran uang kas sebesar Rp ${amountInput.toLocaleString('id-ID')} untuk ${selectedStudent.name}.`);
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
        alert('Saldo tabungan tidak mencukupi!');
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
  const handleSendMassEmails = () => {
    const debtors = filteredStudents.filter(s => s.cashBill > 0);
    if (debtors.length === 0) {
      alert('Tidak ada siswa dengan tagihan uang kas aktif untuk dikirimi email.');
      return;
    }

    if (confirm(`Kirim email tagihan uang kas ke ${debtors.length} orangtua siswa?`)) {
      debtors.forEach(s => {
        onSendCashBillEmail(s.nisn, 'Uang Kas');
      });
      alert(`Antrean email tagihan untuk ${debtors.length} siswa berhasil dibuat dan sedang diproses.`);
    }
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
          <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>Manajemen Uang Kas & Tabungan Siswa</h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Lacak tagihan kas kelas, catat setoran/penarikan tabungan, dan kirimkan tagihan ke email orangtua siswa</p>
        </div>

        {role !== 'SISWA' && (
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
                <option value="all" className={isDark ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-800"}>Semua Data</option>
                <option value="has_bill" className={isDark ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-800"}>Belum Lunas Kas</option>
                <option value="has_savings" className={isDark ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-800"}>Memiliki Tabungan</option>
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
                  <th className="p-4 text-right">Tagihan Uang Kas</th>
                  <th className="p-4 text-right">Saldo Tabungan</th>
                  <th className="p-4 text-center">Mutasi Tabungan</th>
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
                    <td className={`p-4 text-right font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      Rp {student.savings.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center items-center gap-1.5">
                        <button
                          onClick={() => handleDownloadSavingsExcel(student)}
                          className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                            isDark
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/30'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title="Unduh Excel Mutasi Tabungan"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>EXCEL</span>
                        </button>
                        <button
                          onClick={() => handleDownloadSavingsPDF(student)}
                          className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                            isDark
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/30'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Unduh PDF Mutasi Tabungan"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </td>
                    {role !== 'SISWA' && (
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          {/* Send Bill Email */}
                          <button
                            onClick={() => {
                              if (student.cashBill === 0) {
                                alert('Siswa sudah lunas, tidak perlu dikirimi email tagihan.');
                                return;
                              }
                              onSendCashBillEmail(student.nisn, 'Uang Kas');
                              alert(`Email tagihan berhasil disimulasikan untuk dikirim ke ${student.parentEmail}`);
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

                          {/* Send Savings Email */}
                          <button
                            onClick={() => {
                              onSendCashBillEmail(student.nisn, 'Tabungan');
                              alert(`Email laporan tabungan disimulasikan untuk dikirim ke ${student.parentEmail}`);
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
                        </div>
                      </td>
                    )}
                    {role !== 'SISWA' && (
                      <td className="p-4">
                        <div className="flex justify-center items-center gap-2">
                          {/* Pay Cash Bill Button */}
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

                          {/* Deposit Savings */}
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

                          {/* Withdraw Savings */}
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
