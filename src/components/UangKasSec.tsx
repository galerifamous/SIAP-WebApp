/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  Info
} from 'lucide-react';
import { Student } from '../types';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [financeTypeFilter, setFinanceTypeFilter] = useState<'all' | 'has_bill' | 'has_savings'>('all');

  // Transaction Modals State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [modalType, setModalType] = useState<'pay_bill' | 'deposit_savings' | 'withdraw_savings' | null>(null);
  const [amountInput, setAmountInput] = useState<number | ''>('');
  const [showStatusMsg, setShowStatusMsg] = useState<string | null>(null);

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
    } else if (modalType === 'withdraw_savings') {
      if (amountInput > selectedStudent.savings) {
        alert('Saldo tabungan tidak mencukupi!');
        return;
      }
      updatedStudent.savings = selectedStudent.savings - amountInput;
      setShowStatusMsg(`Berhasil menarik tabungan sebesar Rp ${amountInput.toLocaleString('id-ID')} untuk ${selectedStudent.name}.`);
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
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs font-semibold animate-fadeIn">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{showStatusMsg}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Manajemen Uang Kas & Tabungan Siswa</h2>
          <p className="text-slate-400 text-xs mt-1">Lacak tagihan kas kelas, catat setoran/penarikan tabungan, dan kirimkan tagihan ke email orangtua siswa</p>
        </div>

        {role !== 'SISWA' && (
          <button
            onClick={handleSendMassEmails}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 transition duration-150 shadow-md shadow-emerald-500/10 self-start md:self-auto"
          >
            <Mail className="w-4 h-4" />
            <span>Kirim Email Tagihan Massal</span>
          </button>
        )}
      </div>

      {/* Statistic Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Tagihan Kas</span>
            <div className="text-xl font-extrabold text-rose-400 font-mono">
              Rp {totalCashBill.toLocaleString('id-ID')}
            </div>
            <p className="text-[10px] text-slate-400">{unpaidCount} siswa belum lunas</p>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Tabungan</span>
            <div className="text-xl font-extrabold text-emerald-400 font-mono">
              Rp {totalSavings.toLocaleString('id-ID')}
            </div>
            <p className="text-[10px] text-slate-400">Penyimpanan kas sekolah</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Siswa Lunas</span>
            <div className="text-xl font-extrabold text-teal-400 font-mono">
              {paidCount} <span className="text-xs text-slate-500 font-sans font-normal">Siswa</span>
            </div>
            <p className="text-[10px] text-slate-400">Sudah menyelesaikan uang kas</p>
          </div>
          <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20 text-teal-400">
            <Check className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tahun & Semester</span>
            <div className="text-sm font-bold text-teal-400 font-mono">
              {academicYear}
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Semester {semester}</p>
          </div>
          <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20 text-teal-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {role !== 'SISWA' && (
        /* Filters and Search toolbar */
        <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between text-xs">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari siswa berdasarkan nama atau NISN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Filter by Class */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-850 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="bg-transparent text-slate-300 focus:outline-none cursor-pointer font-semibold"
              >
                <option value="">Semua Kelas</option>
                {availableClasses.map(c => (
                  <option key={c} value={c}>Kelas {c}</option>
                ))}
              </select>
            </div>

            {/* Filter by Finance status */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-850 w-full sm:w-auto">
              <Coins className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={financeTypeFilter}
                onChange={(e) => setFinanceTypeFilter(e.target.value as any)}
                className="bg-transparent text-slate-300 focus:outline-none cursor-pointer font-semibold"
              >
                <option value="all">Semua Data</option>
                <option value="has_bill">Belum Lunas Kas</option>
                <option value="has_savings">Memiliki Tabungan</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Student Cards & List */}
      <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Info className="w-8 h-8 mx-auto mb-3 text-slate-600" />
            <p className="text-sm font-semibold">Tidak ada data keuangan siswa yang cocok.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">NISN</th>
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4">Kelas</th>
                  <th className="p-4 text-right">Tagihan Uang Kas</th>
                  <th className="p-4 text-right">Saldo Tabungan</th>
                  {role !== 'SISWA' && <th className="p-4 text-center">Notifikasi Email</th>}
                  {role !== 'SISWA' && <th className="p-4 text-center w-48">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredStudents.map((student) => (
                  <tr key={student.nisn} className="hover:bg-slate-950/40 transition">
                    <td className="p-4 font-mono text-slate-400 font-bold">{student.nisn}</td>
                    <td className="p-4 font-bold text-white">{student.name}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold font-mono text-[10px] border border-slate-700/60">
                        {student.class}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-bold">
                      {student.cashBill > 0 ? (
                        <span className="text-rose-400">Rp {student.cashBill.toLocaleString('id-ID')}</span>
                      ) : (
                        <span className="text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full font-sans text-[10px]">
                          Lunas
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-400">
                      Rp {student.savings.toLocaleString('id-ID')}
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
                            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                              student.cashBill > 0
                                ? 'bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20'
                                : 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed'
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
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-semibold flex items-center gap-1 transition"
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
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition flex items-center gap-1 font-bold text-[10px] uppercase"
                            title="Bayar Uang Kas"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Bayar Kas</span>
                          </button>

                          {/* Deposit Savings */}
                          <button
                            onClick={() => openModal(student, 'deposit_savings')}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition flex items-center gap-1 font-bold text-[10px] uppercase"
                            title="Setor Tabungan"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>Setor</span>
                          </button>

                          {/* Withdraw Savings */}
                          <button
                            onClick={() => openModal(student, 'withdraw_savings')}
                            className="p-1.5 rounded-lg bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800 transition flex items-center gap-1 font-bold text-[10px] uppercase"
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
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {modalType === 'pay_bill' && '💵 Pembayaran Uang Kas'}
                {modalType === 'deposit_savings' && '💰 Setoran Tabungan Siswa'}
                {modalType === 'withdraw_savings' && '🏧 Penarikan Tabungan Siswa'}
              </h3>
              <button
                onClick={() => { setModalType(null); setSelectedStudent(null); }}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Nama Siswa:</span>
                <span className="font-bold text-white">{selectedStudent.name}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Kelas / NISN:</span>
                <span className="font-mono text-emerald-400 font-semibold">{selectedStudent.class} / {selectedStudent.nisn}</span>
              </div>
              {modalType === 'pay_bill' && (
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Sisa Tagihan Kas:</span>
                  <span className="font-mono text-rose-400 font-bold">Rp {selectedStudent.cashBill.toLocaleString('id-ID')}</span>
                </div>
              )}
              {(modalType === 'deposit_savings' || modalType === 'withdraw_savings') && (
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Saldo Tabungan Saat Ini:</span>
                  <span className="font-mono text-emerald-400 font-bold">Rp {selectedStudent.savings.toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleTransactionSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-400 font-semibold">
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
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-slate-200 font-mono font-bold focus:outline-none focus:border-emerald-500"
                    placeholder="Contoh: 10000"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalType(null); setSelectedStudent(null); }}
                  className="flex-1 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white font-bold py-2.5 px-4 rounded-xl border border-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl transition shadow-lg shadow-emerald-500/10"
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
