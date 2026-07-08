/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { toast, showConfirm } from '../utils/dialog';
import {
  AlertTriangle,
  Trophy,
  Search,
  Filter,
  FileSpreadsheet,
  FileDown,
  Mail,
  Plus,
  Trash2,
  Check,
  Award,
  BookOpen,
  X
} from 'lucide-react';
import { Student, CaseReport, Achievement } from '../types';
import { downloadFile, convertToCSV, printToPDF } from '../utils/export';

interface RecordSecProps {
  students: Student[];
  cases: CaseReport[];
  achievements: Achievement[];
  onAddCase: (caseReport: Omit<CaseReport, 'id'>) => void;
  onAddAchievement: (achievement: Omit<Achievement, 'id'>) => void;
  onSendCaseEmail: (caseId: string) => void;
  onSendAchievementEmail: (achievementId: string) => void;
  onDeleteCase: (id: string) => void;
  onDeleteAchievement: (id: string) => void;
  schoolName: string;
  academicYear: string;
  semester: string;
  availableClasses: string[];
  role: 'ADMIN' | 'GURU' | 'SISWA';
  studentNisn?: string;
  activeMenu?: string;
}

export default function RecordSec({
  students,
  cases,
  achievements,
  onAddCase,
  onAddAchievement,
  onSendCaseEmail,
  onSendAchievementEmail,
  onDeleteCase,
  onDeleteAchievement,
  schoolName,
  academicYear,
  semester,
  availableClasses,
  role,
  studentNisn,
  activeMenu: propActiveMenu
}: RecordSecProps) {
  const activeMenu = propActiveMenu === 'prestasi' ? 'prestasi' : 'kasus';

  // Search/Filters States
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // Add States
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudentNisn, setSelectedStudentNisn] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);

  // Case Form fields
  const [caseName, setCaseName] = useState('');
  const [caseCategory, setCaseCategory] = useState<'Ringan' | 'Sedang' | 'Berat'>('Ringan');
  const [caseResolution, setCaseResolution] = useState('');

  // Achievement Form fields
  const [achName, setAchName] = useState('');
  const [achLevel, setAchLevel] = useState<'Sekolah' | 'Kecamatan' | 'Kabupaten' | 'Provinsi' | 'Nasional' | 'Internasional'>('Sekolah');
  const [achDesc, setAchDesc] = useState('');

  // Filter records based on active academic year and semester, plus role restrictions
  const filteredCases = cases.filter(c => {
    if (c.academicYear !== academicYear || c.semester !== semester) return false;
    if (role === 'SISWA') return c.nisn === studentNisn;

    const matchesSearch = c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || c.nisn.includes(searchQuery);
    const matchesClass = classFilter ? c.class === classFilter : true;
    return matchesSearch && matchesClass;
  });

  const filteredAchievements = achievements.filter(ac => {
    if (ac.academicYear !== academicYear || ac.semester !== semester) return false;
    if (role === 'SISWA') return ac.nisn === studentNisn;

    const matchesSearch = ac.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || ac.nisn.includes(searchQuery);
    const matchesClass = classFilter ? ac.class === classFilter : true;
    return matchesSearch && matchesClass;
  });

  // Handle new record additions
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentNisn) {
      toast.warning('Silakan pilih siswa terlebih dahulu.');
      return;
    }

    const studentObj = students.find(s => s.nisn === selectedStudentNisn);
    if (!studentObj) return;

    if (activeMenu === 'kasus') {
      if (!caseName.trim() || !caseResolution.trim()) {
        toast.warning('Harap isi semua kolom kasus.');
        return;
      }
      onAddCase({
        nisn: selectedStudentNisn,
        studentName: studentObj.name,
        class: studentObj.class,
        date: recordDate,
        caseName,
        category: caseCategory,
        resolution: caseResolution,
        academicYear,
        semester
      });
      // Clear
      setCaseName('');
      setCaseResolution('');
    } else {
      if (!achName.trim() || !achDesc.trim()) {
        toast.warning('Harap isi semua kolom prestasi.');
        return;
      }
      onAddAchievement({
        nisn: selectedStudentNisn,
        studentName: studentObj.name,
        class: studentObj.class,
        date: recordDate,
        achievementName: achName,
        level: achLevel,
        description: achDesc,
        academicYear,
        semester
      });
      // Clear
      setAchName('');
      setAchDesc('');
    }

    setSelectedStudentNisn('');
    setShowAddModal(false);
  };

  // Export to CSV
  const handleExportExcel = () => {
    if (activeMenu === 'kasus') {
      const headers = ['ID Kasus', 'NISN', 'Nama Siswa', 'Kelas', 'Tanggal Kejadian', 'Laporan Kasus', 'Kategori Pelanggaran', 'Resolusi / Tindakan', 'Tahun Pelajaran', 'Semester'];
      const csvContent = convertToCSV(
        filteredCases,
        headers,
        ['id', 'nisn', 'studentName', 'class', 'date', 'caseName', 'category', 'resolution', 'academicYear', 'semester']
      );
      downloadFile(csvContent, `Laporan_Kasus_Siswa_${academicYear.replace('/', '-')}.csv`, 'text/csv;charset=utf-8;');
    } else {
      const headers = ['ID Prestasi', 'NISN', 'Nama Siswa', 'Kelas', 'Tanggal Prestasi', 'Nama Prestasi', 'Tingkat Penghargaan', 'Keterangan Prestasi', 'Tahun Pelajaran', 'Semester'];
      const csvContent = convertToCSV(
        filteredAchievements,
        headers,
        ['id', 'nisn', 'studentName', 'class', 'date', 'achievementName', 'level', 'description', 'academicYear', 'semester']
      );
      downloadFile(csvContent, `Laporan_Prestasi_Siswa_${academicYear.replace('/', '-')}.csv`, 'text/csv;charset=utf-8;');
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (activeMenu === 'kasus') {
      const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Tanggal', 'Nama Kasus', 'Kategori', 'Resolusi'];
      const rows = filteredCases.map((c, idx) => [
        String(idx + 1),
        c.nisn,
        c.studentName,
        c.class,
        c.date,
        c.caseName,
        c.category,
        c.resolution
      ]);
      printToPDF(`Laporan Kasus dan Bimbingan Siswa`, headers, rows, schoolName, academicYear, semester);
    } else {
      const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Tanggal', 'Nama Penghargaan', 'Tingkat', 'Deskripsi'];
      const rows = filteredAchievements.map((ac, idx) => [
        String(idx + 1),
        ac.nisn,
        ac.studentName,
        ac.class,
        ac.date,
        ac.achievementName,
        ac.level,
        ac.description
      ]);
      printToPDF(`Laporan Prestasi dan Penghargaan Siswa`, headers, rows, schoolName, academicYear, semester);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 selection:bg-emerald-500 selection:text-white font-sans">
      {/* Header Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
            {activeMenu === 'kasus' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            ) : (
              <Trophy className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {activeMenu === 'kasus' ? 'Catatan Pelanggaran & Kasus Siswa' : 'Daftar Prestasi & Kejuaraan Siswa'}
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {activeMenu === 'kasus' 
                ? 'Lacak bimbingan perilaku, penanganan kasus, dan tindak lanjut BK' 
                : 'Catat kejuaraan, penghargaan akademik, non-akademik siswa'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {role !== 'SISWA' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 transition duration-150 shadow-md shadow-emerald-500/10"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters bar */}
      {role !== 'SISWA' && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder={activeMenu === 'kasus' ? "Cari kasus berdasarkan nama, NISN..." : "Cari prestasi berdasarkan nama, kejuaraan..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/40 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-300 text-xs focus:outline-none focus:border-emerald-500/80 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
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

            <button
              onClick={handleExportExcel}
              className="p-2.5 bg-slate-800 hover:bg-slate-700/80 text-emerald-400 border border-slate-700/60 rounded-xl transition duration-150"
              title="Ekspor Rekap Excel"
            >
              <FileSpreadsheet className="w-4.5 h-4.5" />
            </button>

            <button
              onClick={handleExportPDF}
              className="p-2.5 bg-slate-800 hover:bg-slate-700/80 text-red-400 border border-slate-700/60 rounded-xl transition duration-150"
              title="Ekspor PDF"
            >
              <FileDown className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      )}

      {/* Render Tables */}
      {activeMenu === 'kasus' ? (
        // --- CASE TABLE ---
        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/10">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider">
                <th className="p-4 w-12 text-center">No</th>
                <th className="p-4">NISN / Nama Siswa</th>
                <th className="p-4">Kelas</th>
                <th className="p-4">Tanggal Laporan</th>
                <th className="p-4">Laporan Kejadian / Pelanggaran</th>
                <th className="p-4">Tindak Lanjut / Resolusi</th>
                <th className="p-4 text-center">Kategori</th>
                {role !== 'SISWA' && <th className="p-4 text-center w-28">Email Orangtua</th>}
                {role === 'ADMIN' && <th className="p-4 text-center w-16">Hapus</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-500 italic">
                    Belum ada rekaman laporan kasus/pelanggaran siswa terdaftar.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-slate-800/20 transition duration-100">
                    <td className="p-4 text-center font-semibold text-slate-500">{idx + 1}</td>
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">{c.studentName}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">NISN: {c.nisn}</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 text-[10px] font-bold text-teal-400 bg-teal-500/10 rounded border border-teal-500/10">
                        {c.class}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-400">{c.date}</td>
                    <td className="p-4 leading-normal font-medium max-w-[220px]" title={c.caseName}>{c.caseName}</td>
                    <td className="p-4 leading-normal text-slate-400 max-w-[220px]" title={c.resolution}>{c.resolution}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                        c.category === 'Ringan'
                          ? 'text-teal-400 bg-teal-500/10 border-teal-500/10'
                          : c.category === 'Sedang'
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/10'
                          : 'text-rose-400 bg-rose-500/10 border-rose-500/15'
                      }`}>
                        {c.category}
                      </span>
                    </td>
                    {role !== 'SISWA' && (
                      <td className="p-4 text-center">
                        <button
                          onClick={() => {
                            onSendCaseEmail(c.id);
                            toast.success('Pesan notifikasi terkait laporan kasus siswa berhasil ditransmisikan ke email orangtua!');
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700/60 rounded-lg transition text-[10px] font-bold uppercase"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Kirim</span>
                        </button>
                      </td>
                    )}
                    {role === 'ADMIN' && (
                      <td className="p-4 text-center">
                        <button
                          onClick={async () => {
                            const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus data kasus ini?', {
                              title: 'Hapus Laporan Kasus',
                              type: 'danger'
                            });
                            if (confirmed) {
                              onDeleteCase(c.id);
                            }
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        // --- ACHIEVEMENT TABLE ---
        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/10">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider">
                <th className="p-4 w-12 text-center">No</th>
                <th className="p-4">NISN / Nama Siswa</th>
                <th className="p-4">Kelas</th>
                <th className="p-4">Tanggal Penghargaan</th>
                <th className="p-4">Nama Kejuaraan / Prestasi</th>
                <th className="p-4">Tingkat</th>
                <th className="p-4">Deskripsi Pencapaian</th>
                {role !== 'SISWA' && <th className="p-4 text-center w-28">Email Orangtua</th>}
                {role === 'ADMIN' && <th className="p-4 text-center w-16">Hapus</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredAchievements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-500 italic">
                    Belum ada rekaman prestasi siswa terdaftar.
                  </td>
                </tr>
              ) : (
                filteredAchievements.map((ac, idx) => (
                  <tr key={ac.id} className="hover:bg-slate-800/20 transition duration-100">
                    <td className="p-4 text-center font-semibold text-slate-500">{idx + 1}</td>
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">{ac.studentName}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">NISN: {ac.nisn}</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 text-[10px] font-bold text-teal-400 bg-teal-500/10 rounded border border-teal-500/10">
                        {ac.class}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-400">{ac.date}</td>
                    <td className="p-4 font-bold text-white leading-normal max-w-[200px]">{ac.achievementName}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/15 rounded text-[10px] font-bold">
                        {ac.level}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 leading-normal max-w-[200px]" title={ac.description}>{ac.description}</td>
                    {role !== 'SISWA' && (
                      <td className="p-4 text-center">
                        <button
                          onClick={() => {
                            onSendAchievementEmail(ac.id);
                            toast.success('Pesan notifikasi terkait prestasi siswa berhasil dikirimkan ke email orangtua!');
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700/60 rounded-lg transition text-[10px] font-bold uppercase"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Kirim</span>
                        </button>
                      </td>
                    )}
                    {role === 'ADMIN' && (
                      <td className="p-4 text-center">
                        <button
                          onClick={async () => {
                            const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus data prestasi ini?', {
                              title: 'Hapus Laporan Prestasi',
                              type: 'danger'
                            });
                            if (confirmed) {
                              onDeleteAchievement(ac.id);
                            }
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: ADD RECORD */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {activeMenu === 'kasus' ? 'Catat Pelanggaran Baru' : 'Catat Prestasi Baru'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {/* Student Dropdown */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Pilih Siswa *</label>
                <select
                  required
                  value={selectedStudentNisn}
                  onChange={(e) => setSelectedStudentNisn(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold text-xs"
                >
                  <option value="">-- Pilih Siswa Terdaftar --</option>
                  {students.map(student => (
                    <option key={student.nisn} value={student.nisn}>
                      {student.name} ({student.class})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Tanggal Kejadian / Penghargaan *</label>
                <input
                  type="date"
                  required
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold font-mono"
                />
              </div>

              {activeMenu === 'kasus' ? (
                // --- CASE SPECIFIC FIELDS ---
                <>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Nama Laporan / Pelanggaran *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Terlambat masuk kelas selama 15 menit"
                      value={caseName}
                      onChange={(e) => setCaseName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Tingkat / Kategori Pelanggaran *</label>
                    <select
                      value={caseCategory}
                      onChange={(e) => setCaseCategory(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold text-xs"
                    >
                      <option value="Ringan">Ringan (Teguran, bimbingan wali kelas)</option>
                      <option value="Sedang">Sedang (Pemanggilan ortu, sanksi akademik)</option>
                      <option value="Berat">Berat (Skorsing, bimbingan khusus)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Tindakan / Resolusi Masalah *</label>
                    <textarea
                      required
                      placeholder="Masukkan resolusi yang diambil..."
                      rows={3}
                      value={caseResolution}
                      onChange={(e) => setCaseResolution(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              ) : (
                // --- ACHIEVEMENT SPECIFIC FIELDS ---
                <>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Nama Penghargaan / Kejuaraan *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Juara 1 Olimpiade Matematika"
                      value={achName}
                      onChange={(e) => setAchName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Tingkat Penghargaan *</label>
                    <select
                      value={achLevel}
                      onChange={(e) => setAchLevel(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold text-xs"
                    >
                      <option value="Sekolah">Sekolah</option>
                      <option value="Kecamatan">Kecamatan</option>
                      <option value="Kabupaten">Kabupaten / Kota</option>
                      <option value="Provinsi">Provinsi</option>
                      <option value="Nasional">Nasional</option>
                      <option value="Internasional">Internasional</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Deskripsi / Keterangan Prestasi *</label>
                    <textarea
                      required
                      placeholder="Detail kejuaraan yang diikuti..."
                      rows={3}
                      value={achDesc}
                      onChange={(e) => setAchDesc(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}

              {/* Submit / Cancel Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-lg border border-slate-700/60"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-lg"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
