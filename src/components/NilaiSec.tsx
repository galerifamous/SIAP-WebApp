/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { toast, showConfirm } from '../utils/dialog';
import {
  PenTool,
  FileText,
  Search,
  Filter,
  FileSpreadsheet,
  FileDown,
  Printer,
  Mail,
  Check,
  AlertCircle,
  TrendingUp,
  Award,
  Trash2,
  Edit,
  ArrowLeft
} from 'lucide-react';
import { Student, Grade, Teacher, ClassStaff, AcademicSetting, SumatifDetail } from '../types';
import { downloadFile, convertToCSV, printToPDF, downloadToPDF } from '../utils/export';
import * as XLSX from 'xlsx';

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
  teachers?: Teacher[];
  classStaffs?: ClassStaff[];
  currentUser?: { id: string; name: string; username: string; role: string };
  academicSetting?: AcademicSetting;
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
  activeMenu,
  teachers,
  classStaffs,
  currentUser,
  academicSetting
}: NilaiSecProps) {
  // Local state to override view tab if needed (e.g. for inline editing)
  const [overrideTab, setOverrideTab] = useState<'input' | 'list' | null>(null);

  // Navigation tabs driven by sidebar menu selection
  const activeTab = overrideTab || (activeMenu ? (activeMenu === 'nilai-input' ? 'input' : 'list') : (role === 'SISWA' ? 'list' : 'input'));

  const handleEditClick = (g: Grade) => {
    setInputClass(g.class);
    setInputSubject(g.subject);
    setSelectedStudentNisn(g.nisn);
    
    // Load sumatif details
    if (g.sumatifDetails && g.sumatifDetails.length > 0) {
      setSumatifDetails(g.sumatifDetails);
    } else {
      const legacyDetails = (g.sumatif || []).map((val, idx) => ({
        name: `Sumatif ${idx + 1}`,
        harian: [val]
      }));
      setSumatifDetails(legacyDetails.length > 0 ? legacyDetails : [{ name: 'Sumatif 1', harian: [] }]);
    }
    setStsVal(g.sts);
    setSasVal(g.sas);
    setOverrideTab('input');
  };

  // Determine logged in teacher role and restrictions
  const loggedTeacher = (role === 'GURU' && teachers)
    ? teachers.find(t => t.nuptk === currentUser?.id || t.username === currentUser?.username)
    : undefined;

  const showClassFilter = role === 'ADMIN' || (role === 'GURU' && loggedTeacher?.dutyType === 'GURU_MAPEL');

  const waliClasses = (loggedTeacher && classStaffs)
    ? classStaffs.filter(cs => cs.waliKelasNuptk === loggedTeacher.nuptk).map(cs => cs.classId)
    : [];

  const allowedClasses = loggedTeacher && loggedTeacher.dutyType === 'GURU_KELAS' && loggedTeacher.assignedClass
    ? Array.from(new Set([loggedTeacher.assignedClass, ...waliClasses]))
    : availableClasses;

  // Input States - defined before allowedSubjects calculation to handle dependency
  const [inputClass, setInputClass] = useState(() => allowedClasses[0] || 'IX-A');

  const getSubjectsForInput = (targetClass: string) => {
    let baseSubjects = availableSubjects;

    // Filter by teacher's specialty/role
    if (loggedTeacher) {
      if (loggedTeacher.dutyType === 'GURU_MAPEL') {
        baseSubjects = [loggedTeacher.subject].filter(Boolean);
      } else if (loggedTeacher.dutyType === 'GURU_KELAS') {
        // Guru Kelas can enter all subjects except those that have dedicated GURU_MAPEL
        const assignedMapelSubjects = teachers
          ? teachers.filter(t => t.dutyType === 'GURU_MAPEL').map(t => t.subject)
          : [];
        baseSubjects = availableSubjects.filter(sub => !assignedMapelSubjects.includes(sub));
      }
    }

    // Exclude class-specific subject exclusions set by Admin
    if (academicSetting?.subjectExclusions) {
      const exclusionsForClass = academicSetting.subjectExclusions
        .filter(ex => ex.className === targetClass)
        .map(ex => ex.subject);
      baseSubjects = baseSubjects.filter(sub => !exclusionsForClass.includes(sub));
    }

    return baseSubjects;
  };

  const allowedSubjects = getSubjectsForInput(inputClass);

  const [inputSubject, setInputSubject] = useState(() => allowedSubjects[0] || 'Matematika');

  // Synchronize state when allowed options change
  React.useEffect(() => {
    if (allowedClasses.length > 0 && !allowedClasses.includes(inputClass)) {
      setInputClass(allowedClasses[0]);
    }
  }, [allowedClasses, inputClass]);

  React.useEffect(() => {
    if (allowedSubjects.length > 0 && !allowedSubjects.includes(inputSubject)) {
      setInputSubject(allowedSubjects[0]);
    }
  }, [allowedSubjects, inputSubject]);

  const [selectedStudentNisn, setSelectedStudentNisn] = useState('');
  const [sumatifDetails, setSumatifDetails] = useState<SumatifDetail[]>([
    { name: 'Sumatif 1', harian: [] }
  ]);
  const [stsVal, setStsVal] = useState<number | ''>('');
  const [sasVal, setSasVal] = useState<number | ''>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter/List States
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState(() => {
    return (role === 'GURU' && allowedClasses && allowedClasses.length > 0)
      ? allowedClasses[0]
      : '';
  });
  const [subjectFilter, setSubjectFilter] = useState(() => {
    if (role === 'GURU' && loggedTeacher && loggedTeacher.dutyType === 'GURU_MAPEL' && loggedTeacher.subject) {
      return loggedTeacher.subject;
    }
    return '';
  });

  // Filter students based on class selection in INPUT form
  const inputClassStudents = students.filter(s => s.class === inputClass);

  const updateFormFromExisting = (nisn: string, subjectStr: string) => {
    if (!nisn) {
      setSumatifDetails([{ name: 'Sumatif 1', harian: [] }]);
      setStsVal('');
      setSasVal('');
      return;
    }
    const existing = grades.find(g => g.nisn === nisn && g.subject === subjectStr && g.academicYear === academicYear && g.semester === semester);
    if (existing) {
      if (existing.sumatifDetails && existing.sumatifDetails.length > 0) {
        setSumatifDetails(existing.sumatifDetails);
      } else {
        const legacyDetails = (existing.sumatif || []).map((val, idx) => ({
          name: `Sumatif ${idx + 1}`,
          harian: [val]
        }));
        setSumatifDetails(legacyDetails.length > 0 ? legacyDetails : [{ name: 'Sumatif 1', harian: [] }]);
      }
      setStsVal(existing.sts);
      setSasVal(existing.sas);
    } else {
      setSumatifDetails([{ name: 'Sumatif 1', harian: [] }]);
      setStsVal('');
      setSasVal('');
    }
  };

  // Submit Grade Entry
  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);

    if (!selectedStudentNisn) {
      toast.warning('Silakan pilih siswa terlebih dahulu.');
      return;
    }

    const studentObj = students.find(s => s.nisn === selectedStudentNisn);
    if (!studentObj) return;

    // Filter out empty sumatifs or require at least one daily grade
    const validDetails = sumatifDetails.filter(item => item.harian && item.harian.length > 0);
    if (validDetails.length === 0) {
      toast.warning('Silakan tambahkan minimal satu nilai harian di salah satu kategori sumatif.');
      return;
    }

    const st = stsVal === '' ? 0 : Number(stsVal);
    const sa = sasVal === '' ? 0 : Number(sasVal);

    if (st < 0 || st > 100 || sa < 0 || sa > 100) {
      toast.error('Nilai harus di rentang 0 - 100');
      return;
    }

    // Build the sumatif averages list for backwards compatibility
    const sumAverages = validDetails.map(item => {
      const harianList = item.harian || [];
      return harianList.length > 0 ? Math.round(harianList.reduce((a, b) => a + b, 0) / harianList.length) : 0;
    });

    onSaveGrade({
      nisn: selectedStudentNisn,
      studentName: studentObj.name,
      class: studentObj.class,
      subject: inputSubject,
      academicYear,
      semester,
      sumatif: sumAverages,
      sumatifDetails: validDetails,
      sts: st,
      sas: sa
    });

    const sumAvg = sumAverages.reduce((s, v) => s + v, 0) / sumAverages.length;
    const finalVal = Math.round(((sumAvg + st + sa) / 3) * 10) / 10;

    setSuccessMsg(`Nilai Mapel ${inputSubject} untuk ${studentObj.name} berhasil disimpan! Rata-rata final: ${finalVal}`);
    
    // Reset values
    setSelectedStudentNisn('');
    setSumatifDetails([{ name: 'Sumatif 1', harian: [] }]);
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

    // Role GURU constraints
    if (role === 'GURU' && loggedTeacher) {
      // Check if logged teacher is Wali Kelas of this grade's class
      const isWaliOfThisClass = classStaffs
        ? classStaffs.some(cs => cs.classId === g.class && cs.waliKelasNuptk === loggedTeacher.nuptk)
        : false;

      // If they are NOT the Wali Kelas of this class, apply standard restrictions
      if (!isWaliOfThisClass) {
        if (loggedTeacher.dutyType === 'GURU_KELAS') {
          if (g.class !== loggedTeacher.assignedClass) return false;
        } else if (loggedTeacher.dutyType === 'GURU_MAPEL') {
          if (g.subject !== loggedTeacher.subject) return false;
        }
      }
    }

    const matchesSearch = g.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || g.nisn.includes(searchQuery);
    const matchesClass = classFilter ? g.class === classFilter : true;
    const matchesSubject = subjectFilter ? g.subject === subjectFilter : true;

    return matchesSearch && matchesClass && matchesSubject;
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

  // Export to Excel (highly structured dual-row merged format with custom column widths)
  const handleExportExcel = () => {
    const targetGrades = filteredGrades;
    const maxSums = Math.max(...targetGrades.map(g => g.sumatif?.length || 0), 4);

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

    // Header Row 1
    const row1 = ['NISN', 'Nama Siswa', 'JK', subjectFilter || 'Mata Pelajaran'];
    for (let i = 1; i < maxSums; i++) {
      row1.push(''); // spacing for merge of Subject name across sumatif columns
    }
    row1.push('Rata-Rata SUM', 'STS', 'ASAS', 'Rata-Rata ASAS');

    // Header Row 2
    const row2 = ['', '', ''];
    for (let i = 1; i <= maxSums; i++) {
      row2.push(`SUM ${i}`);
    }
    row2.push('', '', '', '');

    // Data rows
    const dataRows = targetGrades.map(g => {
      const sGender = students.find(s => s.nisn === g.nisn)?.gender;
      const jk = sGender === 'Laki-laki' ? 'L' : 'P';
      
      const sums: any[] = [];
      for (let i = 0; i < maxSums; i++) {
        let valStr = '-';
        if (g.sumatifDetails && g.sumatifDetails[i]) {
          const det = g.sumatifDetails[i];
          const harian = det.harian || [];
          const avg = harian.length > 0 ? Math.round(harian.reduce((a, b) => a + b, 0) / harian.length) : 0;
          if (harian.length > 0) {
            valStr = `${avg} (${harian.join(', ')})`;
          } else {
            valStr = g.sumatif && g.sumatif[i] !== undefined ? String(g.sumatif[i]) : '-';
          }
        } else {
          valStr = g.sumatif && g.sumatif[i] !== undefined ? String(g.sumatif[i]) : '-';
        }
        sums.push(valStr);
      }

      const sumAverages = g.sumatifDetails && g.sumatifDetails.length > 0
        ? g.sumatifDetails.map(item => {
            const h = item.harian || [];
            return h.length > 0 ? h.reduce((a, b) => a + b, 0) / h.length : 0;
          })
        : (g.sumatif || []);
      const sumAvg = sumAverages.length > 0 ? Math.round((sumAverages.reduce((s, v) => s + v, 0) / sumAverages.length) * 10) / 10 : 0;

      const stsVal = g.sts ?? 0;
      const sasVal = g.sas ?? 0;
      const rAsas = Math.round(((stsVal + sasVal) / 2) * 10) / 10;

      return [
        g.nisn,
        g.studentName,
        jk,
        ...sums,
        sumAvg,
        stsVal,
        sasVal,
        rAsas
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
      [`REKAP NILAI RAPOR SISWA - KELAS ${classFilter || 'SEMUA KELAS'}`],
      [`Mata Pelajaran: ${subjectFilter || 'Semua'} | TP: ${academicYear} | Semester: ${semester}`],
      [],
    ];

    const aoa = [...headerRows, row1, row2, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Set neat, fixed column widths (paten) so user doesn't need to resize manually
    const cols = [
      { wch: 15 }, // NISN
      { wch: 28 }, // Nama Siswa
      { wch: 6 },  // JK (Jenis Kelamin)
    ];
    // For SUM columns, make them small/compact
    for (let i = 0; i < maxSums; i++) {
      cols.push({ wch: 12 });
    }
    // For average and assessment columns
    cols.push({ wch: 15 }); // Rata-Rata SUM
    cols.push({ wch: 8 });  // STS
    cols.push({ wch: 8 });  // ASAS
    cols.push({ wch: 15 }); // Rata-Rata ASAS

    ws['!cols'] = cols;

    // Set merges shifted by 8 header rows
    ws['!merges'] = [
      { s: { r: 8, c: 0 }, e: { r: 9, c: 0 } }, // NISN
      { s: { r: 8, c: 1 }, e: { r: 9, c: 1 } }, // Nama Siswa
      { s: { r: 8, c: 2 }, e: { r: 9, c: 2 } }, // JK
      { s: { r: 8, c: 3 }, e: { r: 8, c: 3 + maxSums - 1 } }, // Subject name
      { s: { r: 8, c: 3 + maxSums }, e: { r: 9, c: 3 + maxSums } }, // Rata-Rata SUM
      { s: { r: 8, c: 3 + maxSums + 1 }, e: { r: 9, c: 3 + maxSums + 1 } }, // STS
      { s: { r: 8, c: 3 + maxSums + 2 }, e: { r: 9, c: 3 + maxSums + 2 } }, // ASAS
      { s: { r: 8, c: 3 + maxSums + 3 }, e: { r: 9, c: 3 + maxSums + 3 } }  // Rata-Rata ASAS
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai');
    XLSX.writeFile(wb, `Rekap_Nilai_Siswa_${academicYear.replace('/', '-')}_${classFilter || 'Semua'}.xlsx`);
  };

  // Export to PDF / Print (A4 landscape high fidelity printer)
  const handleExportPDF = () => {
    const targetGrades = filteredGrades;
    const maxSums = Math.max(...targetGrades.map(g => g.sumatif?.length || 0), 4);

    // Retrieve system settings
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
    if (classFilter && classStaffs && teachers) {
      const staff = classStaffs.find(cs => cs.classId === classFilter);
      if (staff) {
        const teacher = teachers.find(t => t.nuptk === staff.waliKelasNuptk);
        if (teacher) {
          waliKelasName = teacher.name;
        }
      }
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.warning('Mohon izinkan popup browser Anda untuk mencetak laporan.');
      return;
    }

    // Generate sub-headers for Sumatif columns
    const sumSubHeadersHtml = [];
    for (let i = 1; i <= maxSums; i++) {
      sumSubHeadersHtml.push(
        `<th style="padding: 4px; border: 1px solid #94a3b8; text-align: center; font-size: 8px; width: 35px;">SUM ${i}</th>`
      );
    }

    const rowsHtml = targetGrades.map((g, idx) => {
      const sGender = students.find(s => s.nisn === g.nisn)?.gender;
      const jk = sGender === 'Laki-laki' ? 'L' : 'P';

      const sumsCellsHtml = [];
      for (let i = 0; i < maxSums; i++) {
        let valStr = '-';
        let detailHtml = '';
        if (g.sumatifDetails && g.sumatifDetails[i]) {
          const det = g.sumatifDetails[i];
          const harian = det.harian || [];
          const avg = harian.length > 0 ? Math.round(harian.reduce((a, b) => a + b, 0) / harian.length) : 0;
          if (harian.length > 0) {
            valStr = String(avg);
            detailHtml = `<div style="font-size: 7.5px; color: #64748b; margin-top: 2px;">(${harian.join(', ')})</div>`;
          } else {
            valStr = g.sumatif && g.sumatif[i] !== undefined ? String(g.sumatif[i]) : '-';
          }
        } else {
          valStr = g.sumatif && g.sumatif[i] !== undefined ? String(g.sumatif[i]) : '-';
        }
        sumsCellsHtml.push(
          `<td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 9px; min-width: 45px;">
            <div style="font-weight: bold;">${valStr}</div>
            ${detailHtml}
          </td>`
        );
      }

      const sumAverages = g.sumatifDetails && g.sumatifDetails.length > 0
        ? g.sumatifDetails.map(item => {
            const h = item.harian || [];
            return h.length > 0 ? h.reduce((a, b) => a + b, 0) / h.length : 0;
          })
        : (g.sumatif || []);
      const sumAvg = sumAverages.length > 0 ? Math.round((sumAverages.reduce((s, v) => s + v, 0) / sumAverages.length) * 10) / 10 : 0;

      const stsVal = g.sts ?? 0;
      const sasVal = g.sas ?? 0;
      const rAsas = Math.round(((stsVal + sasVal) / 2) * 10) / 10;

      return `
        <tr>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 9px;">${idx + 1}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 9px;">${g.nisn}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 9px; text-align: left;">${g.studentName}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 9px;">${jk}</td>
          ${sumsCellsHtml.join('')}
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; font-size: 9px; background-color: #f8fafc;">${sumAvg}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 9px;">${stsVal}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 9px;">${sasVal}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; font-size: 9px; background-color: #f0fdf4; color: #166534;">${rAsas}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Rekap Nilai Siswa</title>
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
            <h2 class="title-main">DAFTAR NILAI DAN HASIL ASESMEN AKADEMIK</h2>
            <p class="title-sub">Kelas: <strong>${classFilter || 'SEMUA KELAS'}</strong> | Mapel: <strong>${subjectFilter || 'SEMUA MAPEL'}</strong> | TP: <strong>${academicYear}</strong></p>
          </div>

          <table>
            <thead>
              <tr>
                <th rowspan="2" style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-size: 9px; width: 30px;">No</th>
                <th rowspan="2" style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-size: 9px; width: 80px;">NISN</th>
                <th rowspan="2" style="padding: 6px; border: 1px solid #94a3b8; text-align: left; font-size: 9px; width: 180px;">Nama Siswa</th>
                <th rowspan="2" style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-size: 9px; width: 40px;">JK</th>
                <th colspan="${maxSums}" style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-size: 9px;">${subjectFilter || 'SUMATIF'}</th>
                <th rowspan="2" style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-size: 9px; width: 80px;">Rata-Rata SUM</th>
                <th rowspan="2" style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-size: 9px; width: 60px;">STS</th>
                <th rowspan="2" style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-size: 9px; width: 60px;">ASAS</th>
                <th rowspan="2" style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-size: 9px; width: 80px; background-color: #e2f0d9;">Rata-Rata ASAS</th>
              </tr>
              <tr>
                ${sumSubHeadersHtml.join('')}
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

  // Download direct PDF using downloadToPDF helper
  const handleDownloadPDF = () => {
    const targetGrades = filteredGrades;
    const maxSums = Math.max(...targetGrades.map(g => g.sumatif?.length || 0), 4);

    const sumHeaders = [];
    for (let i = 1; i <= maxSums; i++) {
      sumHeaders.push(`SUM ${i}`);
    }

    const headers = ['No', 'NISN', 'Nama Siswa', 'JK', ...sumHeaders, 'Rata Sum', 'STS', 'SAS', 'Rapor'];

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

    const rows = targetGrades.map((g, idx) => {
      const sGender = students.find(s => s.nisn === g.nisn)?.gender;
      const jk = sGender === 'Laki-laki' ? 'L' : 'P';

      const sumVals = [];
      for (let i = 0; i < maxSums; i++) {
        let valStr = '-';
        if (g.sumatifDetails && g.sumatifDetails[i]) {
          const det = g.sumatifDetails[i];
          const harian = det.harian || [];
          const avg = harian.length > 0 ? Math.round(harian.reduce((a, b) => a + b, 0) / harian.length) : 0;
          if (harian.length > 0) {
            valStr = `${avg} (${harian.join(',')})`;
          } else {
            valStr = g.sumatif && g.sumatif[i] !== undefined ? String(g.sumatif[i]) : '-';
          }
        } else {
          valStr = g.sumatif && g.sumatif[i] !== undefined ? String(g.sumatif[i]) : '-';
        }
        sumVals.push(valStr);
      }

      const sumAverages = g.sumatifDetails && g.sumatifDetails.length > 0
        ? g.sumatifDetails.map(item => {
            const h = item.harian || [];
            return h.length > 0 ? h.reduce((a, b) => a + b, 0) / h.length : 0;
          })
        : (g.sumatif || []);
      const sumAvg = sumAverages.length > 0 ? Math.round((sumAverages.reduce((s, v) => s + v, 0) / sumAverages.length) * 10) / 10 : 0;

      const stsVal = g.sts ?? 0;
      const sasVal = g.sas ?? 0;
      const rAsas = Math.round(((stsVal + sasVal) / 2) * 10) / 10;

      return [
        String(idx + 1),
        g.nisn,
        g.studentName,
        jk,
        ...sumVals,
        String(sumAvg),
        String(stsVal),
        String(sasVal),
        String(rAsas)
      ];
    });

    downloadToPDF(
      `Daftar Nilai dan Hasil Asesmen Akademik`,
      headers,
      rows,
      `Rekap_Nilai_Siswa_${academicYear.replace('/', '-')}_${classFilter || 'Semua'}.pdf`,
      schoolName,
      academicYear,
      semester,
      classFilter || undefined,
      waliKelasName || undefined
    );
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
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <PenTool className="w-4 h-4 text-emerald-400" /> Formulir Penginputan Nilai Akademik
              </h3>
              {overrideTab === 'input' && (
                <button
                  type="button"
                  onClick={() => setOverrideTab(null)}
                  className="flex items-center justify-center w-7 h-7 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer active:scale-95"
                  title="Kembali ke Rekap"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

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
                      setSumatifDetails([{ name: 'Sumatif 1', harian: [] }]);
                      setStsVal('');
                      setSasVal('');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold text-xs"
                  >
                    {allowedClasses.map(c => (
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
                    {allowedSubjects.map(sub => (
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
              <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                  <label className="block text-slate-300 font-extrabold uppercase tracking-wider text-[10px]">Daftar Nilai Sumatif (Banyak Nilai Harian)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setSumatifDetails([
                        ...sumatifDetails,
                        { name: `Sumatif ${sumatifDetails.length + 1}`, harian: [] }
                      ]);
                    }}
                    className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-md font-bold cursor-pointer"
                  >
                    + Tambah Sumatif Baru
                  </button>
                </div>
                
                <div className="space-y-4">
                  {sumatifDetails.map((sumItem, sumIdx) => {
                    const harianList = sumItem.harian || [];
                    const sumAvg = harianList.length > 0 ? Math.round(harianList.reduce((a, b) => a + b, 0) / harianList.length) : 0;
                    
                    return (
                      <div key={sumIdx} className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-300 font-sans">
                            {sumItem.name} 
                            <span className="text-[10px] text-slate-500 font-mono ml-1.5">(Rerata: <strong className="text-emerald-400">{sumAvg}</strong>)</span>
                          </span>
                          {sumIdx > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSumatifDetails(sumatifDetails.filter((_, i) => i !== sumIdx));
                              }}
                              className="text-slate-500 hover:text-rose-400 text-[10px] font-semibold cursor-pointer"
                              title="Hapus Sumatif ini"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                        
                        {/* Daily scores list for this sumatif category */}
                        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950 rounded-lg min-h-10 items-center">
                          {harianList.length === 0 ? (
                            <span className="text-slate-600 italic text-[10px] px-1">Belum ada nilai harian.</span>
                          ) : (
                            harianList.map((val, harIdx) => (
                              <span key={harIdx} className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-md font-mono font-bold">
                                <span>Harian {harIdx + 1}: {val}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedHarian = harianList.filter((_, idx) => idx !== harIdx);
                                    const updatedDetails = [...sumatifDetails];
                                    updatedDetails[sumIdx].harian = updatedHarian;
                                    setSumatifDetails(updatedDetails);
                                  }}
                                  className="text-slate-500 hover:text-rose-400 transition ml-0.5 cursor-pointer"
                                >
                                  ✕
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                        
                        {/* Add Daily Score Form for this specific sumatif category */}
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            id={`input-harian-${sumIdx}`}
                            placeholder="Nilai Harian (0-100)"
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold text-[11px] font-mono flex-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const score = Number(e.currentTarget.value);
                                if (e.currentTarget.value !== '' && score >= 0 && score <= 100) {
                                  const updatedDetails = [...sumatifDetails];
                                  updatedDetails[sumIdx].harian = [...(updatedDetails[sumIdx].harian || []), score];
                                  setSumatifDetails(updatedDetails);
                                  e.currentTarget.value = '';
                                } else {
                                  toast.error('Masukkan nilai harian valid (0-100)');
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const inputEl = document.getElementById(`input-harian-${sumIdx}`) as HTMLInputElement;
                              if (inputEl) {
                                const score = Number(inputEl.value);
                                if (inputEl.value !== '' && score >= 0 && score <= 100) {
                                  const updatedDetails = [...sumatifDetails];
                                  updatedDetails[sumIdx].harian = [...(updatedDetails[sumIdx].harian || []), score];
                                  setSumatifDetails(updatedDetails);
                                  inputEl.value = '';
                                } else {
                                  toast.error('Masukkan nilai harian valid (0-100)');
                                }
                              }
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition border border-slate-750 cursor-pointer"
                          >
                            + Tambah Nilai
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
              {selectedStudentNisn && (sumatifDetails.some(item => item.harian && item.harian.length > 0) || stsVal !== '' || sasVal !== '') && (
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex justify-between items-center">
                   <span className="text-slate-400 font-bold uppercase tracking-wider">Estimasi Nilai Rapor Final:</span>
                  {(() => {
                    const validItems = sumatifDetails.filter(item => item.harian && item.harian.length > 0);
                    const sumAverages = validItems.map(item => {
                      const harianList = item.harian || [];
                      return harianList.length > 0 ? harianList.reduce((a, b) => a + b, 0) / harianList.length : 0;
                    });
                    const sumAvg = sumAverages.length > 0 ? sumAverages.reduce((s, v) => s + v, 0) / sumAverages.length : 0;
                    const st = stsVal === '' ? 0 : Number(stsVal);
                    const sa = sasVal === '' ? 0 : Number(sasVal);
                    const est = Math.round(((sumAvg + st + sa) / 3) * 10) / 10;
                    const minKkm = academicSetting?.kkm ?? 75;
                    return (
                      <span className={`font-mono text-base font-bold px-3 py-1 rounded-lg ${
                        est >= minKkm
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-rose-400 bg-rose-500/10'
                      }`}>
                        {est}
                      </span>
                    );
                  })()}
                </div>
              )}

              {(() => {
                const existingGrade = selectedStudentNisn 
                  ? grades.find(g => g.nisn === selectedStudentNisn && g.subject === inputSubject && g.academicYear === academicYear && g.semester === semester) 
                  : null;
                return (
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-lg shadow-lg shadow-emerald-500/10 transition cursor-pointer"
                    >
                      {existingGrade ? 'Perbarui & Simpan Nilai' : 'Simpan & Catat Nilai'}
                    </button>
                    {existingGrade && (
                      <button
                        type="button"
                        onClick={async () => {
                          const confirmed = await showConfirm(`Apakah Anda yakin ingin menghapus data nilai ${existingGrade.studentName} untuk Mata Pelajaran ${inputSubject}?`, {
                            title: 'Hapus Nilai Mata Pelajaran',
                            type: 'danger'
                          });
                          if (confirmed) {
                            onDeleteGrade(existingGrade.id);
                            // Reset form fields
                            setSumatifDetails([{ name: 'Sumatif 1', harian: [] }]);
                            setStsVal('');
                            setSasVal('');
                            setSelectedStudentNisn('');
                            setSuccessMsg('Data nilai siswa berhasil dihapus dari sistem!');
                          }
                        }}
                        className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 font-bold py-2.5 px-4 rounded-lg transition cursor-pointer"
                      >
                        Hapus Nilai
                      </button>
                    )}
                  </div>
                );
              })()}
            </form>
          </div>

          {/* Guidelines Box */}
          <div className="p-5 bg-slate-950/20 border border-slate-800 rounded-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Kebijakan KKM</h3>
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-400">KKM Sekolah:</span>
                  <span className="text-teal-400 font-mono text-sm bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/10">{(academicSetting?.kkm ?? 75).toFixed(1)}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  Siswa dengan nilai rata-rata di bawah {academicSetting?.kkm ?? 75} diwajibkan mengikuti program remedial dari guru mapel masing-masing.
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
                {showClassFilter && (
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-emerald-500 font-semibold"
                    >
                      <option value="">Semua Kelas</option>
                      {allowedClasses.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Subject filter */}
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  <option value="">Semua Mata Pelajaran</option>
                  {((role === 'ADMIN' || (loggedTeacher && classStaffs && classStaffs.some(cs => cs.waliKelasNuptk === loggedTeacher.nuptk)))
                    ? availableSubjects
                    : allowedSubjects
                  ).map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                {/* Export buttons */}
                <button
                  onClick={handleExportExcel}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700/80 text-emerald-400 border border-slate-700/60 rounded-xl transition duration-150 cursor-pointer"
                  title="Unduh Rekap Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4.5 h-4.5" />
                </button>

                <button
                  onClick={handleDownloadPDF}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700/80 text-sky-400 border border-slate-700/60 rounded-xl transition duration-150 cursor-pointer"
                  title="Unduh PDF (.pdf) Langsung"
                >
                  <FileDown className="w-4.5 h-4.5" />
                </button>

                <button
                  onClick={handleExportPDF}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700/80 text-rose-400 border border-slate-700/60 rounded-xl transition duration-150 cursor-pointer"
                  title="Cetak Laporan PDF / Pratinjau"
                >
                  <Printer className="w-4.5 h-4.5" />
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
                  <th className="p-4 text-center">Nilai per Sumatif</th>
                  <th className="p-4 text-center">Rata Sumatif</th>
                  <th className="p-4 text-center">ASTS</th>
                  <th className="p-4 text-center">ASAS</th>
                  <th className="p-4 text-center">Rata Asesmen</th>
                  <th className="p-4 text-center">Nilai Rapor</th>
                  {role !== 'SISWA' && <th className="p-4 text-center w-48">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredGrades.length === 0 ? (
                  <tr>
                    <td colSpan={role === 'SISWA' ? 10 : 11} className="p-10 text-center text-slate-500 italic">
                      {role === 'SISWA' ? 'Belum ada laporan nilai rapor untuk Anda di semester ini.' : 'Belum ada data nilai terdaftar untuk kriteria filter ini.'}
                    </td>
                  </tr>
                ) : (
                  filteredGrades.map((g, idx) => {
                    const sumAverages = g.sumatifDetails && g.sumatifDetails.length > 0
                      ? g.sumatifDetails.map(item => {
                          const h = item.harian || [];
                          return h.length > 0 ? h.reduce((a, b) => a + b, 0) / h.length : 0;
                        })
                      : (g.sumatif || []);
                    const sumAvg = sumAverages.length > 0 ? sumAverages.reduce((s, v) => s + v, 0) / sumAverages.length : 0;
                    const formattedSumAvg = Math.round(sumAvg * 10) / 10;
                    
                    const astsVal = g.sts ?? 0;
                    const asasVal = g.sas ?? 0;
                    const avgAsesmen = Math.round(((astsVal + asasVal) / 2) * 10) / 10;
                    const finalVal = Math.round(((sumAvg + astsVal + asasVal) / 3) * 10) / 10;

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
                        <td className="p-4 text-center">
                          <div className="flex flex-col gap-1 items-center font-mono text-[10px]">
                            {g.sumatifDetails && g.sumatifDetails.length > 0 ? (
                              g.sumatifDetails.map((item, sIdx) => {
                                const harian = item.harian || [];
                                const avg = harian.length > 0 ? Math.round(harian.reduce((a,b)=>a+b,0)/harian.length) : 0;
                                return (
                                  <span key={sIdx} className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300" title={`Harian: ${harian.join(', ')}`}>
                                    {item.name}: <strong className="text-emerald-400">{avg}</strong>
                                  </span>
                                );
                              })
                            ) : (
                              (g.sumatif || []).map((val, sIdx) => (
                                <span key={sIdx} className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">
                                  Sumatif {sIdx + 1}: <strong className="text-emerald-400">{val}</strong>
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-emerald-400 text-sm">{formattedSumAvg}</td>
                        <td className="p-4 text-center font-mono font-medium text-slate-400">{astsVal}</td>
                        <td className="p-4 text-center font-mono font-medium text-slate-400">{asasVal}</td>
                        <td className="p-4 text-center font-mono font-bold text-blue-400 text-sm">{avgAsesmen}</td>
                        <td className="p-4 text-center font-mono font-bold text-white text-sm">{finalVal}</td>
                        {role !== 'SISWA' && (
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  onSendGradeEmail(g.id);
                                  toast.success(`Notifikasi laporan nilai berhasil ditrigger! Laporan dikirimkan langsung ke email orangtua.`);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-750 rounded-lg transition text-[10px] font-bold uppercase active:scale-95 cursor-pointer"
                                title="Kirim nilai ke Email Orangtua"
                              >
                                <Mail className="w-3 h-3" />
                                <span>Kirim</span>
                              </button>
                              
                              <button
                                onClick={() => handleEditClick(g)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-750 rounded-lg transition text-[10px] font-bold uppercase active:scale-95 cursor-pointer"
                                title="Edit Nilai"
                              >
                                <Edit className="w-3 h-3" />
                                <span>Edit</span>
                              </button>

                              <button
                                onClick={async () => {
                                  const confirmed = await showConfirm(`Apakah Anda yakin ingin menghapus data nilai ${g.studentName}?`, {
                                    title: 'Hapus Nilai Siswa',
                                    type: 'danger'
                                  });
                                  if (confirmed) {
                                    onDeleteGrade(g.id);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-rose-500 border border-slate-750 rounded-lg transition text-[10px] font-bold uppercase active:scale-95 cursor-pointer"
                                title="Hapus Nilai"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Hapus</span>
                              </button>
                            </div>
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
