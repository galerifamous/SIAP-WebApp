/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  AlertTriangle,
  Mail,
  Send,
  Clock,
  CheckCircle2,
  Trophy,
  Activity,
  ChevronRight,
  TrendingUp,
  FileText,
  QrCode,
  ClipboardList,
  PenTool,
  CreditCard,
  Database,
  Settings,
  User,
  Download,
  Trash2,
  Briefcase,
  Monitor,
  Coins,
  Wallet
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Student, Teacher, Attendance, SholatAttendance, Grade, CaseReport, Achievement, EmailLog, Role } from '../types';

interface DashboardProps {
  role: Role;
  studentNisn?: string;
  students: Student[];
  teachers: Teacher[];
  attendance: Attendance[];
  grades: Grade[];
  cases: CaseReport[];
  achievements: Achievement[];
  emails: EmailLog[];
  academicYear: string;
  semester: string;
  onNavigate?: (menuId: string) => void;
  onClearEmails?: () => void;
  teacherDutyType?: string;
  schoolName?: string;
}

export default function Dashboard({
  role,
  studentNisn,
  students,
  teachers,
  attendance,
  grades,
  cases,
  achievements,
  emails,
  academicYear,
  semester,
  onNavigate,
  onClearEmails,
  teacherDutyType,
  schoolName
}: DashboardProps) {

  const [isDark, setIsDark] = React.useState(() => document.documentElement.classList.contains('dark'));
  React.useEffect(() => {
    const handleThemeChange = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  // Define menu items that exactly mirror sidebar visibility logic
  const menuConfig = [
    {
      label: 'Profil Saya',
      icon: User,
      menu: 'profil',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: role === 'SISWA'
    },
    {
      label: 'Data Siswa',
      icon: Users,
      menu: 'siswa',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: role !== 'SISWA'
    },
    {
      label: 'Kenaikan Kelas',
      icon: TrendingUp,
      menu: 'naik-kelas',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: role !== 'SISWA'
    },
    {
      label: 'QR Code Absen Biasa',
      icon: QrCode,
      menu: 'absensi-scan',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: role !== 'SISWA' && !(role === 'GURU' && teacherDutyType === 'Guru Mapel')
    },
    {
      label: role === 'SISWA' ? 'Kehadiran Saya' : 'Absen Biasa',
      icon: ClipboardList,
      menu: 'absensi-siswa',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: true
    },
    {
      label: 'QR Code Absen Sholat',
      icon: QrCode,
      menu: 'sholat-scan',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: role !== 'SISWA' && !(role === 'GURU' && teacherDutyType === 'Guru Mapel')
    },
    {
      label: role === 'SISWA' ? "Sholat Jama'ah Saya" : 'Absen Sholat Dzuhur',
      icon: CalendarCheck,
      menu: 'sholat-rekap',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: true
    },
    {
      label: 'Input Nilai',
      icon: PenTool,
      menu: 'nilai-input',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: role !== 'SISWA'
    },
    {
      label: role === 'SISWA' ? 'Nilai & Rapor' : 'Nilai Siswa',
      icon: GraduationCap,
      menu: 'nilai-siswa',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: true
    },
    {
      label: role === 'SISWA' ? 'Catatan Perilaku' : 'Kasus Siswa',
      icon: AlertTriangle,
      menu: 'kasus',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: true
    },
    {
      label: role === 'SISWA' ? 'Prestasi Saya' : 'Prestasi Siswa',
      icon: Trophy,
      menu: 'prestasi',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: true
    },
    {
      label: 'Uang Kas',
      icon: Coins,
      menu: 'uang-kas',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: !(role === 'GURU' && teacherDutyType === 'Guru Mapel')
    },
    {
      label: 'Tabungan Siswa',
      icon: Wallet,
      menu: 'tabungan',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: !(role === 'GURU' && teacherDutyType === 'Guru Mapel')
    },
    {
      label: 'Cetak Kartu QR Siswa',
      icon: QrCode,
      menu: 'qr-code',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: role !== 'SISWA' && !(role === 'GURU' && teacherDutyType === 'Guru Mapel')
    },
    {
      label: 'Cetak Kartu',
      icon: FileText,
      menu: 'kartu-siswa',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: role !== 'SISWA' && !(role === 'GURU' && teacherDutyType === 'Guru Mapel')
    },
    {
      label: 'Backup & Restore',
      icon: Database,
      menu: 'backup-restore',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: role !== 'SISWA'
    },

    {
      label: 'Pengaturan Akademik',
      icon: Settings,
      menu: 'set-akademik',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: role === 'ADMIN'
    },
    {
      label: 'Pengaturan Sistem',
      icon: Monitor,
      menu: 'set-sistem',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: role === 'ADMIN'
    },
    {
      label: 'Guru',
      icon: Briefcase,
      menu: 'set-guru',
      color: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50',
      visible: role === 'ADMIN'
    }
  ];

  const visibleMenuItems = menuConfig.filter(item => item.visible);

  // --- FILTERED ACADEMIC DATA ---
  const activeAttendance = attendance.filter(a => a.academicYear === academicYear && a.semester === semester);
  const activeGrades = grades.filter(g => g.academicYear === academicYear && g.semester === semester);
  const activeCases = cases.filter(c => c.academicYear === academicYear && c.semester === semester);
  const activeAchievements = achievements.filter(ac => ac.academicYear === academicYear && ac.semester === semester);

  // Load Sholat Attendance
  const [sholatAttendance, setSholatAttendance] = React.useState<SholatAttendance[]>(() => {
    try {
      const saved = localStorage.getItem('sholat_attendance_db');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('sholat_attendance_db');
      if (saved) {
        setSholatAttendance(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const activeSholatAttendance = sholatAttendance.filter(
    (a) => a.academicYear === academicYear && a.semester === semester
  );

  const sholatStatusCounts = activeSholatAttendance.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sholatChartData = [
    { name: 'Hadir', Jumlah: sholatStatusCounts['Hadir'] || 0, color: '#10b981' },
    { name: 'Izin', Jumlah: sholatStatusCounts['Izin'] || 0, color: '#f59e0b' },
    { name: 'Bolos', Jumlah: sholatStatusCounts['Bolos'] || 0, color: '#ef4444' },
  ];

  // --- HELPER METRICS (ADMIN & GURU) ---
  const totalStudents = students.length;
  const totalTeachers = teachers.length;

  // Calculate Today's Attendance
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = activeAttendance.filter(a => a.date === todayStr);
  const presentToday = todayAttendance.filter(a => a.status === 'Hadir').length;
  const attendancePercentage = todayAttendance.length > 0 
    ? Math.round((presentToday / todayAttendance.length) * 100) 
    : 0; // 0% if empty

  // Calculate Overall Average Grades
  const validGrades = activeGrades.filter(g => g.sumatif !== undefined);
  const avgGrade = validGrades.length > 0
    ? Math.round((validGrades.reduce((sum, g) => {
        const sumAvg = g.sumatif.length > 0 ? g.sumatif.reduce((s, v) => s + v, 0) / g.sumatif.length : 0;
        const score = ((sumAvg + (g.sts ?? 0) + (g.sas ?? 0)) / 3);
        return sum + score;
      }, 0) / validGrades.length) * 10) / 10
    : 0; // 0 if empty

  // Active Cases Count
  const pendingCases = activeCases.length;

  // Email Stats
  const totalEmails = emails.length;
  const successEmails = emails.filter(e => e.status === 'Success').length;
  const sendingEmails = emails.filter(e => e.status === 'Sending').length;
  const failedEmails = emails.filter(e => e.status === 'Failed').length;
  const emailSuccessRate = totalEmails > 0 ? Math.round((successEmails / totalEmails) * 100) : 100;

  // --- RECHARTS CHARTS PREPARATION ---

  // 1. Attendance Distribution Chart (Bar)
  const attendanceStatusCounts = activeAttendance.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const attendanceChartData = [
    { name: 'Hadir', Jumlah: attendanceStatusCounts['Hadir'] || 0, color: '#10b981' },
    { name: 'Sakit', Jumlah: attendanceStatusCounts['Sakit'] || 0, color: '#34d399' },
    { name: 'Izin', Jumlah: attendanceStatusCounts['Izin'] || 0, color: '#059669' },
    { name: 'Alpa', Jumlah: attendanceStatusCounts['Alpa'] || 0, color: '#047857' },
  ];

  // 2. Average Grade by Subject Chart (Line)
  const subjectGrades = activeGrades.reduce((acc, curr) => {
    if (!acc[curr.subject]) {
      acc[curr.subject] = { sum: 0, count: 0 };
    }
    const sumAvg = curr.sumatif && curr.sumatif.length > 0 ? curr.sumatif.reduce((s, v) => s + v, 0) / curr.sumatif.length : 0;
    const finalVal = (sumAvg + (curr.sts ?? 0) + (curr.sas ?? 0)) / 3;
    acc[curr.subject].sum += finalVal;
    acc[curr.subject].count += 1;
    return acc;
  }, {} as Record<string, { sum: number; count: number }>);

  const gradeChartData = Object.keys(subjectGrades).map(subject => ({
    name: subject,
    'Nilai Rata-rata': Math.round((subjectGrades[subject].sum / subjectGrades[subject].count) * 10) / 10
  }));

  // 3. Email Delivery Channels Chart (Pie)
  const emailTypeCounts = emails.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const emailPieData = Object.keys(emailTypeCounts).map(type => ({
    name: type,
    value: emailTypeCounts[type]
  }));

  const COLORS = ['#10b981', '#34d399', '#059669', '#047857', '#6ee7b7', '#065f46'];

  // --- SISWA PORTAL DASHBOARD CALCULATION ---
  const currentStudent = students.find(s => s.nisn === studentNisn);
  const myAttendance = activeAttendance.filter(a => a.nisn === studentNisn);
  const myPresent = myAttendance.filter(a => a.status === 'Hadir').length;
  const myAttendanceRate = myAttendance.length > 0 ? Math.round((myPresent / myAttendance.length) * 100) : 100;

  const myGrades = activeGrades.filter(g => g.nisn === studentNisn);
  const myAvgGrade = myGrades.length > 0
    ? Math.round((myGrades.reduce((sum, g) => {
        const sumAvg = g.sumatif && g.sumatif.length > 0 ? g.sumatif.reduce((s, v) => s + v, 0) / g.sumatif.length : 0;
        return sum + ((sumAvg + (g.sts ?? 0) + (g.sas ?? 0)) / 3);
      }, 0) / myGrades.length) * 10) / 10
    : 0;

  const myCases = activeCases.filter(c => c.nisn === studentNisn);
  const myAchievements = activeAchievements.filter(ac => ac.nisn === studentNisn);
  const myEmails = emails.filter(e => e.recipient === currentStudent?.parentEmail);

  // Student Sholat Attendance Calculations
  const mySholatAttendance = activeSholatAttendance.filter(a => a.nisn === studentNisn);
  const mySholatPresent = mySholatAttendance.filter(a => a.status === 'Hadir').length;
  const mySholatAttendanceRate = mySholatAttendance.length > 0 ? Math.round((mySholatPresent / mySholatAttendance.length) * 100) : 100;

  const mySholatStatusCounts = mySholatAttendance.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mySholatChartData = [
    { name: 'Hadir', Jumlah: mySholatStatusCounts['Hadir'] || 0, color: '#10b981' },
    { name: 'Izin', Jumlah: mySholatStatusCounts['Izin'] || 0, color: '#f59e0b' },
    { name: 'Bolos', Jumlah: mySholatStatusCounts['Bolos'] || 0, color: '#ef4444' },
  ];

  // Student subject grades for charts
  const myGradeChartData = myGrades.map(g => {
    const sumAvg = g.sumatif && g.sumatif.length > 0 ? Math.round((g.sumatif.reduce((s, v) => s + v, 0) / g.sumatif.length) * 10) / 10 : 0;
    return {
      name: g.subject,
      'Rerata Sumatif': sumAvg,
      STS: g.sts ?? 0,
      SAS: g.sas ?? 0,
      Rerata: Math.round(((sumAvg + (g.sts ?? 0) + (g.sas ?? 0)) / 3) * 10) / 10
    };
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className={`p-6 transition-all duration-300 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDark 
          ? 'bg-[#121e15] border border-[#17221c] nm-flat-dark-shallow' 
          : 'bg-[#ebf1ec] border border-[#cbd5ce] nm-flat-light-shallow'
      }`}>
        <div>
          <h1 className={`text-xl md:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Selamat Datang di Portal {schoolName || 'Sistem Informasi Akademik Pelajar'}, <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>{role === 'SISWA' ? currentStudent?.name : (role === 'ADMIN' ? 'Administrator' : 'Rekan Pengajar')}</span>!
          </h1>
          <p className={`text-xs md:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {role === 'SISWA' 
              ? `Akses informasi akademik terpadu Anda untuk Semester ${semester} Tahun Pelajaran ${academicYear}.`
              : `Kelola data akademik, kehadiran, nilai, dan notifikasi real-time sekolah Anda dengan mudah.`}
          </p>
        </div>
        <div className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold self-start md:self-auto transition-all duration-300 ${
          isDark ? 'bg-slate-950/40 border border-slate-800 text-slate-400' : 'bg-white border border-[#cbd5ce] text-slate-700 shadow-[1px_1px_3px_#cbd5ce]'
        }`}>
          <Activity className={`w-4 h-4 animate-pulse ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <span>Sistem Online</span>
        </div>
      </div>

      {role !== 'SISWA' ? (
        // --- ADMIN & GURU PORTAL VIEW ---
        <>
          {/* Key Metric Summary Cards */}
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-1.5 sm:gap-4">
            {/* Siswa Card */}
            <div className={`transition-all duration-300 p-2 sm:p-5 rounded-xl md:rounded-2xl flex flex-col justify-between ${
              isDark 
                ? 'bg-[#121e15] border border-[#17221c] nm-card-dark hover:border-[#223329]' 
                : 'bg-white border border-[#cbd5ce]/60 nm-card-light hover:border-[#96a89c]'
            }`}>
              <div className="flex justify-between items-start gap-1 sm:gap-2">
                <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider leading-tight`}>Total Siswa Aktif</p>
                <div className={`p-1 sm:p-2 rounded-lg sm:rounded-xl shrink-0 transition-all duration-300 ${
                  isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  <Users className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="mt-2 sm:mt-4">
                <h3 className={`text-sm sm:text-2xl md:text-3xl font-extrabold font-mono leading-none ${isDark ? 'text-white' : 'text-slate-800'}`}>{totalStudents}</h3>
                <p className={`text-[7px] sm:text-[10px] md:text-xs mt-1 sm:mt-2 leading-tight ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                  Terdistribusi dlm <span className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} font-bold font-mono`}>6</span> Kelas
                </p>
              </div>
            </div>

            {/* Kehadiran Card */}
            <div className={`transition-all duration-300 p-2 sm:p-5 rounded-xl md:rounded-2xl flex flex-col justify-between ${
              isDark 
                ? 'bg-[#121e15] border border-[#17221c] nm-card-dark hover:border-[#223329]' 
                : 'bg-white border border-[#cbd5ce]/60 nm-card-light hover:border-[#96a89c]'
            }`}>
              <div className="flex justify-between items-start gap-1 sm:gap-2">
                <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider leading-tight`}>Kehadiran Hari Ini</p>
                <div className={`p-1 sm:p-2 rounded-lg sm:rounded-xl shrink-0 transition-all duration-300 ${
                  isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  <CalendarCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="mt-2 sm:mt-4">
                <h3 className={`text-sm sm:text-2xl md:text-3xl font-extrabold font-mono leading-none ${isDark ? 'text-white' : 'text-slate-800'}`}>{attendancePercentage}%</h3>
                <p className={`text-[7px] sm:text-[10px] md:text-xs mt-1 sm:mt-2 leading-tight ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                  Hadir: <span className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} font-bold font-mono`}>{todayAttendance.length || totalStudents}</span> anak
                </p>
              </div>
            </div>

            {/* Kasus Card */}
            <div className={`transition-all duration-300 p-2 sm:p-5 rounded-xl md:rounded-2xl flex flex-col justify-between ${
              isDark 
                ? 'bg-[#121e15] border border-[#17221c] nm-card-dark hover:border-[#223329]' 
                : 'bg-white border border-[#cbd5ce]/60 nm-card-light hover:border-[#96a89c]'
            }`}>
              <div className="flex justify-between items-start gap-1 sm:gap-2">
                <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider leading-tight`}>Laporan Kasus</p>
                <div className={`p-1 sm:p-2 rounded-lg sm:rounded-xl shrink-0 transition-all duration-300 ${
                  isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  <AlertTriangle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="mt-2 sm:mt-4">
                <h3 className={`text-sm sm:text-2xl md:text-3xl font-extrabold font-mono leading-none ${isDark ? 'text-white' : 'text-slate-800'}`}>{pendingCases}</h3>
                <p className={`text-[7px] sm:text-[10px] md:text-xs mt-1 sm:mt-2 leading-tight ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                  Butuh <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>BK</span>
                </p>
              </div>
            </div>
          </div>

          {/* Quick Access Menu Container */}
          <div className={`p-4 rounded-2xl transition-all duration-300 ${
            isDark ? 'bg-[#121e15] border border-[#17221c] nm-flat-dark-shallow' : 'bg-white border border-[#cbd5ce] nm-flat-light-shallow'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-1.5 h-3.5 rounded-full ${isDark ? 'bg-emerald-500' : 'bg-emerald-600'}`} />
              <h4 className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>Akses Cepat Menu Layanan</h4>
            </div>
             <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5 sm:gap-3">
              {visibleMenuItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onNavigate && onNavigate(item.menu)}
                  className={`flex flex-col items-center justify-center p-2.5 sm:p-3 md:p-4 rounded-xl transition duration-150 group text-center cursor-pointer min-h-[75px] sm:min-h-[90px] ${
                    isDark 
                      ? 'bg-slate-950/40 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-800/40' 
                      : 'bg-white border border-[#cbd5ce] shadow-[2px_2px_5px_#cbd5ce,-2px_-2px_5px_#ffffff] hover:border-emerald-600/50 hover:bg-[#ebf1ec]/20'
                  }`}
                >
                  <div className={`p-1.5 sm:p-2 rounded-lg ${item.color} group-hover:scale-110 transition duration-200`}>
                    <item.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <span className={`text-[8px] sm:text-[10px] md:text-xs font-bold group-hover:text-emerald-600 mt-1.5 sm:mt-2 leading-tight line-clamp-2 ${isDark ? 'text-slate-300 group-hover:text-emerald-400' : 'text-slate-700'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Graphical Analytics and real-time email dashboard */}
          {/* Section 1: Integrated Attendance Reports */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 1a: Class Attendance Distribution */}
            <div className={`p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 ${
              isDark ? 'bg-[#121e15] border border-[#17221c] nm-flat-dark-shallow' : 'bg-white border border-[#cbd5ce] nm-flat-light-shallow'
            }`}>
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Grafik Kehadiran Siswa Harian ({academicYear})</h3>
                <div className="h-64 w-full">
                  {activeAttendance.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" debounce={100}>
                      <BarChart data={attendanceChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                        <XAxis dataKey="name" stroke={isDark ? '#64748b' : '#475569'} fontSize={11} />
                        <YAxis stroke={isDark ? '#64748b' : '#475569'} fontSize={11} />
                        <Tooltip contentStyle={
                          isDark 
                            ? { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' } 
                            : { backgroundColor: '#fff', borderColor: '#cbd5ce', borderRadius: '12px', fontSize: '11px', color: '#334155' }
                        } />
                        <Bar dataKey="Jumlah" radius={[6, 6, 0, 0]}>
                          {attendanceChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className={`h-full w-full flex flex-col items-center justify-center border border-dashed rounded-xl ${isDark ? 'border-slate-800 text-slate-500' : 'border-[#cbd5ce] text-slate-500'}`}>
                      <p className="text-xs italic font-medium">Belum ada data kehadiran siswa</p>
                    </div>
                  )}
                </div>
              </div>
              <p className={`text-[10px] mt-3 italic text-center ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                *Data diakumulasikan berdasarkan rekap absensi kelas harian pada tahun pelajaran aktif.
              </p>
            </div>

            {/* Chart 1b: Sholat Dzuhur Berjama'ah Attendance Distribution */}
            <div className={`p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 ${
              isDark ? 'bg-[#121e15] border border-[#17221c] nm-flat-dark-shallow' : 'bg-white border border-[#cbd5ce] nm-flat-light-shallow'
            }`}>
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Grafik Absensi Sholat Dzuhur Berjama'ah</h3>
                <div className="h-64 w-full">
                  {activeSholatAttendance.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" debounce={100}>
                      <BarChart data={sholatChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                        <XAxis dataKey="name" stroke={isDark ? '#64748b' : '#475569'} fontSize={11} />
                        <YAxis stroke={isDark ? '#64748b' : '#475569'} fontSize={11} />
                        <Tooltip contentStyle={
                          isDark 
                            ? { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' } 
                            : { backgroundColor: '#fff', borderColor: '#cbd5ce', borderRadius: '12px', fontSize: '11px', color: '#334155' }
                        } />
                        <Bar dataKey="Jumlah" radius={[6, 6, 0, 0]}>
                          {sholatChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className={`h-full w-full flex flex-col items-center justify-center border border-dashed rounded-xl ${isDark ? 'border-slate-800 text-slate-500' : 'border-[#cbd5ce] text-slate-500'}`}>
                      <p className="text-xs italic font-medium">Belum ada data kehadiran sholat jama'ah</p>
                    </div>
                  )}
                </div>
              </div>
              <p className={`text-[10px] mt-3 italic text-center ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                *Data diakumulasikan berdasarkan absensi sholat jama'ah dzuhur pada tahun pelajaran aktif.
              </p>
            </div>
          </div>

          {/* Section 2: Academic & Communications Reports */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Email Channels Card */}
            <div className={`p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 ${
              isDark ? 'bg-[#121e15] border border-[#17221c] nm-flat-dark-shallow' : 'bg-white border border-[#cbd5ce] nm-flat-light-shallow'
            }`}>
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Kategori Notifikasi Email</h3>
                <div className="h-48 w-full flex items-center justify-center">
                  {emailPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" debounce={100}>
                      <PieChart>
                        <Pie
                          data={emailPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {emailPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={
                          isDark 
                            ? { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' } 
                            : { backgroundColor: '#fff', borderColor: '#cbd5ce', borderRadius: '12px', fontSize: '11px', color: '#334155' }
                        } />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-slate-500 text-xs italic">Belum ada email terkirim</div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 mt-3">
                {emailPieData.length > 0 ? (
                  emailPieData.map((entry, index) => (
                    <div key={entry.name} className="flex justify-between items-center text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>{entry.name}</span>
                      </div>
                      <span className={`font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{entry.value} Pesan</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-500 text-center">Rekaman notifikasi kosong</p>
                )}
              </div>
            </div>

            {/* Chart 2: Grade Average */}
            <div className={`p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 lg:col-span-2 ${
              isDark ? 'bg-[#121e15] border border-[#17221c] nm-flat-dark-shallow' : 'bg-white border border-[#cbd5ce] nm-flat-light-shallow'
            }`}>
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Rata-rata Nilai Mapel</h3>
                <div className="h-64 w-full">
                  {gradeChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" debounce={100}>
                      <LineChart data={gradeChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                        <XAxis dataKey="name" stroke={isDark ? '#64748b' : '#475569'} fontSize={9} />
                        <YAxis stroke={isDark ? '#64748b' : '#475569'} fontSize={11} domain={[0, 100]} />
                        <Tooltip contentStyle={
                          isDark 
                            ? { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' } 
                            : { backgroundColor: '#fff', borderColor: '#cbd5ce', borderRadius: '12px', fontSize: '11px', color: '#334155' }
                        } />
                        <Line type="monotone" dataKey="Nilai Rata-rata" stroke="#10b981" strokeWidth={3} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className={`h-full w-full flex flex-col items-center justify-center border border-dashed rounded-xl ${isDark ? 'border-slate-800 text-slate-500' : 'border-[#cbd5ce] text-slate-500'}`}>
                      <p className="text-xs italic font-medium">Belum ada data nilai mata pelajaran</p>
                    </div>
                  )}
                </div>
              </div>
              <p className={`text-[10px] mt-2 text-center ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                Visualisasi fluktuasi pencapaian nilai rata-rata mata pelajaran siswa.
              </p>
            </div>
          </div>

          <div className="w-full mt-6">
            {/* REAL-TIME EMAIL TRANSMISSION PANEL (CRITICAL FEATURE) */}
            <div className={`p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 ${
              isDark ? 'bg-[#121e15] border border-[#17221c] nm-flat-dark-shallow' : 'bg-white border border-[#cbd5ce] nm-flat-light-shallow'
            }`}>
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>Pemantau Notifikasi Email Real-Time</h3>
                    <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Pantau status penyampaian pesan akademik ke wali murid</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {emailSuccessRate}% Berhasil
                    </span>
                    {role === 'ADMIN' && onClearEmails && (
                      <button
                        onClick={onClearEmails}
                        className={`p-1.5 rounded-lg transition duration-150 flex items-center gap-1 text-[10px] font-bold cursor-pointer ${
                          isDark 
                            ? 'bg-slate-950/40 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30' 
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 hover:border-rose-300 shadow-[1px_1px_2px_#cbd5ce]'
                        }`}
                        title="Hapus Semua Riwayat Email"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Hapus Riwayat</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Email Stats mini banner */}
                <div className={`grid grid-cols-3 gap-3 p-3 rounded-xl mb-4 transition-all duration-300 ${
                  isDark ? 'bg-slate-950/40 border border-slate-800/80' : 'bg-[#ebf1ec] border border-[#cbd5ce]'
                }`}>
                  <div className={`text-center border-r ${isDark ? 'border-slate-800' : 'border-[#cbd5ce]'}`}>
                    <div className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Total Dikirim</div>
                    <div className={`text-base font-bold font-mono mt-0.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>{totalEmails}</div>
                  </div>
                  <div className={`text-center border-r ${isDark ? 'border-slate-800' : 'border-[#cbd5ce]'}`}>
                    <div className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Sedang Proses</div>
                    <div className="text-base font-bold text-amber-500 font-mono mt-0.5 flex items-center justify-center gap-1">
                      {sendingEmails > 0 && <Clock className="w-3.5 h-3.5 animate-spin text-amber-500" />}
                      <span>{sendingEmails}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Gagal Terkirim</div>
                    <div className="text-base font-bold text-rose-500 font-mono mt-0.5">{failedEmails}</div>
                  </div>
                </div>

                {/* Live Feed Container */}
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1.5">
                  {emails.length === 0 ? (
                    <div className={`text-center py-8 text-xs italic ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                      Belum ada pesan notifikasi yang ditransmisikan.
                    </div>
                  ) : (
                    emails.map((log) => (
                      <div
                        key={log.id}
                        className={`p-3 rounded-xl flex items-center justify-between gap-3 text-xs transition-all duration-300 ${
                          isDark 
                            ? 'bg-slate-950/20 border border-slate-800/40 hover:border-slate-800' 
                            : 'bg-[#fcfdfc] border border-[#e2e9e4] shadow-[1px_1px_3px_#e2e9e4] hover:border-emerald-600/30'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{log.recipient}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${isDark ? 'text-slate-400 bg-slate-800' : 'text-slate-600 bg-slate-200/60'}`}>{log.role}</span>
                          </div>
                          <p className={`font-medium truncate mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{log.subject}</p>
                          <p className={`text-[10px] mt-1 font-mono font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            Dari: <span className="underline">{log.senderName || 'Admin'} ({log.sender || 'system'})</span>
                          </p>
                          <p className={`text-[10px] font-mono mt-0.5 flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                            <Clock className="w-3 h-3 text-slate-500" />
                            {new Date(log.timestamp).toLocaleTimeString('id-ID')} - {log.type}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {log.status === 'Success' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/10">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Berhasil
                            </span>
                          ) : log.status === 'Sending' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/10 animate-pulse">
                              <Clock className="w-3.5 h-3.5 animate-spin" /> Mengirim...
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/10">
                              <AlertTriangle className="w-3.5 h-3.5" /> Gagal
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <p className={`text-[10px] mt-3 flex items-center gap-1 justify-center border-t pt-3 ${isDark ? 'text-slate-500 border-slate-800/40' : 'text-slate-600 border-[#cbd5ce]'}`}>
                <Mail className="w-3.5 h-3.5 text-emerald-500" /> Sistem terintegrasi dengan Google Apps Script MailApp API untuk pengiriman instan.
              </p>
            </div>
          </div>
        </>
      ) : (
        // --- SISWA PORTAL VIEW ---
        <>
          {/* Key Metric Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-4">
            {/* Kehadiran Card */}
            <div className={`transition-all duration-300 p-2 sm:p-5 rounded-xl md:rounded-2xl flex flex-col justify-between ${
              isDark 
                ? 'bg-[#121e15] border border-[#17221c] nm-card-dark hover:border-[#223329]' 
                : 'bg-white border border-[#cbd5ce]/60 nm-card-light hover:border-[#96a89c]'
            }`}>
              <div className="flex justify-between items-start gap-1 sm:gap-2">
                <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider leading-tight`}>Persentase Kehadiran</p>
                <div className={`p-1 sm:p-2 rounded-lg sm:rounded-xl shrink-0 transition-all duration-300 ${
                  isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  <CalendarCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="mt-2 sm:mt-4">
                <h3 className={`text-sm sm:text-2xl md:text-3xl font-extrabold font-mono leading-none ${isDark ? 'text-white' : 'text-slate-800'}`}>{myAttendanceRate}%</h3>
                <p className={`text-[7px] sm:text-[10px] md:text-xs mt-1 sm:mt-2 leading-tight ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                  Hadir <span className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} font-bold font-mono`}>{myPresent}</span>/ {myAttendance.length} hr
                </p>
              </div>
            </div>

            {/* Kehadiran Sholat Jama'ah Card */}
            <div className={`transition-all duration-300 p-2 sm:p-5 rounded-xl md:rounded-2xl flex flex-col justify-between ${
              isDark 
                ? 'bg-[#121e15] border border-[#17221c] nm-card-dark hover:border-[#223329]' 
                : 'bg-white border border-[#cbd5ce]/60 nm-card-light hover:border-[#96a89c]'
            }`}>
              <div className="flex justify-between items-start gap-1 sm:gap-2">
                <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider leading-tight`}>Sholat Jama'ah</p>
                <div className={`p-1 sm:p-2 rounded-lg sm:rounded-xl shrink-0 transition-all duration-300 ${
                  isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  <Activity className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="mt-2 sm:mt-4">
                <h3 className={`text-sm sm:text-2xl md:text-3xl font-extrabold font-mono leading-none ${isDark ? 'text-white' : 'text-slate-800'}`}>{mySholatAttendanceRate}%</h3>
                <p className={`text-[7px] sm:text-[10px] md:text-xs mt-1 sm:mt-2 leading-tight ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                  Berjama'ah <span className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} font-bold font-mono`}>{mySholatPresent}</span>/ {mySholatAttendance.length} kali
                </p>
              </div>
            </div>

            {/* Prestasi Card */}
            <div className={`transition-all duration-300 p-2 sm:p-5 rounded-xl md:rounded-2xl flex flex-col justify-between ${
              isDark 
                ? 'bg-[#121e15] border border-[#17221c] nm-card-dark hover:border-[#223329]' 
                : 'bg-white border border-[#cbd5ce]/60 nm-card-light hover:border-[#96a89c]'
            }`}>
              <div className="flex justify-between items-start gap-1 sm:gap-2">
                <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider leading-tight`}>Prestasi Anda</p>
                <div className={`p-1 sm:p-2 rounded-lg sm:rounded-xl shrink-0 transition-all duration-300 ${
                  isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  <Trophy className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="mt-2 sm:mt-4">
                <h3 className={`text-sm sm:text-2xl md:text-3xl font-extrabold font-mono leading-none ${isDark ? 'text-white' : 'text-slate-800'}`}>{myAchievements.length}</h3>
                <p className={`text-[7px] sm:text-[10px] md:text-xs mt-1 sm:mt-2 leading-tight ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                  Penghargaan Aktif
                </p>
              </div>
            </div>

            {/* Catatan Kasus Card */}
            <div className={`transition-all duration-300 p-2 sm:p-5 rounded-xl md:rounded-2xl flex flex-col justify-between ${
              isDark 
                ? 'bg-[#121e15] border border-[#17221c] nm-card-dark hover:border-[#223329]' 
                : 'bg-white border border-[#cbd5ce]/60 nm-card-light hover:border-[#96a89c]'
            }`}>
              <div className="flex justify-between items-start gap-1 sm:gap-2">
                <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider leading-tight`}>Catatan Pelanggaran</p>
                <div className={`p-1 sm:p-2 rounded-lg sm:rounded-xl shrink-0 transition-all duration-300 ${
                  isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  <AlertTriangle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="mt-2 sm:mt-4">
                <h3 className={`text-sm sm:text-2xl md:text-3xl font-extrabold font-mono leading-none ${isDark ? 'text-white' : 'text-slate-800'}`}>{myCases.length}</h3>
                <p className={`text-[7px] sm:text-[10px] md:text-xs mt-1 sm:mt-2 leading-tight ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                  {myCases.length > 0 ? 'Perlu BK' : 'Sangat Baik!'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Access Menu Container */}
          <div className={`p-4 rounded-2xl transition-all duration-300 ${
            isDark ? 'bg-[#121e15] border border-[#17221c] nm-flat-dark-shallow' : 'bg-white border border-[#cbd5ce] nm-flat-light-shallow'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-1.5 h-3.5 rounded-full ${isDark ? 'bg-emerald-500' : 'bg-emerald-600'}`} />
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>Akses Cepat Menu Siswa</h4>
            </div>
             <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5 sm:gap-3">
              {visibleMenuItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onNavigate && onNavigate(item.menu)}
                  className={`flex flex-col items-center justify-center p-2.5 sm:p-3 md:p-4 rounded-xl transition duration-150 group text-center cursor-pointer min-h-[75px] sm:min-h-[90px] ${
                    isDark 
                      ? 'bg-slate-950/40 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-800/40' 
                      : 'bg-white border border-[#cbd5ce] shadow-[2px_2px_5px_#cbd5ce,-2px_-2px_5px_#ffffff] hover:border-emerald-600/50 hover:bg-[#ebf1ec]/20'
                  }`}
                >
                  <div className={`p-1.5 sm:p-2 rounded-lg ${item.color} group-hover:scale-110 transition duration-200`}>
                    <item.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <span className={`text-[8px] sm:text-[10px] md:text-xs font-bold group-hover:text-emerald-600 mt-1.5 sm:mt-2 leading-tight line-clamp-2 ${isDark ? 'text-slate-300 group-hover:text-emerald-400' : 'text-slate-700'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart: Student Grades details */}
            <div className={`p-5 rounded-2xl transition-all duration-300 ${
              isDark ? 'bg-[#121e15] border border-[#17221c] nm-flat-dark-shallow' : 'bg-white border border-[#cbd5ce] nm-flat-light-shallow'
            }`}>
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Grafik Pencapaian Nilai Akademik Anda</h3>
              {myGradeChartData.length > 0 ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%" debounce={100}>
                    <BarChart data={myGradeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                      <XAxis dataKey="name" stroke={isDark ? '#64748b' : '#475569'} fontSize={11} />
                      <YAxis stroke={isDark ? '#64748b' : '#475569'} fontSize={11} domain={[0, 100]} />
                      <Tooltip contentStyle={
                        isDark 
                          ? { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' } 
                          : { backgroundColor: '#fff', borderColor: '#cbd5ce', borderRadius: '12px', fontSize: '11px', color: '#334155' }
                      } />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="Rerata Sumatif" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="STS" fill="#34d399" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="SAS" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className={`text-center py-16 text-xs italic border border-dashed rounded-xl ${isDark ? 'text-slate-500 border-slate-800' : 'text-slate-500 border-[#cbd5ce]'}`}>
                  Belum ada laporan nilai untuk semester berjalan.
                </div>
              )}
            </div>

            {/* Chart: Student Sholat Attendance details */}
            <div className={`p-5 rounded-2xl transition-all duration-300 flex flex-col justify-between ${
              isDark ? 'bg-[#121e15] border border-[#17221c] nm-flat-dark-shallow' : 'bg-white border border-[#cbd5ce] nm-flat-light-shallow'
            }`}>
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Grafik Sholat Dzuhur Berjama'ah Anda</h3>
                {mySholatAttendance.length > 0 ? (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%" debounce={100}>
                      <BarChart data={mySholatChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                        <XAxis dataKey="name" stroke={isDark ? '#64748b' : '#475569'} fontSize={11} />
                        <YAxis stroke={isDark ? '#64748b' : '#475569'} fontSize={11} />
                        <Tooltip contentStyle={
                          isDark 
                            ? { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' } 
                            : { backgroundColor: '#fff', borderColor: '#cbd5ce', borderRadius: '12px', fontSize: '11px', color: '#334155' }
                        } />
                        <Bar dataKey="Jumlah" radius={[6, 6, 0, 0]}>
                          {mySholatChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className={`text-center py-16 text-xs italic border border-dashed rounded-xl ${isDark ? 'text-slate-500 border-slate-800' : 'text-slate-500 border-[#cbd5ce]'}`}>
                    Belum ada rekaman absensi sholat jama'ah untuk semester berjalan.
                  </div>
                )}
              </div>
              <p className={`text-[10px] mt-2 text-center ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                Grafik rekapitulasi kehadiran sholat Dzuhur berjama'ah Anda.
              </p>
            </div>

            {/* Parent Notification History Box */}
            <div className={`p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 ${
              isDark ? 'bg-[#121e15] border border-[#17221c] nm-flat-dark-shallow' : 'bg-white border border-[#cbd5ce] nm-flat-light-shallow'
            }`}>
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Notifikasi Orangtua</h3>
                <p className={`text-[10px] mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Histori pesan otomatis yang dikirimkan ke email orangtua ({currentStudent?.parentEmail})</p>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {myEmails.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs italic">
                      Belum ada pesan yang terkirim ke email orangtua Anda.
                    </div>
                  ) : (
                    myEmails.map((log) => (
                      <div key={log.id} className={`p-3 rounded-xl transition-all duration-300 ${
                        isDark ? 'bg-slate-950/30 border border-slate-800' : 'bg-[#fcfdfc] border border-[#e2e9e4] shadow-[1px_1px_3px_#cbd5ce]'
                      }`}>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1.5">
                          <span className={`font-bold font-mono px-1.5 py-0.5 rounded ${isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50'}`}>{log.type}</span>
                          <span>{new Date(log.timestamp).toLocaleDateString('id-ID')}</span>
                        </div>
                        <h4 className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{log.subject}</h4>
                        <p className={`text-[11px] mt-1 leading-normal ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{log.content}</p>
                        <p className={`text-[10px] mt-1 font-mono font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          Dikirim oleh: {log.senderName || 'Admin'} ({log.sender || 'system'})
                        </p>
                        <div className="mt-2 flex justify-between items-center text-[10px] text-slate-500">
                          <span className="truncate max-w-[150px]">{log.recipient}</span>
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Terkirim
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <p className={`text-[10px] text-center border-t pt-3 mt-3 ${isDark ? 'text-slate-500 border-slate-800/40' : 'text-slate-600 border-[#cbd5ce]'}`}>
                Kehadiran, nilai, kasus, dan prestasi otomatis tersambung ke sistem notifikasi SIAP.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
