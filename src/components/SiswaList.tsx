/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { toast, showConfirm } from '../utils/dialog';
import {
  Download,
  Upload,
  UserPlus,
  Search,
  Filter,
  FileSpreadsheet,
  FileDown,
  Printer,
  Trash2,
  Edit3,
  X,
  Camera,
  Check,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Student, Teacher, ClassStaff } from '../types';
import { downloadFile, convertToCSV, printToPDF, downloadToPDF } from '../utils/export';
import * as XLSX from 'xlsx';

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
  teachers?: Teacher[];
  classStaffs?: ClassStaff[];
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
  role,
  teachers,
  classStaffs
}: SiswaListProps) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  React.useEffect(() => {
    const handleThemeChange = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  // Navigation & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState(() => {
    return (role === 'GURU' && availableClasses && availableClasses.length > 0)
      ? availableClasses[0]
      : '';
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nisn: '',
    name: '',
    class: (availableClasses && availableClasses[0]) || 'IX-A',
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
  const filteredStudents = (students || []).filter(student => {
    if (!student) return false;
    const name = student.name || '';
    const nisn = student.nisn || '';
    const parentName = student.parentName || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          nisn.includes(searchQuery) ||
                          parentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter ? student.class === classFilter : true;
    return matchesSearch && matchesClass;
  }).sort((a, b) => {
    const classA = (a.class || '').toLowerCase();
    const classB = (b.class || '').toLowerCase();
    if (classA !== classB) {
      return classA.localeCompare(classB, 'id');
    }
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    return nameA.localeCompare(nameB, 'id');
  });

  // Export all students to Excel with official school letterhead header and logo status
  const handleExportExcel = () => {
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

    const headers = [
      'NISN',
      'Nama Siswa',
      'Kelas',
      'Tempat Lahir',
      'Tanggal Lahir',
      'Jenis Kelamin',
      'Nama Orangtua',
      'Email Orangtua',
      'Alamat'
    ];

    const logoStatus = logoUrl ? 'TERUNGGAH & AKTIF' : 'BELUM DIUNGGAH';
    const govLogoStatus = govLogoUrl ? 'TERUNGGAH & AKTIF' : 'BELUM DIUNGGAH';
    const headerRows = [
      ['KEMENTERIAN AGAMA REPUBLIK INDONESIA'],
      [schoolName],
      [schoolAddress || 'Alamat lengkap instansi sekolah belum disetting.'],
      [`STATUS LOGO INSTANSI/DINAS: ${govLogoStatus} | STATUS LOGO MADRASAH: ${logoStatus}`],
      [],
      [`LAPORAN DATA LENGKAP SISWA - KELAS ${classFilter || 'SEMUA KELAS'}`],
      [`Tahun Pelajaran: ${academicYear} | Semester: ${semester}`],
      [],
      headers
    ];

    const dataRows = filteredStudents.map(s => [
      s.nisn,
      s.name,
      s.class,
      s.pob || '-',
      s.dob || '-',
      s.gender || '-',
      s.parentName || '-',
      s.parentEmail || '-',
      s.address || '-'
    ]);

    const aoa = [...headerRows, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Set nice column widths
    ws['!cols'] = [
      { wch: 15 }, // NISN
      { wch: 28 }, // Nama Siswa
      { wch: 10 }, // Kelas
      { wch: 18 }, // Tempat Lahir
      { wch: 15 }, // Tanggal Lahir
      { wch: 15 }, // Jenis Kelamin
      { wch: 22 }, // Nama Orangtua
      { wch: 25 }, // Email Orangtua
      { wch: 35 }  // Alamat
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
    XLSX.writeFile(wb, `Data_Siswa_${classFilter || 'Semua'}_${academicYear.replace('/', '-')}.xlsx`);
  };

  // Export template for bulk upload (using real XLSX with custom column widths so it's beautifully organized)
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

    const aoa = [headers, ...templateRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Set neat, fixed column widths (paten) so user doesn't need to resize manually
    ws['!cols'] = [
      { wch: 15 }, // NISN
      { wch: 28 }, // Nama Siswa
      { wch: 10 }, // Kelas
      { wch: 15 }, // Tempat Lahir
      { wch: 25 }, // Tanggal Lahir
      { wch: 32 }, // Jenis Kelamin
      { wch: 22 }, // Nama Orangtua
      { wch: 25 }, // Email Orangtua
      { wch: 35 }  // Alamat
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
    XLSX.writeFile(wb, 'Template_Import_Siswa.xlsx');
  };

  // Import bulk data (supports both XLSX and CSV)
  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isXlsx = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedStudents: Student[] = [];

        if (isXlsx) {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          for (let i = 1; i < json.length; i++) {
            const cells = json[i];
            if (!cells || cells.length < 2) continue;

            const cleanCell = (val: any) => val !== undefined && val !== null ? String(val).trim() : '';

            const nisn = cleanCell(cells[0]);
            const name = cleanCell(cells[1]);
            const className = cleanCell(cells[2]);

            if (nisn && name) {
              importedStudents.push({
                nisn,
                name,
                class: className || 'IX-A',
                pob: cleanCell(cells[3]) || 'Jakarta',
                dob: cleanCell(cells[4]) || '2011-01-01',
                gender: (cleanCell(cells[5]).toLowerCase().includes('perempuan') || cleanCell(cells[5]) === 'Perempuan' ? 'Perempuan' : 'Laki-laki'),
                parentName: cleanCell(cells[6]) || 'Nama Orangtua',
                parentEmail: cleanCell(cells[7]) || 'ortu@gmail.com',
                address: cleanCell(cells[8]) || 'Alamat',
                photoUrl: '',
                savings: 0,
                cashBill: 0,
              });
            }
          }
        } else {
          const text = event.target?.result as string;
          const lines = text.split(/\r?\n/);

          // Dynamic delimiter detection
          let startIdx = 1; // Default to skip header at line 0
          let delimiter = ',';
          const firstLine = lines[0]?.trim() || '';

          if (firstLine.startsWith('sep=')) {
            delimiter = firstLine.split('=')[1] || ';';
            startIdx = 2; // Skip both sep= line (line 0) and header (line 1)
          } else {
            if (firstLine.includes(';')) {
              delimiter = ';';
            }
          }

          const parseCSVLine = (line: string, delim: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === delim && !inQuotes) {
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          };

          const cleanCell = (c: string) => c ? c.trim().replace(/\r/g, '').replace(/^"|"$/g, '') : '';

          for (let i = startIdx; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cells = parseCSVLine(line, delimiter);

            if (cells.length >= 3) {
              importedStudents.push({
                nisn: cleanCell(cells[0]),
                name: cleanCell(cells[1]),
                class: cleanCell(cells[2]) || 'IX-A',
                pob: cleanCell(cells[3]) || 'Jakarta',
                dob: cleanCell(cells[4]) || '2011-01-01',
                gender: (cleanCell(cells[5]) === 'Perempuan' ? 'Perempuan' : 'Laki-laki'),
                parentName: cleanCell(cells[6]) || 'Nama Orangtua',
                parentEmail: cleanCell(cells[7]) || 'ortu@gmail.com',
                address: cleanCell(cells[8]) || 'Alamat',
                photoUrl: '',
                savings: 0,
                cashBill: 0,
              });
            }
          }
        }

        if (importedStudents.length > 0) {
          onAddStudentsBulk(importedStudents);
          toast.success(`Berhasil mengimpor ${importedStudents.length} data siswa secara masal! Data tersimpan di sistem drive SIAP.`);
        } else {
          toast.error('Format data di file template tidak valid.');
        }
      } catch (err) {
        toast.error('Gagal membaca file template.');
      }
    };

    if (isXlsx) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  // Export to PDF
  const handleExportPDF = () => {
    let waliKelasName = '';
    if (classFilter && classStaffs && teachers) {
      const staff = classStaffs.find(cs => cs.classId === classFilter);
      if (staff) {
        const teacher = teachers.find(t => t.nuptk === staff.waliKelasNuptk);
        if (teacher) {
          waliKelasName = teacher.name;
        }
      }
    }

    const headers = ['No', 'NISN', 'Nama Lengkap', 'Kelas', 'L/P', 'Nama Orangtua', 'Email Orangtua'];
    const rows = filteredStudents.map((s, idx) => [
      String(idx + 1),
      s.nisn,
      s.name,
      s.class,
      s.gender === 'Laki-laki' ? 'L' : 'P',
      s.parentName,
      s.parentEmail
    ]);
    printToPDF(`Laporan Data Lengkap Siswa`, headers, rows, schoolName, academicYear, semester, classFilter || undefined, waliKelasName || undefined);
  };

  // Download PDF directly
  const handleDownloadPDF = () => {
    let waliKelasName = '';
    if (classFilter && classStaffs && teachers) {
      const staff = classStaffs.find(cs => cs.classId === classFilter);
      if (staff) {
        const teacher = teachers.find(t => t.nuptk === staff.waliKelasNuptk);
        if (teacher) {
          waliKelasName = teacher.name;
        }
      }
    }

    const headers = ['No', 'NISN', 'Nama Lengkap', 'Kelas', 'L/P', 'Nama Orangtua', 'Email Orangtua'];
    const rows = filteredStudents.map((s, idx) => [
      String(idx + 1),
      s.nisn,
      s.name,
      s.class,
      s.gender === 'Laki-laki' ? 'L' : 'P',
      s.parentName,
      s.parentEmail
    ]);
    downloadToPDF(
      `Laporan Data Lengkap Siswa`,
      headers,
      rows,
      `Data_Siswa_${academicYear.replace('/', '-')}_${classFilter || 'Semua'}.pdf`,
      schoolName,
      academicYear,
      semester,
      classFilter || undefined,
      waliKelasName || undefined
    );
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
      class: (availableClasses && availableClasses[0]) || 'IX-A',
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
    <div className={`p-6 selection:bg-emerald-500 selection:text-white font-sans rounded-2xl border transition duration-300 ${
      isDark ? 'bg-[#121e15] border-[#17221c]' : 'bg-white border-[#cbd5ce]'
    }`}>
      {/* Header and Actions bar */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 mb-6 ${
        isDark ? 'border-[#17221c]' : 'border-[#cbd5ce]'
      }`}>
        <div>
          <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>Database Lengkap Siswa</h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Kelola seluruh data siswa, unggah foto, dan lakukan ekspor/impor masal</p>
        </div>

        {role === 'ADMIN' && (
          <div className="flex flex-wrap gap-2.5">
            {/* Import Bulk Button */}
            <label className={`cursor-pointer font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-2 transition duration-150 border ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700/80 border-slate-700/60 text-slate-200' 
                : 'bg-slate-100 hover:bg-slate-200 border-[#cbd5ce] text-slate-700'
            }`}>
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Impor Masal</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                ref={bulkFileInputRef}
                onChange={handleBulkImport}
                className="hidden"
              />
            </label>

            {/* Template Download */}
            <button
              onClick={handleDownloadTemplate}
              className={`font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-2 transition duration-150 border ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700/80 border-slate-700/60 text-slate-200' 
                  : 'bg-slate-100 hover:bg-slate-200 border-[#cbd5ce] text-slate-700'
              }`}
              title="Unduh template Excel (.xlsx) untuk input masal"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Unduh Template</span>
            </button>

            {/* Add Student Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-2 transition duration-150 shadow-md shadow-emerald-500/10 cursor-pointer"
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
            className={`w-full rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-emerald-500/80 transition-all border ${
              isDark 
                ? 'bg-slate-950/40 border-slate-800 text-slate-300 placeholder:text-slate-600' 
                : 'bg-slate-50 border-[#cbd5ce] text-slate-800 placeholder:text-slate-400'
            }`}
          />
        </div>

        {role !== 'GURU' && (
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 text-slate-500 text-xs flex items-center gap-1 font-semibold">
              <Filter className="w-3.5 h-3.5" /> Filter Kelas:
            </div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className={`rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:border-emerald-500/80 border ${
                isDark 
                  ? 'bg-[#121e15] border-slate-800 text-slate-300' 
                  : 'bg-white border-[#cbd5ce] text-slate-700'
              }`}
            >
              <option value="" className={isDark ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-850"}>Semua Kelas</option>
              {(availableClasses || []).map(c => (
                <option key={c} value={c} className={isDark ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-850"}>{c}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* Export buttons */}
          <button
            onClick={handleExportExcel}
            className={`p-2.5 rounded-xl transition duration-150 border ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700/80 text-emerald-400 border-slate-700/60' 
                : 'bg-slate-50 hover:bg-slate-100 text-emerald-600 border-[#cbd5ce]'
            }`}
            title="Unduh Excel (.xlsx) Langsung"
          >
            <FileSpreadsheet className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={handleDownloadPDF}
            className={`p-2.5 rounded-xl transition duration-150 border ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700/80 text-sky-400 border-slate-700/60' 
                : 'bg-slate-50 hover:bg-slate-100 text-sky-600 border-[#cbd5ce]'
            }`}
            title="Unduh PDF (.pdf) Langsung"
          >
            <FileDown className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={handleExportPDF}
            className={`p-2.5 rounded-xl transition duration-150 border ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700/80 text-rose-400 border-slate-700/60' 
                : 'bg-slate-50 hover:bg-slate-100 text-rose-600 border-[#cbd5ce]'
            }`}
            title="Cetak Dokumen PDF / Pratinjau"
          >
            <Printer className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Students Data Grid/Table */}
      <div className={`overflow-x-auto rounded-xl border transition duration-300 ${
        isDark ? 'border-[#17221c] bg-[#0c130f]' : 'border-[#cbd5ce] bg-slate-50/50'
      }`}>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className={`font-bold uppercase tracking-wider border-b transition ${
              isDark ? 'bg-slate-950/40 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-[#cbd5ce]'
            }`}>
              <th className="p-4 w-12 text-center">Foto</th>
              <th className="p-4">NISN / Nama Siswa</th>
              <th className="p-4">Rombel</th>
              <th className="p-4">Jenis Kelamin</th>
              <th className="p-4">TTL</th>
              <th className="p-4">Orangtua / Wali</th>
              {role === 'ADMIN' && <th className="p-4 text-center w-24">Aksi</th>}
            </tr>
          </thead>
          <tbody className={`divide-y transition ${isDark ? 'divide-slate-800/60' : 'divide-[#cbd5ce]/50'}`}>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={role === 'ADMIN' ? 7 : 6} className="p-10 text-center text-slate-500 italic">
                  Data siswa tidak ditemukan atau database masih kosong.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.nisn} className={`transition duration-100 ${
                  isDark ? 'hover:bg-slate-800/20 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                }`}>
                  <td className="p-4 text-center">
                    {student.photoUrl ? (
                      <img
                        src={student.photoUrl}
                        alt={student.name}
                        className={`w-10 h-10 object-cover rounded-full border mx-auto ${
                          isDark ? 'border-slate-700 bg-slate-800' : 'border-[#cbd5ce] bg-white'
                        }`}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full border flex items-center justify-center mx-auto ${
                        isDark ? 'border-slate-700 bg-slate-800' : 'border-[#cbd5ce] bg-white'
                      }`}>
                        <Camera className="w-4 h-4 text-slate-500" />
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{student.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">NISN: {student.nisn}</p>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 text-[10px] font-bold text-teal-500 dark:text-teal-400 bg-teal-500/10 rounded-lg border border-teal-500/10">
                      {student.class}
                    </span>
                  </td>
                  <td className={`p-4 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{student.gender}</td>
                  <td className="p-4">
                    <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>{student.pob}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{student.dob}</p>
                  </td>
                  <td className="p-4">
                    <p className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{student.parentName}</p>
                    <p className="text-[10px] text-slate-500 truncate max-w-[150px]" title={student.parentEmail}>
                      {student.parentEmail}
                    </p>
                  </td>
                  {role === 'ADMIN' && (
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setEditingStudent(student)}
                          className={`p-1.5 border rounded-lg transition ${
                            isDark 
                              ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700' 
                              : 'bg-slate-50 hover:bg-slate-100 text-emerald-600 border-[#cbd5ce]'
                          }`}
                          title="Edit Data Siswa"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            const confirmed = await showConfirm(`Apakah Anda yakin ingin menghapus siswa ${student.name} dari database?`, {
                              title: "Hapus Siswa",
                              type: "danger"
                            });
                            if (confirmed) {
                              onDeleteStudent(student.nisn);
                            }
                          }}
                          className={`p-1.5 border rounded-lg transition ${
                            isDark 
                              ? 'bg-slate-800 hover:bg-slate-700 text-rose-400 border-slate-700' 
                              : 'bg-slate-50 hover:bg-slate-100 text-rose-600 border-[#cbd5ce]'
                          }`}
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
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border transition duration-300 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#cbd5ce]'
          }`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center transition ${
              isDark ? 'border-slate-800 bg-slate-950/20' : 'border-[#cbd5ce] bg-slate-50'
            }`}>
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>Tambah Siswa Baru</h3>
              <button onClick={() => setShowAddModal(false)} className={`p-1 transition ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}>
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
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>NISN (10 Digit Wajib) *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="Masukkan 10 digit NISN"
                    value={formData.nisn}
                    onChange={(e) => setFormData(prev => ({ ...prev, nisn: e.target.value.replace(/\D/g, '') }))}
                    className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-[#cbd5ce] text-slate-800'
                    }`}
                  />
                </div>

                {/* Nama Lengkap */}
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Nama Lengkap Siswa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan nama lengkap siswa"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-[#cbd5ce] text-slate-800'
                    }`}
                  />
                </div>

                {/* Rombel / Kelas */}
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Kelas (Rombongan Belajar) *</label>
                  <select
                    value={formData.class}
                    onChange={(e) => setFormData(prev => ({ ...prev, class: e.target.value }))}
                    className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 font-semibold border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-[#cbd5ce] text-slate-800'
                    }`}
                  >
                    {(availableClasses || []).map(c => (
                      <option key={c} value={c} className={isDark ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-850"}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Jenis Kelamin */}
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Jenis Kelamin *</label>
                  <div className="flex gap-4 mt-2">
                    <label className={`flex items-center gap-2 cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-750'}`}>
                      <input
                        type="radio"
                        name="gender"
                        checked={formData.gender === 'Laki-laki'}
                        onChange={() => setFormData(prev => ({ ...prev, gender: 'Laki-laki' }))}
                        className="accent-emerald-500"
                      />
                      <span>Laki-laki</span>
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-750'}`}>
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
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tempat Lahir</label>
                  <input
                    type="text"
                    placeholder="Contoh: Jakarta"
                    value={formData.pob}
                    onChange={(e) => setFormData(prev => ({ ...prev, pob: e.target.value }))}
                    className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-[#cbd5ce] text-slate-800'
                    }`}
                  />
                </div>

                {/* Tanggal Lahir */}
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                    className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 font-semibold border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-[#cbd5ce] text-slate-800'
                    }`}
                  />
                </div>

                {/* Nama Orangtua */}
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Nama Orangtua / Wali *</label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan nama orangtua/wali murid"
                    value={formData.parentName}
                    onChange={(e) => setFormData(prev => ({ ...prev, parentName: e.target.value }))}
                    className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-[#cbd5ce] text-slate-800'
                    }`}
                  />
                </div>

                {/* Email Orangtua */}
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Email Orangtua (Untuk Notifikasi) *</label>
                  <input
                    type="email"
                    required
                    placeholder="contoh@gmail.com"
                    value={formData.parentEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, parentEmail: e.target.value }))}
                    className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-[#cbd5ce] text-slate-800'
                    }`}
                  />
                </div>

              </div>

              {/* Alamat */}
              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Alamat Lengkap</label>
                <textarea
                  placeholder="Masukkan alamat rumah lengkap siswa..."
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-[#cbd5ce] text-slate-800'
                  }`}
                />
              </div>

              {/* Photo Upload Area */}
              <div>
                <label className={`block font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Unggah Foto Siswa</label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                      isDark 
                        ? 'border-slate-800 hover:border-emerald-500/50 bg-slate-950/20' 
                        : 'border-[#cbd5ce] hover:border-emerald-500/50 bg-slate-50'
                    }`}
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
                    <div className={`relative w-16 h-16 rounded-xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800' : 'border-[#cbd5ce] bg-white'}`}>
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
              <div className={`flex justify-end gap-2 pt-4 border-t transition ${
                isDark ? 'border-slate-800 bg-slate-950/10' : 'border-[#cbd5ce] bg-slate-50'
              }`}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-4 py-2 font-bold rounded-lg border transition ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-700/80 text-slate-300 border-slate-700/40' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-[#cbd5ce]'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-lg shadow-emerald-500/10 cursor-pointer"
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
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border transition duration-300 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#cbd5ce]'
          }`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center transition ${
              isDark ? 'border-slate-800 bg-slate-950/20' : 'border-[#cbd5ce] bg-slate-50'
            }`}>
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>Edit Data Siswa ({editingStudent.name})</h3>
              <button onClick={() => setEditingStudent(null)} className={`p-1 transition ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="overflow-y-auto p-6 space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* NISN */}
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>NISN (Tidak Dapat Diubah)</label>
                  <input
                    type="text"
                    disabled
                    value={editingStudent.nisn}
                    className={`w-full rounded-lg p-2.5 font-mono font-bold cursor-not-allowed border ${
                      isDark ? 'bg-slate-950/50 border-slate-800 text-slate-500' : 'bg-slate-100 border-[#cbd5ce] text-slate-400'
                    }`}
                  />
                </div>

                {/* Nama Lengkap */}
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Nama Lengkap Siswa *</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.name}
                    onChange={(e) => setEditingStudent(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-[#cbd5ce] text-slate-800'
                    }`}
                  />
                </div>

                {/* Rombel / Kelas */}
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Kelas (Rombongan Belajar) *</label>
                  <select
                    value={editingStudent.class}
                    onChange={(e) => setEditingStudent(prev => prev ? { ...prev, class: e.target.value } : null)}
                    className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 font-semibold border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-[#cbd5ce] text-slate-800'
                    }`}
                  >
                    {(availableClasses || []).map(c => (
                      <option key={c} value={c} className={isDark ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-850"}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Jenis Kelamin */}
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Jenis Kelamin *</label>
                  <div className="flex gap-4 mt-2">
                    <label className={`flex items-center gap-2 cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-750'}`}>
                      <input
                        type="radio"
                        name="edit-gender"
                        checked={editingStudent.gender === 'Laki-laki'}
                        onChange={() => setEditingStudent(prev => prev ? { ...prev, gender: 'Laki-laki' } : null)}
                        className="accent-emerald-500"
                      />
                      <span>Laki-laki</span>
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-750'}`}>
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
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tempat Lahir</label>
                  <input
                    type="text"
                    value={editingStudent.pob || ''}
                    onChange={(e) => setEditingStudent(prev => prev ? { ...prev, pob: e.target.value } : null)}
                    className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-[#cbd5ce] text-slate-800'
                    }`}
                  />
                </div>

                {/* Tanggal Lahir */}
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tanggal Lahir</label>
                  <input
                    type="date"
                    value={editingStudent.dob || ''}
                    onChange={(e) => setEditingStudent(prev => prev ? { ...prev, dob: e.target.value } : null)}
                    className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 font-semibold border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-[#cbd5ce] text-slate-800'
                    }`}
                  />
                </div>

                {/* Nama Orangtua */}
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Nama Orangtua / Wali *</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.parentName}
                    onChange={(e) => setEditingStudent(prev => prev ? { ...prev, parentName: e.target.value } : null)}
                    className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-[#cbd5ce] text-slate-800'
                    }`}
                  />
                </div>

                {/* Email Orangtua */}
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Email Orangtua (Untuk Notifikasi) *</label>
                  <input
                    type="email"
                    required
                    value={editingStudent.parentEmail}
                    onChange={(e) => setEditingStudent(prev => prev ? { ...prev, parentEmail: e.target.value } : null)}
                    className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-[#cbd5ce] text-slate-800'
                    }`}
                  />
                </div>

              </div>

              {/* Alamat */}
              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Alamat Lengkap</label>
                <textarea
                  rows={2}
                  value={editingStudent.address || ''}
                  onChange={(e) => setEditingStudent(prev => prev ? { ...prev, address: e.target.value } : null)}
                  className={`w-full rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-[#cbd5ce] text-slate-800'
                  }`}
                />
              </div>

              {/* Photo Upload Area */}
              <div>
                <label className={`block font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Perbarui Foto Siswa</label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                      isDark 
                        ? 'border-slate-800 hover:border-emerald-500/50 bg-slate-950/20' 
                        : 'border-[#cbd5ce] hover:border-emerald-500/50 bg-slate-50'
                    }`}
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
                    <div className={`relative w-16 h-16 rounded-xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800' : 'border-[#cbd5ce] bg-white'}`}>
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
              <div className={`flex justify-end gap-2 pt-4 border-t transition ${
                isDark ? 'border-slate-800 bg-slate-950/10' : 'border-[#cbd5ce] bg-slate-50'
              }`}>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className={`px-4 py-2 font-bold rounded-lg border transition ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-700/80 text-slate-300 border-slate-700/40' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-[#cbd5ce]'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-lg shadow-emerald-500/10 cursor-pointer"
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
