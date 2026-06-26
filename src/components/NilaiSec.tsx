/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  PenTool,
  FileText,
  Search,
  Filter,
  FileSpreadsheet,
  FileDown,
  Mail,
  Check,
  AlertCircle,
  TrendingUp,
  Award
} from 'lucide-react';
import { Student, Grade } from '../types';
import { downloadFile, convertToCSV, printToPDF } from '../utils/export';

interface NilaiSecProps {
  students: Student[];
  grades: Grade[];
  onSaveGrade: (grade: Omit<Grade, 'id' | 'timestamp'>) => void;
  onSendGradeEmail: (gradeId: string) => void;
  onDeleteGrade: (id: string) => void;
  schoolName: string;
  academicYear: string;
  semester: string;
  availableClasses: string[];
  availableSubjects: string[];
  role: 'ADMIN' | 'GURU' | 'SISWA';
  studentNisn?: string;
  activeMenu?: string;
}

export default function NilaiSec({
  students,
  grades,
  onSaveGrade,
  onSendGradeEmail,
  onDeleteGrade,
  schoolName,
  academicYear,
  semester,
  availableClasses,
  availableSubjects,
  role,
  studentNisn,
  activeMenu
}: NilaiSecProps) {
  // Navigation tabs driven by sidebar menu selection
  const activeTab = activeMenu ? (activeMenu === 'nilai-input' ? 'input' : 'list') : (role === 'SISWA' ? 'list' : 'input');

  // Input States
  const [inputClass, setInputClass] = useState(availableClasses[0] || 'IX-A');
  const [inputSubject, setInputSubject] = useState(availableSubjects[0] || 'Matematika');
  const [selectedStudentNisn, setSelectedStudentNisn] = useState('');
  const [sumatifList, setSumatifList] = useState<number[]>([]);
  const [currentSumatif, setCurrentSumatif] = useState<number | ''>('');
  const [stsVal, setStsVal] = useState<number | ''>('');
  const [sasVal, setSasVal] = useState<number | ''>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter/List States
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  // Filter students based on class selection in INPUT form
  const inputClassStudents = students.filter(s => s.class === inputClass);

  const updateFormFromExisting = (nisn: string, subjectStr: string) => {
    if (!nisn) {
      setSumatifList([]);
      setStsVal('');
      setSasVal('');
      return;
    }
    const existing = grades.find(g => g.nisn === nisn && g.subject === subjectStr && g.academicYear === academicYear && g.semester === semester);
    if (existing) {
      setSumatifList(existing.sumatif || []);
      setStsVal(existing.sts);
      setSasVal(existing.sas);
    } else {
      setSumatifList([]);
      setStsVal('');
      setSasVal('');
    }
  };

  // Submit Grade Entry
  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);

    if (!selectedStudentNisn) {
      alert('Silakan pilih siswa terlebih dahulu.');
      return;
    }

    const studentObj = students.find(s => s.nisn === selectedStudentNisn);
    if (!studentObj) return;

    if (sumatifList.length === 0) {
      alert('Silakan tambahkan minimal satu nilai sumatif.');
      return;
    }

    const st = stsVal === '' ? 0 : Number(stsVal);
    const sa = sasVal === '' ? 0 : Number(sasVal);

    if (st < 0 || st > 100 || sa < 0 || sa > 100) {
      alert('Nilai harus di rentang 0 - 100');
      return;
    }

    onSaveGrade({
      nisn: selectedStudentNisn,
      studentName: studentObj.name,
      class: studentObj.class,
      subject: inputSubject,
      academicYear,
      semester,
      sumatif: sumatifList,
      sts: st,
      sas: sa
    });

    const sumAvg = sumatifList.reduce((s, v) => s + v, 0) / sumatifList.length;
    const finalVal = Math.round(((sumAvg + st + sa) / 3) * 10) / 10;

    setSuccessMsg(`Nilai Mapel ${inputSubject} untuk ${studentObj.name} berhasil disimpan! Rata-rata final: ${finalVal}`);
    
    // Reset values
    setSelectedStudentNisn('');
    setSumatifList([]);
    setCurrentSumatif('');
    setStsVal('');
    setSasVal('');

    setTimeout(() => {
      setSuccessMsg(null);
    }, 4500);
  };

  // Filter Grades List
  const filteredGrades = grades.filter(g => {
    if (g.academicYear !== academicYear || g.semester !== semester) return false;

    if (role === 'SISWA') {
      return g.nisn === studentNisn;
    }

    const matchesSearch = g.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || g.nisn.includes(searchQuery);
    const matchesClass = classFilter ? g.class === classFilter : true;
    const matchesSubject = subjectFilter ? g.subject === subjectFilter : true;

    return matchesSearch && matchesClass && matchesSubject;
  });

  // Export to CSV
  const handleExportExcel = () => {
    const headers = ['ID Nilai', 'NISN', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Nilai Sumatif', 'STS', 'SAS', 'Rata-rata Final', 'Tahun Pelajaran', 'Semester', 'Waktu Penginputan'];
    const csvContent = convertToCSV(
      filteredGrades.map(g => {
        const sumAvg = g.sumatif && g.sumatif.length > 0 ? g.sumatif.reduce((s, v) => s + v, 0) / g.sumatif.length : 0;
        return {
          ...g,
          sumatifStr: g.sumatif ? g.sumatif.join('; ') : '',
          finalScore: Math.round((((sumAvg + (g.sts ?? 0) + (g.sas ?? 0)) / 3)) * 10) / 10
        };
      }),
      headers,
      ['id', 'nisn', 'studentName', 'class', 'subject', 'sumatifStr', 'sts', 'sas', 'finalScore', 'academicYear', 'semester', 'timestamp']
    );
    downloadFile(csvContent, `Rekap_Nilai_Siswa_${academicYear.replace('/', '-')}.csv`, 'text/csv;charset=utf-8;');
  };

  // Export to PDF
  const handleExportPDF = () => {
    const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Sumatif (Rerata)', 'STS', 'SAS', 'Nilai Akhir', 'Status KKM'];
    const rows = filteredGrades.map((g, idx) => {
      const sumAvg = g.sumatif && g.sumatif.length > 0 ? g.sumatif.reduce((s, v) => s + v, 0) / g.sumatif.length : 0;
      const finalVal = Math.round(((sumAvg + (g.sts ?? 0) + (g.sas ?? 0)) / 3) * 10) / 10;
      const sumatifDisplay = g.sumatif && g.sumatif.length > 0 ? `${g.sumatif.join(', ')} (${Math.round(sumAvg * 10) / 10})` : '-';
      return [
        String(idx + 1),
        g.nisn,
        g.studentName,
        g.class,
        g.subject,
        sumatifDisplay,
        String(g.sts ?? 0),
        String(g.sas ?? 0),
        String(finalVal),
        finalVal >= 75 ? 'LULUS' : 'REMIDI'
      ];
    });
    printToPDF(`Laporan Rekap Nilai Akademik Siswa`, headers, rows, schoolName, academicYear, semester);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 selection:bg-emerald-500 selection:text-white font-sans">
      {/* Header and navigation tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Sistem Penilaian Siswa (SIAP-Nilai)</h2>
          <p className="text-slate-400 text-xs mt-1">Lakukan penginputan nilai Sumatif, STS, SAS, dan kirimkan rapor hasil belajar langsung ke orangtua</p>
        </div>
      </div>

      {activeTab === 'input' && role !== 'SISWA' ? (
        // --- VIEW 1: INPUT NILAI SISWA ---
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
          {/* Main Input Form */}
          <div className="lg:col-span-2 p-6 bg-slate-950/40 border border-slate-800 rounded-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-emerald-400" /> Formulir Penginputan Nilai Akademik
            </h3>

            {successMsg && (
              <div className="flex gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl mb-4 animate-fadeIn">
                <Check className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleGradeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rombel / Kelas */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Pilih Kelas / Rombel</label>
                  <select
                    value={inputClass}
                    onChange={(e) => {
                      setInputClass(e.target.value);
                      setSelectedStudentNisn('');
                      setSumatifList([]);
                      setStsVal('');
                      setSasVal('');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold text-xs"
                  >
                    {availableClasses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Mata Pelajaran */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Mata Pelajaran</label>
                  <select
                    value={inputSubject}
                    onChange={(e) => {
                      const subjectStr = e.target.value;
                      setInputSubject(subjectStr);
                      updateFormFromExisting(selectedStudentNisn, subjectStr);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold text-xs"
                  >
                    {availableSubjects.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Student Selector */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Pilih Siswa *</label>
                <select
                  required
                  value={selectedStudentNisn}
                  onChange={(e) => {
                    const nisn = e.target.value;
                    setSelectedStudentNisn(nisn);
                    updateFormFromExisting(nisn, inputSubject);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold text-xs"
                >
                  <option value="">-- Pilih Siswa di Kelas {inputClass} --</option>
                  {inputClassStudents.map(student => (
                    <option key={student.nisn} value={student.nisn}>
                      {student.name} (NISN: {student.nisn})
                    </option>
                  ))}
                </select>
              </div>

              {/* Multiple Summative Section */}
              <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
                <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px]">Daftar Nilai Sumatif *</label>
                
                <div className="flex flex-wrap gap-2 p-2.5 bg-slate-950 border border-slate-900 rounded-lg min-h-12 items-center">
                  {sumatifList.length === 0 ? (
                    <span className="text-slate-600 italic text-[11px]">Belum ada nilai sumatif yang ditambahkan.</span>
                  ) : (
                    sumatifList.map((val, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md font-mono font-bold">
                        <span>Sumatif {idx + 1}: {val}</span>
                        <button
                          type="button"
                          onClick={() => setSumatifList(sumatifList.filter((_, i) => i !== idx))}
                          className="text-slate-500 hover:text-rose-400 transition ml-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="Input Nilai Sumatif (0-100)"
                    value={currentSumatif}
                    onChange={(e) => setCurrentSumatif(e.target.value === '' ? '' : Number(e.target.value))}
                    className="bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold text-xs font-mono flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (currentSumatif !== '' && currentSumatif >= 0 && currentSumatif <= 100) {
                        setSumatifList([...sumatifList, Number(currentSumatif)]);
                        setCurrentSumatif('');
                      } else {
                        alert('Masukkan nilai sumatif yang valid (0-100)');
                      }
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold px-4 py-2 rounded-lg text-xs transition border border-slate-750"
                  >
                    Tambah Sumatif
                  </button>
                </div>
              </div>

              {/* Score parameter blocks */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nilai STS (Sumatif Tengah Semester) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    placeholder="STS"
                    value={stsVal}
                    onChange={(e) => setStsVal(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 text-center font-mono font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nilai SAS (Sumatif Akhir Semester) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    placeholder="SAS"
                    value={sasVal}
                    onChange={(e) => setSasVal(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 text-center font-mono font-bold text-sm"
                  />
                </div>
              </div>

              {/* Live Preview Average */}
              {selectedStudentNisn && (sumatifList.length > 0 || stsVal !== '' || sasVal !== '') && (
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Estimasi Nilai Rapor Final:</span>
                  {(() => {
                    const sumAvg = sumatifList.length > 0 ? sumatifList.reduce((s, v) => s + v, 0) / sumatifList.length : 0;
                    const st = stsVal === '' ? 0 : Number(stsVal);
                    const sa = sasVal === '' ? 0 : Number(sasVal);
                    const est = Math.round(((sumAvg + st + sa) / 3) * 10) / 10;
                    return (
                      <span className={`font-mono text-base font-bold px-3 py-1 rounded-lg ${
                        est >= 75
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-rose-400 bg-rose-500/10'
                      }`}>
                        {est}
                      </span>
                    );
                  })()}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-lg shadow-lg shadow-emerald-500/10 transition"
              >
                Simpan & Catat Nilai
              </button>
            </form>
          </div>

          {/* Guidelines Box */}
          <div className="p-5 bg-slate-950/20 border border-slate-800 rounded-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Kebijakan KKM</h3>
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-400">KKM Sekolah:</span>
                  <span className="text-teal-400 font-mono text-sm bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/10">75.0</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  Siswa dengan nilai rata-rata di bawah 75 diwajibkan mengikuti program remedial dari guru mapel masing-masing.
                </p>
              </div>

              <div className="text-slate-400 leading-relaxed text-[11px] space-y-2">
                <p className="font-bold text-slate-300">💡 Tips Pengisian:</p>
                <p>1. Pilih Kelas dan Mata Pelajaran terlebih dahulu.</p>
                <p>2. Pilih Nama Siswa dari dropdown.</p>
                <p>3. Tambahkan satu per satu nilai sumatif harian siswa di panel "Daftar Nilai Sumatif".</p>
                <p>4. Jika siswa tersebut sudah memiliki nilai yang terdaftar, sistem akan otomatis memuat data nilai yang ada agar bisa diedit langsung.</p>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-6 text-center italic border-t border-slate-800/40 pt-3">
              *Tahun Pelajaran {academicYear} | Semester {semester}
            </p>
          </div>
        </div>
      ) : (
        // --- VIEW 2: NILAI SISWA (TABLE WITH EMAIL TRIGGER & EXPORT) ---
        <div className="space-y-4">
          {/* Filters Bar */}
          {role !== 'SISWA' && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/20 border border-slate-800 p-4 rounded-2xl">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {/* Search query input */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Cari NISN atau Nama..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 w-52 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Class selector filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    <option value="">Semua Kelas</option>
                    {availableClasses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Subject filter */}
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  <option value="">Semua Mata Pelajaran</option>
                  {availableSubjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                {/* Export buttons */}
                <button
                  onClick={handleExportExcel}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700/80 text-emerald-400 border border-slate-700/60 rounded-xl transition duration-150"
                  title="Ekspor Rekap Excel (CSV)"
                >
                  <FileSpreadsheet className="w-4.5 h-4.5" />
                </button>

                <button
                  onClick={handleExportPDF}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700/80 text-red-400 border border-slate-700/60 rounded-xl transition duration-150"
                  title="Ekspor PDF / Cetak"
                >
                  <FileDown className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          )}

          {/* Grades Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/10">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider">
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">NISN / Nama Siswa</th>
                  <th className="p-4">Kelas</th>
                  <th className="p-4">Mata Pelajaran</th>
                  <th className="p-4 text-center">Rata-rata Sumatif</th>
                  <th className="p-4 text-center">STS</th>
                  <th className="p-4 text-center">SAS</th>
                  <th className="p-4 text-center">Nilai Rapor</th>
                  <th className="p-4 text-center">Status</th>
                  {role !== 'SISWA' && <th className="p-4 text-center w-28">Kirim Notifikasi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredGrades.length === 0 ? (
                  <tr>
                    <td colSpan={role === 'SISWA' ? 9 : 10} className="p-10 text-center text-slate-500 italic">
                      {role === 'SISWA' ? 'Belum ada laporan nilai rapor untuk Anda di semester ini.' : 'Belum ada data nilai terdaftar untuk kriteria filter ini.'}
                    </td>
                  </tr>
                ) : (
                  filteredGrades.map((g, idx) => {
                    const sumAvg = g.sumatif && g.sumatif.length > 0 ? g.sumatif.reduce((s, v) => s + v, 0) / g.sumatif.length : 0;
                    const finalVal = Math.round(((sumAvg + (g.sts ?? 0) + (g.sas ?? 0)) / 3) * 10) / 10;
                    const formattedSumatif = g.sumatif && g.sumatif.length > 0 ? `${g.sumatif.join(', ')} (Rerata: ${Math.round(sumAvg * 10) / 10})` : '-';
                    return (
                      <tr key={g.id} className="hover:bg-slate-800/20 transition duration-100">
                        <td className="p-4 text-center font-semibold text-slate-500">{idx + 1}</td>
                        <td className="p-4">
                          <p className="font-bold text-white text-sm">{g.studentName}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">NISN: {g.nisn}</p>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 text-[10px] font-bold text-teal-400 bg-teal-500/10 rounded border border-teal-500/10">
                            {g.class}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-200">{g.subject}</td>
                        <td className="p-4 text-center font-mono font-medium text-slate-400">{formattedSumatif}</td>
                        <td className="p-4 text-center font-mono font-medium text-slate-400">{g.sts ?? 0}</td>
                        <td className="p-4 text-center font-mono font-medium text-slate-400">{g.sas ?? 0}</td>
                        <td className="p-4 text-center font-mono font-bold text-white text-sm">{finalVal}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                            finalVal >= 75
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/10'
                              : 'text-rose-400 bg-rose-500/10 border-rose-500/10'
                          }`}>
                            {finalVal >= 75 ? 'LULUS' : 'REMIDI'}
                          </span>
                        </td>
                        {role !== 'SISWA' && (
                          <td className="p-4 text-center">
                            <button
                              onClick={() => {
                                onSendGradeEmail(g.id);
                                alert(`Notifikasi laporan nilai berhasil ditriger! Laporan dikirimkan langsung ke email orangtua. Status pengiriman terpantau di Dashboard.`);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700/60 rounded-lg transition text-[10px] font-bold uppercase active:scale-95"
                              title="Kirim nilai ke Email Orangtua"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Kirim</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
