/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Role, Student, Teacher, Attendance, Grade, CaseReport, Achievement, AcademicSetting, SystemSetting, EmailLog, Holiday } from './types';
import {
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_ACADEMIC,
  INITIAL_SYSTEM,
  INITIAL_ATTENDANCE,
  INITIAL_GRADES,
  INITIAL_CASES,
  INITIAL_ACHIEVEMENTS,
  INITIAL_EMAILS
} from './data';

import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SiswaList from './components/SiswaList';
import AbsensiSec from './components/AbsensiSec';
import NilaiSec from './components/NilaiSec';
import RecordSec from './components/RecordSec';
import QrCodeSec from './components/QrCodeSec';
import SettingsSec from './components/SettingsSec';
import SiswaProfil from './components/SiswaProfil';
import UangKasSec from './components/UangKasSec';
import BackupRestoreSec from './components/BackupRestoreSec';
import KartuSiswaSec from './components/KartuSiswaSec';
import UnduhAplikasiSec from './components/UnduhAplikasiSec';

export default function App() {
  // --- AUTH STATES ---
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; username: string; role: Role; studentNisn?: string } | null>(null);
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');

  // --- DATABASE STATES ---
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [academicSetting, setAcademicSetting] = useState<AcademicSetting>(INITIAL_ACADEMIC);
  const [systemSetting, setSystemSetting] = useState<SystemSetting>(INITIAL_SYSTEM);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [cases, setCases] = useState<CaseReport[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // --- LOAD INITIAL DATA FROM LOCALSTORAGE ---
  useEffect(() => {
    // Helper to get or set local database values safely
    function getLocalOrSeed<T>(key: string, fallback: T): T {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          return JSON.parse(stored) as T;
        } catch (e) {
          return fallback;
        }
      } else {
        localStorage.setItem(key, JSON.stringify(fallback));
        return fallback;
      }
    }

    // Load configurations
    const sys = getLocalOrSeed<SystemSetting>('siap_system', INITIAL_SYSTEM);
    const acad = getLocalOrSeed<AcademicSetting>('siap_academic', INITIAL_ACADEMIC);
    
    setSystemSetting(sys);
    setAcademicSetting(acad);

    // Load master listings
    setStudents(getLocalOrSeed<Student[]>('siap_students', INITIAL_STUDENTS));
    setTeachers(getLocalOrSeed<Teacher[]>('siap_teachers', INITIAL_TEACHERS));

    // Load logs aligning with current academic configs
    setAttendance(getLocalOrSeed<Attendance[]>('siap_attendance', INITIAL_ATTENDANCE(acad.activeYear, acad.activeSemester)));
    setGrades(getLocalOrSeed<Grade[]>('siap_grades', INITIAL_GRADES(acad.activeYear, acad.activeSemester)));
    setCases(getLocalOrSeed<CaseReport[]>('siap_cases', INITIAL_CASES(acad.activeYear, acad.activeSemester)));
    setAchievements(getLocalOrSeed<Achievement[]>('siap_achievements', INITIAL_ACHIEVEMENTS(acad.activeYear, acad.activeSemester)));
    setEmails(getLocalOrSeed<EmailLog[]>('siap_emails', INITIAL_EMAILS));
    setHolidays(getLocalOrSeed<Holiday[]>('siap_holidays', []));

    // Restore login session if available
    const session = localStorage.getItem('siap_session');
    if (session) {
      try {
        setCurrentUser(JSON.parse(session));
      } catch (e) {
        localStorage.removeItem('siap_session');
      }
    }
  }, []);

  // --- LOCAL PERSISTENCE WRITERS ---
  const saveState = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // --- LOGIN SUBMIT HANDLER ---
  const handleLogin = (role: Role, identifier: string, password?: string): string | null => {
    if (role === 'ADMIN') {
      const targetUsername = (systemSetting.adminUsername || 'admin').toLowerCase();
      const targetPassword = systemSetting.adminPassword || 'admin';
      if (identifier.toLowerCase() === targetUsername && password === targetPassword) {
        const userObj = { id: 'admin-1', name: 'Administrator SIAP', username: targetUsername, role: 'ADMIN' as Role };
        setCurrentUser(userObj);
        saveState('siap_session', userObj);
        setActiveMenu('dashboard');
        return null;
      }
      return `Kredensial Admin tidak valid. Coba username: "${targetUsername}", sandi: "${targetPassword}".`;
    }

    if (role === 'GURU') {
      const teacher = teachers.find(t => t.username.toLowerCase() === identifier.toLowerCase() && t.password === password);
      if (teacher) {
        const userObj = { id: teacher.nuptk, name: teacher.name, username: teacher.username, role: 'GURU' as Role };
        setCurrentUser(userObj);
        saveState('siap_session', userObj);
        setActiveMenu('dashboard');
        return null;
      }
      return 'Kredensial Guru tidak valid. Hubungi Admin Sistem jika Anda lupa kredensial.';
    }

    if (role === 'SISWA') {
      const student = students.find(s => s.nisn === identifier);
      if (student) {
        const userObj = { id: student.nisn, name: student.name, username: student.nisn, role: 'SISWA' as Role, studentNisn: student.nisn };
        setCurrentUser(userObj);
        saveState('siap_session', userObj);
        setActiveMenu('dashboard');
        return null;
      }
      return 'NISN Siswa tidak terdaftar di database. Silakan hubungi TU atau Admin Sekolah.';
    }

    return 'Peran tidak dikenali.';
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('siap_session');
  };

  // --- AUTOMATIC EMAIL NOTIFICATION DISPATCH SIMULATOR ---
  const simulateEmailDispatch = (
    recipient: string,
    role: string,
    subject: string,
    content: string,
    type: 'Absensi' | 'Nilai' | 'Kasus' | 'Prestasi' | 'Tabungan' | 'Tagihan Uang Kas'
  ) => {
    const newLogId = 'em-' + Date.now() + Math.random().toString(36).substring(2, 5);
    const initialLog: EmailLog = {
      id: newLogId,
      timestamp: new Date().toISOString(),
      recipient,
      role,
      subject,
      content,
      status: 'Sending',
      type
    };

    // Prepend to React state and localStorage
    setEmails(prev => {
      const updated = [initialLog, ...prev];
      saveState('siap_emails', updated);
      return updated;
    });

    // Simulate Google App Script MailApp dispatch latency
    setTimeout(() => {
      setEmails(prev => {
        const updated = prev.map(log => {
          if (log.id === newLogId) {
            return { ...log, status: 'Success' as const };
          }
          return log;
        });
        saveState('siap_emails', updated);
        return updated;
      });
    }, 1500);
  };

  // --- DATA SISWA WRITERS ---
  const handleAddStudent = (student: Student) => {
    const updated = [student, ...students];
    setStudents(updated);
    saveState('siap_students', updated);
  };

  const handleAddStudentsBulk = (bulk: Student[]) => {
    const updated = [...bulk, ...students];
    setStudents(updated);
    saveState('siap_students', updated);
  };

  const handleEditStudent = (nisn: string, updatedStudent: Student) => {
    const updated = students.map(s => s.nisn === nisn ? updatedStudent : s);
    setStudents(updated);
    saveState('siap_students', updated);
  };

  const handleDeleteStudent = (nisn: string) => {
    const updated = students.filter(s => s.nisn !== nisn);
    setStudents(updated);
    saveState('siap_students', updated);
  };

  const handleUpdateStudentPhoto = (nisn: string, base64Photo: string) => {
    const updated = students.map(s => {
      if (s.nisn === nisn) {
        return { ...s, photoUrl: base64Photo };
      }
      return s;
    });
    setStudents(updated);
    saveState('siap_students', updated);
  };

  // --- ABSENSI WRITERS ---
  const handleMarkAttendance = (nisn: string, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa', customDate?: string) => {
    const student = students.find(s => s.nisn === nisn);
    if (!student) return;

    const dateStr = customDate || new Date().toISOString().split('T')[0];
    
    // Check if attendance already exists for this student on this date, academic year, and semester
    const existingIndex = attendance.findIndex(
      a => a.nisn === nisn && 
           a.date === dateStr && 
           a.academicYear === academicSetting.activeYear && 
           a.semester === academicSetting.activeSemester
    );

    let updated: Attendance[];
    if (existingIndex > -1) {
      updated = [...attendance];
      updated[existingIndex] = {
        ...updated[existingIndex],
        status,
        timestamp: new Date().toISOString()
      };
    } else {
      const newAttId = 'att-' + Date.now();
      const newRecord: Attendance = {
        id: newAttId,
        nisn,
        studentName: student.name,
        class: student.class,
        date: dateStr,
        status,
        academicYear: academicSetting.activeYear,
        semester: academicSetting.activeSemester,
        timestamp: new Date().toISOString()
      };
      updated = [newRecord, ...attendance];
    }

    setAttendance(updated);
    saveState('siap_attendance', updated);

    // Trigger otomatis email untuk absensi sukses
    if (student.parentEmail) {
      simulateEmailDispatch(
        student.parentEmail,
        `Orangtua ${student.name}`,
        `SIAP Absensi Notifikasi: ${student.name} tanggal ${dateStr}`,
        `Pemberitahuan resmi dari pihak Sekolah bahwa siswa ${student.name} (Kelas ${student.class}) tercatat dengan kehadiran "${status.toUpperCase()}" pada tanggal ${dateStr}.`,
        'Absensi'
      );
    }
  };

  const handleDeleteAttendance = (id: string) => {
    const updated = attendance.filter(a => a.id !== id);
    setAttendance(updated);
    saveState('siap_attendance', updated);
  };

  // --- HARI LIBUR WRITERS ---
  const handleAddHoliday = (date: string, description: string) => {
    if (holidays.some(h => h.date === date)) return;
    const newHoliday: Holiday = {
      id: 'hol-' + Date.now(),
      date,
      description
    };
    const updated = [newHoliday, ...holidays];
    setHolidays(updated);
    saveState('siap_holidays', updated);
  };

  const handleDeleteHoliday = (id: string) => {
    const updated = holidays.filter(h => h.id !== id);
    setHolidays(updated);
    saveState('siap_holidays', updated);
  };

  // --- NILAI SISWA WRITERS ---
  const handleSaveGrade = (gradeData: Omit<Grade, 'id' | 'timestamp'>) => {
    const existingIndex = grades.findIndex(
      g => g.nisn === gradeData.nisn &&
           g.subject === gradeData.subject &&
           g.academicYear === gradeData.academicYear &&
           g.semester === gradeData.semester
    );

    let updated: Grade[];
    if (existingIndex !== -1) {
      // Edit
      updated = grades.map((g, idx) => {
        if (idx === existingIndex) {
          return {
            ...g,
            ...gradeData,
            timestamp: new Date().toISOString()
          };
        }
        return g;
      });
    } else {
      // Add
      const newG: Grade = {
        ...gradeData,
        id: 'g-' + Date.now(),
        timestamp: new Date().toISOString()
      };
      updated = [newG, ...grades];
    }

    setGrades(updated);
    saveState('siap_grades', updated);
  };

  const handleSendGradeEmail = (gradeId: string) => {
    const grade = grades.find(g => g.id === gradeId);
    if (!grade) return;

    const student = students.find(s => s.nisn === grade.nisn);
    if (!student) return;

    const sumAvg = grade.sumatif && grade.sumatif.length > 0 ? grade.sumatif.reduce((s, v) => s + v, 0) / grade.sumatif.length : 0;
    const avg = Math.round(((sumAvg + (grade.sts ?? 0) + (grade.sas ?? 0)) / 3) * 10) / 10;

    if (student.parentEmail) {
      simulateEmailDispatch(
        student.parentEmail,
        `Orangtua ${student.name}`,
        `Laporan Nilai Belajar: ${grade.subject} - ${student.name}`,
        `Yth. Bapak/Ibu Wali Murid dari ${student.name}, berikut rincian pencapaian nilai akademik putra/putri Anda untuk Mata Pelajaran ${grade.subject} (Semester ${grade.semester} TP ${grade.academicYear}):\nNilai Sumatif: ${(grade.sumatif || []).join(', ')} (Rata-rata: ${Math.round(sumAvg * 10) / 10})\nSTS: ${grade.sts ?? 0}\nSAS: ${grade.sas ?? 0}\nNilai Rata-rata Rapor Akhir: ${avg}. Kriteria status: ${avg >= 75 ? 'SANGAT BAIK' : 'REMEDIAL'}.`,
        'Nilai'
      );
    }
  };

  const handleDeleteGrade = (id: string) => {
    const updated = grades.filter(g => g.id !== id);
    setGrades(updated);
    saveState('siap_grades', updated);
  };

  // --- RECORD WRITERS ---
  const handleAddCase = (caseReport: Omit<CaseReport, 'id'>) => {
    const newC: CaseReport = {
      ...caseReport,
      id: 'c-' + Date.now()
    };
    const updated = [newC, ...cases];
    setCases(updated);
    saveState('siap_cases', updated);
  };

  const handleSendCaseEmail = (caseId: string) => {
    const record = cases.find(c => c.id === caseId);
    if (!record) return;

    const student = students.find(s => s.nisn === record.nisn);
    if (!student) return;

    if (student.parentEmail) {
      simulateEmailDispatch(
        student.parentEmail,
        `Orangtua ${student.name}`,
        `SIAP Laporan BK: ${student.name} (Pemberitahuan Pelanggaran)`,
        `Kami dari bagian Bimbingan Konseling menginformasikan bahwa siswa ${student.name} tercatat memiliki catatan kasus/pelanggaran "${record.caseName}" kategori pelanggaran ${record.category.toUpperCase()} pada tanggal ${record.date}.\nTindakan/resolusi sekolah: ${record.resolution}. Mohon perhatian dan kerjasamanya dalam membimbing siswa.`,
        'Kasus'
      );
    }
  };

  const handleDeleteCase = (id: string) => {
    const updated = cases.filter(c => c.id !== id);
    setCases(updated);
    saveState('siap_cases', updated);
  };

  const handleAddAchievement = (achievement: Omit<Achievement, 'id'>) => {
    const newA: Achievement = {
      ...achievement,
      id: 'ac-' + Date.now()
    };
    const updated = [newA, ...achievements];
    setAchievements(updated);
    saveState('siap_achievements', updated);
  };

  const handleSendAchievementEmail = (achievementId: string) => {
    const record = achievements.find(ac => ac.id === achievementId);
    if (!record) return;

    const student = students.find(s => s.nisn === record.nisn);
    if (!student) return;

    if (student.parentEmail) {
      simulateEmailDispatch(
        student.parentEmail,
        `Orangtua ${student.name}`,
        `SIAP Penghargaan Prestasi Siswa: Selamat Kepada ${student.name}!`,
        `Kabar Prestasi Gembira! Kami mengucapkan selamat kepada putra/putri Anda ${student.name} atas pencapaian luar biasa meraih prestasi "${record.achievementName}" tingkat ${record.level.toUpperCase()} pada tanggal ${record.date}.\nKeterangan penghargaan: ${record.description}. Semoga dapat dipertahankan dan ditingkatkan.`,
        'Prestasi'
      );
    }
  };

  const handleDeleteAchievement = (id: string) => {
    const updated = achievements.filter(ac => ac.id !== id);
    setAchievements(updated);
    saveState('siap_achievements', updated);
  };

  const handleSendCashBillEmail = (studentNisn: string, type: 'Uang Kas' | 'Tabungan') => {
    const student = students.find(s => s.nisn === studentNisn);
    if (!student) return;

    if (student.parentEmail) {
      if (type === 'Uang Kas') {
        simulateEmailDispatch(
          student.parentEmail,
          `Orangtua ${student.name}`,
          `Tagihan Uang Kas Sekolah: ${student.name}`,
          `Yth. Bapak/Ibu Wali Murid dari ${student.name} (Kelas ${student.class}), kami menginformasikan bahwa saat ini terdapat tagihan uang kas aktif sebesar Rp ${student.cashBill.toLocaleString('id-ID')}.\n\nMohon untuk dapat segera menyelesaikan pembayaran melalui Wali Kelas.\n\nTerima kasih atas perhatian dan kerjasama Anda.`,
          'Tagihan Uang Kas'
        );
      } else {
        simulateEmailDispatch(
          student.parentEmail,
          `Orangtua ${student.name}`,
          `Laporan Saldo Tabungan Siswa: ${student.name}`,
          `Yth. Bapak/Ibu Wali Murid dari ${student.name} (Kelas ${student.class}), berikut adalah rincian saldo tabungan putra/putri Anda yang tercatat di sistem saat ini:\n\nSaldo Tabungan: Rp ${student.savings.toLocaleString('id-ID')}\n\nTerima kasih atas kepercayaan Anda menyimpan dana di sekolah kami.`,
          'Tabungan'
        );
      }
    }
  };

  // --- ACADEMIC SETTING WRITER ---
  const handleUpdateAcademic = (updated: AcademicSetting) => {
    setAcademicSetting(updated);
    saveState('siap_academic', updated);
  };

  // --- SYSTEM SETTING WRITER ---
  const handleUpdateSystem = (updated: SystemSetting) => {
    setSystemSetting(updated);
    saveState('siap_system', updated);
  };

  // --- TEACHERS WRITERS ---
  const handleAddTeacher = (teacher: Teacher) => {
    const updated = [teacher, ...teachers];
    setTeachers(updated);
    saveState('siap_teachers', updated);
  };

  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    const updated = teachers.map(t => t.nuptk === updatedTeacher.nuptk ? updatedTeacher : t);
    setTeachers(updated);
    saveState('siap_teachers', updated);
  };

  const handleDeleteTeacher = (nuptk: string) => {
    const updated = teachers.filter(t => t.nuptk !== nuptk);
    setTeachers(updated);
    saveState('siap_teachers', updated);
  };

  const handleUpdateYear = (year: string) => {
    const updated = { ...academicSetting, activeYear: year };
    setAcademicSetting(updated);
    saveState('siap_academic', updated);
  };

  const handleUpdateSemester = (semester: 'Ganjil' | 'Genap') => {
    const updated = { ...academicSetting, activeSemester: semester };
    setAcademicSetting(updated);
    saveState('siap_academic', updated);
  };

  // --- BACKUP & RESTORE WRITERS ---
  const handleRestoreData = (restored: {
    students?: Student[];
    teachers?: Teacher[];
    attendance?: Attendance[];
    grades?: Grade[];
    cases?: CaseReport[];
    achievements?: Achievement[];
    emails?: EmailLog[];
    academicSetting?: AcademicSetting;
    systemSetting?: SystemSetting;
  }) => {
    if (restored.students) {
      setStudents(restored.students);
      saveState('siap_students', restored.students);
    }
    if (restored.teachers) {
      setTeachers(restored.teachers);
      saveState('siap_teachers', restored.teachers);
    }
    if (restored.attendance) {
      setAttendance(restored.attendance);
      saveState('siap_attendance', restored.attendance);
    }
    if (restored.grades) {
      setGrades(restored.grades);
      saveState('siap_grades', restored.grades);
    }
    if (restored.cases) {
      setCases(restored.cases);
      saveState('siap_cases', restored.cases);
    }
    if (restored.achievements) {
      setAchievements(restored.achievements);
      saveState('siap_achievements', restored.achievements);
    }
    if (restored.emails) {
      setEmails(restored.emails);
      saveState('siap_emails', restored.emails);
    }
    if (restored.academicSetting) {
      setAcademicSetting(restored.academicSetting);
      saveState('siap_academic', restored.academicSetting);
    }
    if (restored.systemSetting) {
      setSystemSetting(restored.systemSetting);
      saveState('siap_system', restored.systemSetting);
    }
  };

  const handleResetToDefault = () => {
    localStorage.removeItem('siap_students');
    localStorage.removeItem('siap_teachers');
    localStorage.removeItem('siap_attendance');
    localStorage.removeItem('siap_grades');
    localStorage.removeItem('siap_cases');
    localStorage.removeItem('siap_achievements');
    localStorage.removeItem('siap_emails');
    localStorage.removeItem('siap_academic');
    localStorage.removeItem('siap_system');

    setSystemSetting(INITIAL_SYSTEM);
    setAcademicSetting(INITIAL_ACADEMIC);
    setStudents(INITIAL_STUDENTS);
    setTeachers(INITIAL_TEACHERS);
    setAttendance(INITIAL_ATTENDANCE(INITIAL_ACADEMIC.activeYear, INITIAL_ACADEMIC.activeSemester));
    setGrades(INITIAL_GRADES(INITIAL_ACADEMIC.activeYear, INITIAL_ACADEMIC.activeSemester));
    setCases(INITIAL_CASES(INITIAL_ACADEMIC.activeYear, INITIAL_ACADEMIC.activeSemester));
    setAchievements(INITIAL_ACHIEVEMENTS(INITIAL_ACADEMIC.activeYear, INITIAL_ACADEMIC.activeSemester));
    setEmails(INITIAL_EMAILS);
  };

  // --- CONDITIONAL PORTAL MENU NAVIGATION ROUTING ---
  const renderContent = () => {
    if (!currentUser) return null;

    switch (activeMenu) {
      case 'dashboard':
        return (
          <Dashboard
            role={currentUser.role}
            studentNisn={currentUser.studentNisn}
            students={students}
            teachers={teachers}
            attendance={attendance}
            grades={grades}
            cases={cases}
            achievements={achievements}
            emails={emails}
            academicYear={academicSetting.activeYear}
            semester={academicSetting.activeSemester}
          />
        );
      case 'profil':
        if (currentUser.role === 'SISWA' && currentUser.studentNisn) {
          const studentObj = students.find(s => s.nisn === currentUser.studentNisn);
          if (studentObj) {
            return (
              <SiswaProfil
                student={studentObj}
                onUpdatePhoto={handleUpdateStudentPhoto}
                academicYear={academicSetting.activeYear}
                semester={academicSetting.activeSemester}
              />
            );
          }
        }
        return <div className="text-white text-xs italic">Profil siswa tidak ditemukan.</div>;

      case 'siswa':
        return (
          <SiswaList
            students={students}
            onAddStudent={handleAddStudent}
            onAddStudentsBulk={handleAddStudentsBulk}
            onEditStudent={handleEditStudent}
            onDeleteStudent={handleDeleteStudent}
            schoolName={systemSetting.schoolName}
            academicYear={academicSetting.activeYear}
            semester={academicSetting.activeSemester}
            availableClasses={academicSetting.classes}
            role={currentUser.role}
          />
        );

      case 'absensi-scan':
      case 'absensi-siswa':
        return (
          <AbsensiSec
            students={students}
            attendance={attendance}
            onMarkAttendance={handleMarkAttendance}
            onDeleteAttendance={handleDeleteAttendance}
            schoolName={systemSetting.schoolName}
            academicYear={academicSetting.activeYear}
            semester={academicSetting.activeSemester}
            availableClasses={academicSetting.classes}
            role={currentUser.role}
            studentNisn={currentUser.studentNisn}
            activeMenu={activeMenu}
            holidays={holidays}
            onAddHoliday={handleAddHoliday}
            onDeleteHoliday={handleDeleteHoliday}
          />
        );

      case 'nilai-input':
      case 'nilai-siswa':
        return (
          <NilaiSec
            students={students}
            grades={grades}
            onSaveGrade={handleSaveGrade}
            onSendGradeEmail={handleSendGradeEmail}
            onDeleteGrade={handleDeleteGrade}
            schoolName={systemSetting.schoolName}
            academicYear={academicSetting.activeYear}
            semester={academicSetting.activeSemester}
            availableClasses={academicSetting.classes}
            availableSubjects={academicSetting.subjects}
            role={currentUser.role}
            studentNisn={currentUser.studentNisn}
            activeMenu={activeMenu}
          />
        );

      case 'kasus':
      case 'prestasi':
        return (
          <RecordSec
            students={students}
            cases={cases}
            achievements={achievements}
            onAddCase={handleAddCase}
            onAddAchievement={handleAddAchievement}
            onSendCaseEmail={handleSendCaseEmail}
            onSendAchievementEmail={handleSendAchievementEmail}
            onDeleteCase={handleDeleteCase}
            onDeleteAchievement={handleDeleteAchievement}
            schoolName={systemSetting.schoolName}
            academicYear={academicSetting.activeYear}
            semester={academicSetting.activeSemester}
            availableClasses={academicSetting.classes}
            role={currentUser.role}
            studentNisn={currentUser.studentNisn}
            activeMenu={activeMenu}
          />
        );

      case 'uang-kas':
        return (
          <UangKasSec
            students={students}
            onEditStudent={handleEditStudent}
            onSendCashBillEmail={handleSendCashBillEmail}
            schoolName={systemSetting.schoolName}
            academicYear={academicSetting.activeYear}
            semester={academicSetting.activeSemester}
            availableClasses={academicSetting.classes}
            role={currentUser.role}
            studentNisn={currentUser.studentNisn}
          />
        );

      case 'qr-code':
        return (
          <QrCodeSec
            students={students}
            availableClasses={academicSetting.classes}
            schoolName={systemSetting.schoolName}
          />
        );

      case 'kartu-siswa':
        return (
          <KartuSiswaSec
            students={students}
            availableClasses={academicSetting.classes}
            systemSetting={systemSetting}
          />
        );

      case 'backup-restore':
        return (
          <BackupRestoreSec
            students={students}
            teachers={teachers}
            attendance={attendance}
            grades={grades}
            cases={cases}
            achievements={achievements}
            emails={emails}
            academicSetting={academicSetting}
            systemSetting={systemSetting}
            onRestoreData={handleRestoreData}
            onResetToDefault={handleResetToDefault}
            role={currentUser.role}
            schoolName={systemSetting.schoolName}
          />
        );

      case 'set-akademik':
      case 'set-sistem':
      case 'set-guru':
        return (
          <SettingsSec
            academicSetting={academicSetting}
            systemSetting={systemSetting}
            teachers={teachers}
            onUpdateAcademic={handleUpdateAcademic}
            onUpdateSystem={handleUpdateSystem}
            onAddTeacher={handleAddTeacher}
            onUpdateTeacher={handleUpdateTeacher}
            onDeleteTeacher={handleDeleteTeacher}
            availableSubjects={academicSetting.subjects}
            activeMenu={activeMenu}
          />
        );

      case 'unduh-aplikasi':
        return (
          <UnduhAplikasiSec schoolName={systemSetting.schoolName} />
        );

      default:
        return <div className="text-white">Halaman tidak ditemukan.</div>;
    }
  };

  // --- IF NOT LOGGED IN, RENDER THE PROFESSIONAL LOGIN PAGE ---
  if (!currentUser) {
    return (
      <Login
        onLogin={handleLogin}
        logoUrl={systemSetting.logoUrl}
        schoolName={systemSetting.schoolName}
        adminUsername={systemSetting.adminUsername}
        adminPassword={systemSetting.adminPassword}
      />
    );
  }

  // --- IF LOGGED IN, RENDER MASTER SIDEBAR + WRAPPER BODY LAYOUT ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-emerald-500 selection:text-white">
      {/* Collapsible Sidebar */}
      <Sidebar
        role={currentUser.role}
        userName={currentUser.name}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        onLogout={handleLogout}
        logoUrl={systemSetting.logoUrl}
        schoolName={systemSetting.schoolName}
        academicYear={academicSetting.activeYear}
        semester={academicSetting.activeSemester}
        academicYears={academicSetting.years}
        semesters={academicSetting.semesters}
        onYearChange={handleUpdateYear}
        onSemesterChange={handleUpdateSemester}
      />

      {/* Main Right Side Content Container */}
      <main className="flex-1 lg:pl-64 min-h-screen flex flex-col pt-16 lg:pt-0">
        {/* Top Header Bar */}
        <header className="px-6 py-4 border-b border-slate-900 bg-slate-900/40 backdrop-blur-md flex flex-col sm:flex-row justify-between sm:items-center gap-4 z-10">
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight uppercase">
              SIAP Academic Management System
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">
              Wali Kelas: <span className="text-teal-400">{systemSetting.headmasterName}</span>
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 justify-between sm:justify-end">
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-950/40 border border-slate-800 rounded-xl px-2.5 py-1.5">
                <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Tahun:</span>
                <select
                  value={academicSetting.activeYear}
                  onChange={(e) => handleUpdateYear(e.target.value)}
                  className="bg-transparent text-emerald-400 font-mono font-bold text-[11px] focus:outline-none cursor-pointer"
                >
                  {academicSetting.years.map((yr) => (
                    <option key={yr} value={yr} className="bg-slate-900 text-slate-100">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950/40 border border-slate-800 rounded-xl px-2.5 py-1.5">
                <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Semester:</span>
                <select
                  value={academicSetting.activeSemester}
                  onChange={(e) => handleUpdateSemester(e.target.value as 'Ganjil' | 'Genap')}
                  className="bg-transparent text-teal-400 font-mono font-bold text-[11px] focus:outline-none cursor-pointer"
                >
                  {academicSetting.semesters.map((sem) => (
                    <option key={sem} value={sem} className="bg-slate-900 text-slate-100">
                      {sem}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-right text-[10px] text-slate-500 font-bold uppercase tracking-wider sm:border-l sm:border-slate-800 sm:pl-4">
              <span>Tgl: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </header>

        {/* Inner Content Area */}
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-fadeIn overflow-y-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
