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
  Award,
  Trash2,
  Edit,
  ArrowLeft
} from 'lucide-react';
import { Student, Grade, Teacher, ClassStaff, AcademicSetting, SumatifDetail } from '../types';
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

  const allowedClasses = loggedTeacher && loggedTeacher.dutyType === 'GURU_KELAS' && loggedTeacher.assignedClass
    ? [loggedTeacher.assignedClass]
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
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

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
      alert('Silakan pilih siswa terlebih dahulu.');
      return;
    }

    const studentObj = students.find(s => s.nisn === selectedStudentNisn);
    if (!studentObj) return;

    // Filter out empty sumatifs or require at least one daily grade
    const validDetails = sumatifDetails.filter(item => item.harian && item.harian.length > 0);
    if (validDetails.length === 0) {
      alert('Silakan tambahkan minimal satu nilai harian di salah satu kategori sumatif.');
      return;
    }

    const st = stsVal === '' ? 0 : Number(stsVal);
    const sa = sasVal === '' ? 0 : Number(sasVal);

    if (st < 0 || st > 100 || sa < 0 || sa > 100) {
      alert('Nilai harus di rentang 0 - 100');
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
      if (loggedTeacher.dutyType === 'GURU_KELAS') {
        if (g.class !== loggedTeacher.assignedClass) return false;
      } else if (loggedTeacher.dutyType === 'GURU_MAPEL') {
        if (g.subject !== loggedTeacher.subject) return false;
      }
    }

    const matchesSearch = g.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || g.nisn.includes(searchQuery);
    const matchesClass = classFilter ? g.class === classFilter : true;
    const matchesSubject = subjectFilter ? g.subject === subjectFilter : true;

    return matchesSearch && matchesClass && matchesSubject;
  });

  // Export to CSV
  const handleExportExcel = () => {
    const headers = [
      'ID Nilai', 'NISN', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 
      'Detail Sumatif', 'Rata-rata Sumatif', 'ASTS', 'ASAS', 'Rata-rata Asesmen', 
      'Nilai Rapor', 'Tahun Pelajaran', 'Semester', 'Waktu Penginputan'
    ];
    const csvContent = convertToCSV(
      filteredGrades.map(g => {
        const sumAverages = g.sumatifDetails && g.sumatifDetails.length > 0
          ? g.sumatifDetails.map(item => {
              const h = item.harian || [];
              return h.length > 0 ? h.reduce((a, b) => a + b, 0) / h.length : 0;
            })
          : (g.sumatif || []);
        const sumAvg = sumAverages.length > 0 ? sumAverages.reduce((s, v) => s + v, 0) / sumAverages.length : 0;
        const formattedSumAvg = Math.round(sumAvg * 10) / 10;

        const detailSumatifStr = g.sumatifDetails && g.sumatifDetails.length > 0
          ? g.sumatifDetails.map(item => {
              const h = item.harian || [];
              const avg = h.length > 0 ? Math.round(h.reduce((a, b) => a + b, 0) / h.length) : 0;
              return `${item.name}: ${avg}`;
            }).join(' | ')
          : (g.sumatif || []).map((val, idx) => `Sumatif ${idx + 1}: ${val}`).join(' | ');

        const astsVal = g.sts ?? 0;
        const asasVal = g.sas ?? 0;
        const avgAsesmen = Math.round(((astsVal + asasVal) / 2) * 10) / 10;
        const finalVal = Math.round(((sumAvg + astsVal + asasVal) / 3) * 10) / 10;

        return {
          ...g,
          detailSumatifStr,
          formattedSumAvg,
          astsVal,
          asasVal,
          avgAsesmen,
          finalVal
        };
      }),
      headers,
      [
        'id', 'nisn', 'studentName', 'class', 'subject', 
        'detailSumatifStr', 'formattedSumAvg', 'astsVal', 'asasVal', 'avgAsesmen', 
        'finalVal', 'academicYear', 'semester', 'timestamp'
      ]
    );
    downloadFile(csvContent, `Rekap_Nilai_Siswa_${academicYear.replace('/', '-')}.csv`, 'text/csv;charset=utf-8;');
  };

  // Export to PDF
  const handleExportPDF = () => {
    const headers = [
      'No', 'NISN', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 
      'Detail Sumatif', 'Rata Sumatif', 'ASTS', 'ASAS', 'Rata Asesmen', 
      'Nilai Rapor', 'Status'
    ];
    const rows = filteredGrades.map((g, idx) => {
      const sumAverages = g.sumatifDetails && g.sumatifDetails.length > 0
        ? g.sumatifDetails.map(item => {
            const h = item.harian || [];
            return h.length > 0 ? h.reduce((a, b) => a + b, 0) / h.length : 0;
          })
        : (g.sumatif || []);
      const sumAvg = sumAverages.length > 0 ? sumAverages.reduce((s, v) => s + v, 0) / sumAverages.length : 0;
      const formattedSumAvg = Math.round(sumAvg * 10) / 10;

      const detailSumatifStr = g.sumatifDetails && g.sumatifDetails.length > 0
        ? g.sumatifDetails.map(item => {
            const h = item.harian || [];
            const avg = h.length > 0 ? Math.round(h.reduce((a, b) => a + b, 0) / h.length) : 0;
            return `${item.name}: ${avg}`;
          }).join(', ')
        : (g.sumatif || []).map((val, sIdx) => `Sumatif ${sIdx + 1}: ${val}`).join(', ');

      const astsVal = g.sts ?? 0;
      const asasVal = g.sas ?? 0;
      const avgAsesmen = Math.round(((astsVal + asasVal) / 2) * 10) / 10;
      const finalVal = Math.round(((sumAvg + astsVal + asasVal) / 3) * 10) / 10;

      return [
        String(idx + 1),
        g.nisn,
        g.studentName,
        g.class,
        g.subject,
        detailSumatifStr,
        String(formattedSumAvg),
        String(astsVal),
        String(asasVal),
        String(avgAsesmen),
        String(finalVal),
        finalVal >= (academicSetting?.kkm ?? 75) ? 'LULUS' : 'REMIDI'
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
                                  alert('Masukkan nilai harian valid (0-100)');
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
                                  alert('Masukkan nilai harian valid (0-100)');
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

                {/* Subject filter */}
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  <option value="">Semua Mata Pelajaran</option>
                  {allowedSubjects.map(sub => (
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
                                  alert(`Notifikasi laporan nilai berhasil ditriger! Laporan dikirimkan langsung ke email orangtua. Status pengiriman terpantau di Dashboard.`);
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
                                onClick={() => {
                                  if (confirm(`Apakah Anda yakin ingin menghapus data nilai ${g.studentName}?`)) {
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
