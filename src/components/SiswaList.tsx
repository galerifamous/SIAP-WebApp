/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  UserPlus,
  Search,
  Filter,
  FileSpreadsheet,
  FileDown,
  Trash2,
  Edit3,
  X,
  Camera,
  Check,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Student } from '../types';
import { downloadFile, convertToCSV, printToPDF } from '../utils/export';

interface SiswaListProps {
  students: Student[];
  onAddStudent: (student: Student) => void;
  onAddStudentsBulk: (students: Student[]) => void;
  onEditStudent: (nisn: string, updated: Student) => void;
  onDeleteStudent: (nisn: string) => void;
  schoolName: string;
  academicYear: string;
  semester: string;
  availableClasses: string[];
  role: 'ADMIN' | 'GURU' | 'SISWA';
}

export default function SiswaList({
  students,
  onAddStudent,
  onAddStudentsBulk,
  onEditStudent,
  onDeleteStudent,
  schoolName,
  academicYear,
  semester,
  availableClasses,
  role
}: SiswaListProps) {
  // Navigation & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nisn: '',
    name: '',
    class: availableClasses[0] || 'IX-A',
    pob: '',
    dob: '',
    gender: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    parentName: '',
    parentEmail: '',
    address: '',
    photoUrl: '',
    savings: 0,
    cashBill: 0,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.nisn.includes(searchQuery) ||
                          student.parentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter ? student.class === classFilter : true;
    return matchesSearch && matchesClass;
  });

  // Export all students to Excel (CSV)
  const handleExportExcel = () => {
    const headers = [
      'NISN',
      'Nama Siswa',
      'Kelas',
      'Tempat Lahir',
      'Tanggal Lahir',
      'Jenis Kelamin',
      'Nama Orangtua',
      'Email Orangtua',
      'Alamat',
      'Tabungan',
      'Tagihan Uang Kas'
    ];
    const csvContent = convertToCSV(
      filteredStudents,
      headers,
      ['nisn', 'name', 'class', 'pob', 'dob', 'gender', 'parentName', 'parentEmail', 'address', 'savings', 'cashBill']
    );
    downloadFile(csvContent, `Data_Siswa_${classFilter || 'Semua'}_${academicYear.replace('/', '-')}.csv`, 'text/csv;charset=utf-8;');
  };

  // Export template for bulk upload
  const handleDownloadTemplate = () => {
    const headers = [
      'NISN',
      'Nama Siswa',
      'Kelas',
      'Tempat Lahir',
      'Tanggal Lahir (YYYY-MM-DD)',
      'Jenis Kelamin (Laki-laki/Perempuan)',
      'Nama Orangtua',
      'Email Orangtua',
      'Alamat'
    ];
    const templateRows = [
      ['1112223334', 'Ahmad Dani', 'IX-A', 'Bandung', '2011-05-12', 'Laki-laki', 'Dani Hamdan', 'danihamdan@gmail.com', 'Jl. Sukajadi No. 12'],
      ['4445556667', 'Siti Rahma', 'IX-A', 'Jakarta', '2011-10-22', 'Perempuan', 'Rahmat Sutrisno', 'rahmat@gmail.com', 'Jl. Kemang Raya No. 4, Jakarta Selatan']
    ];
    const csvContent = [headers.join(','), ...templateRows.map(row => row.map(v => `"${v.replace(/"/g, '""')}"`).join(','))].join('\n');
    downloadFile(csvContent, 'Template_Import_Siswa.csv', 'text/csv;charset=utf-8;');
  };

  // Import bulk data
  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/);
        const importedStudents: Student[] = [];

        // Robust CSV line parser supporting quoted values with commas
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        // Skip headers (line 0)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cells = parseCSVLine(line);

          if (cells.length >= 3) { // Minimum requirement: NISN, Nama, Kelas
            importedStudents.push({
              nisn: cells[0],
              name: cells[1],
              class: cells[2] || 'IX-A',
              pob: cells[3] || 'Jakarta',
              dob: cells[4] || '2011-01-01',
              gender: (cells[5] === 'Perempuan' ? 'Perempuan' : 'Laki-laki'),
              parentName: cells[6] || 'Nama Orangtua',
              parentEmail: cells[7] || 'ortu@gmail.com',
              address: cells[8] || 'Alamat',
              photoUrl: '', // Initial empty photo
              savings: 0,
              cashBill: 0,
            });
          }
        }

        if (importedStudents.length > 0) {
          onAddStudentsBulk(importedStudents);
          alert(`Berhasil mengimpor ${importedStudents.length} data siswa secara masal! Data tersimpan di sistem drive SIAP.`);
        } else {
          alert('Format data di file template tidak valid.');
        }
      } catch (err) {
        alert('Gagal membaca file CSV template.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Export to PDF
  const handleExportPDF = () => {
    const headers = ['No', 'NISN', 'Nama Lengkap', 'Kelas', 'L/P', 'Nama Orangtua', 'Email Orangtua', 'Tabungan', 'Tagihan'];
    const rows = filteredStudents.map((s, idx) => [
      String(idx + 1),
      s.nisn,
      s.name,
      s.class,
      s.gender === 'Laki-laki' ? 'L' : 'P',
      s.parentName,
      s.parentEmail,
      `Rp ${s.savings.toLocaleString('id-ID')}`,
      `Rp ${s.cashBill.toLocaleString('id-ID')}`
    ]);
    printToPDF(`Laporan Data Lengkap Siswa`, headers, rows, schoolName, academicYear, semester);
  };

  // Convert uploaded image to Base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditing = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (isEditing) {
        setEditingStudent(prev => prev ? { ...prev, photoUrl: base64String } : null);
      } else {
        setFormData(prev => ({ ...prev, photoUrl: base64String }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit new student form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate NISN uniqueness
    if (students.some(s => s.nisn === formData.nisn)) {
      setFormError('Siswa dengan NISN tersebut sudah terdaftar di database.');
      return;
    }

    if (!formData.nisn.trim() || !formData.name.trim() || !formData.parentEmail.trim()) {
      setFormError('Harap lengkapi field wajib (NISN, Nama, Email Orangtua).');
      return;
    }

    onAddStudent({
      ...formData,
      savings: Number(formData.savings) || 0,
      cashBill: Number(formData.cashBill) || 0
    });

    // Reset Form
    setFormData({
      nisn: '',
      name: '',
      class: availableClasses[0] || 'IX-A',
      pob: '',
      dob: '',
      gender: 'Laki-laki',
      parentName: '',
      parentEmail: '',
      address: '',
      photoUrl: '',
      savings: 0,
      cashBill: 0,
    });
    setShowAddModal(false);
  };

  // Submit edit student form
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    onEditStudent(editingStudent.nisn, {
      ...editingStudent,
      savings: Number(editingStudent.savings) || 0,
      cashBill: Number(editingStudent.cashBill) || 0
    });
    setEditingStudent(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 selection:bg-emerald-500 selection:text-white font-sans">
      {/* Header and Actions bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Database Lengkap Siswa</h2>
          <p className="text-slate-400 text-xs mt-1">Kelola seluruh data siswa, unggah foto, dan lakukan ekspor/impor masal</p>
        </div>

        {role === 'ADMIN' && (
          <div className="flex flex-wrap gap-2.5">
            {/* Import Bulk Button */}
            <label className="cursor-pointer bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-2 transition duration-150">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Impor Masal</span>
              <input
                type="file"
                accept=".csv"
                ref={bulkFileInputRef}
                onChange={handleBulkImport}
                className="hidden"
              />
            </label>

            {/* Template Download */}
            <button
              onClick={handleDownloadTemplate}
              className="bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-2 transition duration-150"
              title="Unduh template Excel (CSV) untuk input masal"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Unduh Template</span>
            </button>

            {/* Add Student Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-2 transition duration-150 shadow-md shadow-emerald-500/10"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Siswa</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and search utilities */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari siswa berdasarkan nama, NISN, atau wali murid..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/40 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-300 text-xs focus:outline-none focus:border-emerald-500/80 transition-all placeholder:text-slate-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 text-slate-500 text-xs flex items-center gap-1 font-semibold">
            <Filter className="w-3.5 h-3.5" /> Filter Kelas:
          </div>
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

          {/* Export buttons */}
          <button
            onClick={handleExportExcel}
            className="p-2.5 bg-slate-800 hover:bg-slate-700/80 text-emerald-400 border border-slate-700/60 rounded-xl transition duration-150"
            title="Ekspor Excel (CSV)"
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

      {/* Students Data Grid/Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/10">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider">
              <th className="p-4 w-12 text-center">Foto</th>
              <th className="p-4">NISN / Nama Siswa</th>
              <th className="p-4">Rombel</th>
              <th className="p-4">Jenis Kelamin</th>
              <th className="p-4">TTL</th>
              <th className="p-4">Orangtua / Wali</th>
              <th className="p-4 text-right">Tabungan</th>
              <th className="p-4 text-right">Tagihan Kas</th>
              {role === 'ADMIN' && <th className="p-4 text-center w-24">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-10 text-center text-slate-500 italic">
                  Data siswa tidak ditemukan atau database masih kosong.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.nisn} className="hover:bg-slate-800/20 text-slate-300 transition duration-100">
                  <td className="p-4 text-center">
                    {student.photoUrl ? (
                      <img
                        src={student.photoUrl}
                        alt={student.name}
                        className="w-10 h-10 object-cover rounded-full border border-slate-700 mx-auto bg-slate-800"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto">
                        <Camera className="w-4 h-4 text-slate-500" />
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-white text-sm">{student.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">NISN: {student.nisn}</p>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 text-[10px] font-bold text-teal-400 bg-teal-500/10 rounded-lg border border-teal-500/10">
                      {student.class}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-slate-400">{student.gender}</td>
                  <td className="p-4">
                    <p className="text-slate-300">{student.pob}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{student.dob}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-slate-300">{student.parentName}</p>
                    <p className="text-[10px] text-slate-500 truncate max-w-[150px]" title={student.parentEmail}>
                      {student.parentEmail}
                    </p>
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-emerald-400">
                    Rp {student.savings.toLocaleString('id-ID')}
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-rose-400">
                    Rp {student.cashBill.toLocaleString('id-ID')}
                  </td>
                  {role === 'ADMIN' && (
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setEditingStudent(student)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-lg transition"
                          title="Edit Data Siswa"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Apakah Anda yakin ingin menghapus siswa ${student.name} dari database?`)) {
                              onDeleteStudent(student.nisn);
                            }
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 rounded-lg transition"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: ADD STUDENT MANUALLY */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tambah Siswa Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="overflow-y-auto p-6 space-y-4 flex-1 text-xs">
              {formError && (
                <div className="flex gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl mb-4">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* NISN */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">NISN (10 Digit Wajib) *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="Masukkan 10 digit NISN"
                    value={formData.nisn}
                    onChange={(e) => setFormData(prev => ({ ...prev, nisn: e.target.value.replace(/\D/g, '') }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Nama Lengkap */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nama Lengkap Siswa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan nama lengkap siswa"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Rombel / Kelas */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Kelas (Rombongan Belajar) *</label>
                  <select
                    value={formData.class}
                    onChange={(e) => setFormData(prev => ({ ...prev, class: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    {availableClasses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Jenis Kelamin */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Jenis Kelamin *</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="gender"
                        checked={formData.gender === 'Laki-laki'}
                        onChange={() => setFormData(prev => ({ ...prev, gender: 'Laki-laki' }))}
                        className="accent-emerald-500"
                      />
                      <span>Laki-laki</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="gender"
                        checked={formData.gender === 'Perempuan'}
                        onChange={() => setFormData(prev => ({ ...prev, gender: 'Perempuan' }))}
                        className="accent-emerald-500"
                      />
                      <span>Perempuan</span>
                    </label>
                  </div>
                </div>

                {/* Tempat Lahir */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    placeholder="Contoh: Jakarta"
                    value={formData.pob}
                    onChange={(e) => setFormData(prev => ({ ...prev, pob: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Tanggal Lahir */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>

                {/* Nama Orangtua */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nama Orangtua / Wali *</label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan nama orangtua/wali murid"
                    value={formData.parentName}
                    onChange={(e) => setFormData(prev => ({ ...prev, parentName: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Email Orangtua */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email Orangtua (Untuk Notifikasi) *</label>
                  <input
                    type="email"
                    required
                    placeholder="contoh@gmail.com"
                    value={formData.parentEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, parentEmail: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Tabungan */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tabungan Siswa (Rp)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.savings || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, savings: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Tagihan Kas */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tagihan Uang Kas (Rp)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.cashBill || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, cashBill: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Alamat */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Alamat Lengkap</label>
                <textarea
                  placeholder="Masukkan alamat rumah lengkap siswa..."
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Photo Upload Area */}
              <div>
                <label className="block text-slate-400 font-semibold mb-2">Unggah Foto Siswa</label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 text-center cursor-pointer transition bg-slate-950/20"
                  >
                    <Camera className="w-5 h-5 mx-auto text-slate-500 mb-1" />
                    <span className="text-[10px] text-slate-400 font-bold">Pilih file foto JPG/PNG</span>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={(e) => handlePhotoUpload(e, false)}
                      className="hidden"
                    />
                  </div>
                  {formData.photoUrl && (
                    <div className="relative w-16 h-16 rounded-xl border border-slate-700 overflow-hidden bg-slate-800">
                      <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-rose-500/80 text-white rounded-full hover:bg-rose-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-[9px] text-slate-500 mt-1 italic flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" /> Foto akan disimpan langsung ke cloud database Google Drive SIAP (Base64 storage).
                </p>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800 bg-slate-950/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700/80 text-slate-300 font-bold rounded-lg border border-slate-700/40"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-lg shadow-emerald-500/10"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STUDENT */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Edit Data Siswa ({editingStudent.name})</h3>
              <button onClick={() => setEditingStudent(null)} className="p-1 text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="overflow-y-auto p-6 space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* NISN */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">NISN (Tidak Dapat Diubah)</label>
                  <input
                    type="text"
                    disabled
                    value={editingStudent.nisn}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-2.5 text-slate-500 font-mono font-bold cursor-not-allowed"
                  />
                </div>

                {/* Nama Lengkap */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nama Lengkap Siswa *</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.name}
                    onChange={(e) => setEditingStudent(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Rombel / Kelas */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Kelas (Rombongan Belajar) *</label>
                  <select
                    value={editingStudent.class}
                    onChange={(e) => setEditingStudent(prev => prev ? { ...prev, class: e.target.value } : null)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    {availableClasses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Jenis Kelamin */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Jenis Kelamin *</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="edit-gender"
                        checked={editingStudent.gender === 'Laki-laki'}
                        onChange={() => setEditingStudent(prev => prev ? { ...prev, gender: 'Laki-laki' } : null)}
                        className="accent-emerald-500"
                      />
                      <span>Laki-laki</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="edit-gender"
                        checked={editingStudent.gender === 'Perempuan'}
                        onChange={() => setEditingStudent(prev => prev ? { ...prev, gender: 'Perempuan' } : null)}
                        className="accent-emerald-500"
                      />
                      <span>Perempuan</span>
                    </label>
                  </div>
                </div>

                {/* Tempat Lahir */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={editingStudent.pob || ''}
                    onChange={(e) => setEditingStudent(prev => prev ? { ...prev, pob: e.target.value } : null)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Tanggal Lahir */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={editingStudent.dob || ''}
                    onChange={(e) => setEditingStudent(prev => prev ? { ...prev, dob: e.target.value } : null)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>

                {/* Nama Orangtua */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nama Orangtua / Wali *</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.parentName}
                    onChange={(e) => setEditingStudent(prev => prev ? { ...prev, parentName: e.target.value } : null)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Email Orangtua */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email Orangtua (Untuk Notifikasi) *</label>
                  <input
                    type="email"
                    required
                    value={editingStudent.parentEmail}
                    onChange={(e) => setEditingStudent(prev => prev ? { ...prev, parentEmail: e.target.value } : null)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Tabungan */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tabungan Siswa (Rp)</label>
                  <input
                    type="number"
                    value={editingStudent.savings}
                    onChange={(e) => setEditingStudent(prev => prev ? { ...prev, savings: Number(e.target.value) } : null)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Tagihan Kas */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tagihan Uang Kas (Rp)</label>
                  <input
                    type="number"
                    value={editingStudent.cashBill}
                    onChange={(e) => setEditingStudent(prev => prev ? { ...prev, cashBill: Number(e.target.value) } : null)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Alamat */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  value={editingStudent.address || ''}
                  onChange={(e) => setEditingStudent(prev => prev ? { ...prev, address: e.target.value } : null)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Photo Upload Area */}
              <div>
                <label className="block text-slate-400 font-semibold mb-2">Perbarui Foto Siswa</label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 text-center cursor-pointer transition bg-slate-950/20"
                  >
                    <Camera className="w-5 h-5 mx-auto text-slate-500 mb-1" />
                    <span className="text-[10px] text-slate-400 font-bold">Ganti Foto JPG/PNG</span>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={(e) => handlePhotoUpload(e, true)}
                      className="hidden"
                    />
                  </div>
                  {editingStudent.photoUrl && (
                    <div className="relative w-16 h-16 rounded-xl border border-slate-700 overflow-hidden bg-slate-800">
                      <img src={editingStudent.photoUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => setEditingStudent(prev => prev ? { ...prev, photoUrl: '' } : null)}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-rose-500/80 text-white rounded-full hover:bg-rose-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800 bg-slate-950/10">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700/80 text-slate-300 font-bold rounded-lg border border-slate-700/40"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-lg shadow-emerald-500/10"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
