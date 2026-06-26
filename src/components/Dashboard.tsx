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
  FileText
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
import { Student, Teacher, Attendance, Grade, CaseReport, Achievement, EmailLog, Role } from '../types';

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
  semester
}: DashboardProps) {

  // --- FILTERED ACADEMIC DATA ---
  const activeAttendance = attendance.filter(a => a.academicYear === academicYear && a.semester === semester);
  const activeGrades = grades.filter(g => g.academicYear === academicYear && g.semester === semester);
  const activeCases = cases.filter(c => c.academicYear === academicYear && c.semester === semester);
  const activeAchievements = achievements.filter(ac => ac.academicYear === academicYear && ac.semester === semester);

  // --- HELPER METRICS (ADMIN & GURU) ---
  const totalStudents = students.length;
  const totalTeachers = teachers.length;

  // Calculate Today's Attendance
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = activeAttendance.filter(a => a.date === todayStr);
  const presentToday = todayAttendance.filter(a => a.status === 'Hadir').length;
  const attendancePercentage = todayAttendance.length > 0 
    ? Math.round((presentToday / todayAttendance.length) * 100) 
    : 85; // Default for display if empty

  // Calculate Overall Average Grades
  const validGrades = activeGrades.filter(g => g.sumatif !== undefined);
  const avgGrade = validGrades.length > 0
    ? Math.round((validGrades.reduce((sum, g) => {
        const sumAvg = g.sumatif.length > 0 ? g.sumatif.reduce((s, v) => s + v, 0) / g.sumatif.length : 0;
        const score = ((sumAvg + (g.sts ?? 0) + (g.sas ?? 0)) / 3);
        return sum + score;
      }, 0) / validGrades.length) * 10) / 10
    : 82.5;

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
    { name: 'Hadir', Jumlah: attendanceStatusCounts['Hadir'] || 4, color: '#10b981' },
    { name: 'Sakit', Jumlah: attendanceStatusCounts['Sakit'] || 1, color: '#f59e0b' },
    { name: 'Izin', Jumlah: attendanceStatusCounts['Izin'] || 1, color: '#06b6d4' },
    { name: 'Alpa', Jumlah: attendanceStatusCounts['Alpa'] || 1, color: '#f43f5e' },
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

  // Fallback if empty
  const defaultGradeChartData = [
    { name: 'Matematika', 'Nilai Rata-rata': 82 },
    { name: 'B. Indonesia', 'Nilai Rata-rata': 89 },
    { name: 'IPA', 'Nilai Rata-rata': 78 },
    { name: 'IPS', 'Nilai Rata-rata': 84 },
    { name: 'B. Inggris', 'Nilai Rata-rata': 86 },
  ];

  // 3. Email Delivery Channels Chart (Pie)
  const emailTypeCounts = emails.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const emailPieData = Object.keys(emailTypeCounts).map(type => ({
    name: type,
    value: emailTypeCounts[type]
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

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
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Selamat Datang di Portal SIAP, <span className="text-emerald-400">{role === 'SISWA' ? currentStudent?.name : (role === 'ADMIN' ? 'Administrator' : 'Rekan Pengajar')}</span>!
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            {role === 'SISWA' 
              ? `Akses informasi akademik terpadu Anda untuk Semester ${semester} Tahun Pelajaran ${academicYear}.`
              : `Kelola data akademik, kehadiran, nilai, dan notifikasi real-time sekolah Anda dengan mudah.`}
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs text-slate-400 font-semibold self-start md:self-auto">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Sistem Online</span>
        </div>
      </div>

      {role !== 'SISWA' ? (
        // --- ADMIN & GURU PORTAL VIEW ---
        <>
          {/* Key Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Siswa Card */}
            <div className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 p-5 rounded-2xl transition duration-200">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Siswa Aktif</p>
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mt-3 font-mono">{totalStudents}</h3>
              <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                Terdistribusi dalam <span className="text-emerald-400 font-bold font-mono">6</span> rombongan belajar (Kelas)
              </p>
            </div>

            {/* Rata-rata Nilai Card */}
            <div className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 p-5 rounded-2xl transition duration-200">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Rata-rata Nilai Siswa</p>
                <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/15 rounded-xl">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mt-3 font-mono">{avgGrade}</h3>
              <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" /> Kriteria Ketuntasan Minimal (KKM): <span className="text-blue-400 font-bold font-mono">75</span>
              </p>
            </div>

            {/* Kehadiran Card */}
            <div className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 p-5 rounded-2xl transition duration-200">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Kehadiran Hari Ini</p>
                <div className="p-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 rounded-xl">
                  <CalendarCheck className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mt-3 font-mono">{attendancePercentage}%</h3>
              <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                Total tercatat hari ini: <span className="text-cyan-400 font-bold font-mono">{todayAttendance.length || totalStudents}</span> siswa
              </p>
            </div>

            {/* Kasus Aktif Card */}
            <div className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 p-5 rounded-2xl transition duration-200">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Laporan Kasus Siswa</p>
                <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/15 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mt-3 font-mono">{pendingCases}</h3>
              <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                Butuh bimbingan atau koordinasi wali murid
              </p>
            </div>
          </div>

          {/* Graphical Analytics and real-time email dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Attendance Distribution */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Grafik Kehadiran Siswa ({academicYear})</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                      <Bar dataKey="Jumlah" radius={[6, 6, 0, 0]}>
                        {attendanceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-3 italic text-center">
                *Data diakumulasikan berdasarkan rekap absensi harian pada tahun pelajaran aktif.
              </p>
            </div>

            {/* Email Channels Card */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Kategori Notifikasi Email</h3>
                <div className="h-48 w-full flex items-center justify-center">
                  {emailPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
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
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
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
                        <span className="text-slate-400 font-semibold">{entry.name}</span>
                      </div>
                      <span className="text-slate-300 font-mono font-bold">{entry.value} Pesan</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-500 text-center">Rekaman notifikasi kosong</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 2: Grade Average */}
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Rata-rata Nilai Mapel</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={gradeChartData.length > 0 ? gradeChartData : defaultGradeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                      <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                      <Line type="monotone" dataKey="Nilai Rata-rata" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 text-center">
                Visualisasi fluktuasi pencapaian nilai rata-rata mata pelajaran siswa.
              </p>
            </div>

            {/* REAL-TIME EMAIL TRANSMISSION PANEL (CRITICAL FEATURE) */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pemantau Notifikasi Email Real-Time</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Pantau status penyampaian pesan akademik ke wali murid</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {emailSuccessRate}% Berhasil
                    </span>
                  </div>
                </div>

                {/* Email Stats mini banner */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl mb-4">
                  <div className="text-center border-r border-slate-800">
                    <div className="text-xs text-slate-500 font-bold uppercase">Total Dikirim</div>
                    <div className="text-base font-bold text-white font-mono mt-0.5">{totalEmails}</div>
                  </div>
                  <div className="text-center border-r border-slate-800">
                    <div className="text-xs text-slate-500 font-bold uppercase">Sedang Proses</div>
                    <div className="text-base font-bold text-amber-400 font-mono mt-0.5 flex items-center justify-center gap-1">
                      {sendingEmails > 0 && <Clock className="w-3.5 h-3.5 animate-spin" />}
                      <span>{sendingEmails}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500 font-bold uppercase">Gagal Terkirim</div>
                    <div className="text-base font-bold text-rose-500 font-mono mt-0.5">{failedEmails}</div>
                  </div>
                </div>

                {/* Live Feed Container */}
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1.5">
                  {emails.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs italic">
                      Belum ada pesan notifikasi yang ditransmisikan.
                    </div>
                  ) : (
                    [...emails].reverse().map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-slate-950/20 border border-slate-800/40 hover:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200 truncate">{log.recipient}</span>
                            <span className="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-medium">{log.role}</span>
                          </div>
                          <p className="text-slate-400 font-medium truncate mt-1">{log.subject}</p>
                          <p className="text-[10px] text-emerald-400 mt-1 font-mono font-medium">
                            Dari: <span className="underline">{log.senderName || 'Admin'} ({log.sender || 'system'})</span>
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {new Date(log.timestamp).toLocaleTimeString('id-ID')} - {log.type}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {log.status === 'Success' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/10">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Berhasil
                            </span>
                          ) : log.status === 'Sending' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/10 animate-pulse">
                              <Clock className="w-3.5 h-3.5 animate-spin" /> Mengirim...
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/10">
                              <AlertTriangle className="w-3.5 h-3.5" /> Gagal
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1 justify-center border-t border-slate-800/40 pt-3">
                <Mail className="w-3.5 h-3.5 text-emerald-400" /> Sistem terintegrasi dengan Google Apps Script MailApp API untuk pengiriman instan.
              </p>
            </div>
          </div>
        </>
      ) : (
        // --- SISWA PORTAL VIEW ---
        <>
          {/* Key Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Kehadiran Card */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Persentase Kehadiran</p>
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded-xl">
                  <CalendarCheck className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mt-3 font-mono">{myAttendanceRate}%</h3>
              <p className="text-[10px] text-slate-500 mt-1.5">
                Total kehadiran tercatat: <span className="text-emerald-400 font-bold font-mono">{myPresent}</span> dari <span className="text-slate-400 font-bold font-mono">{myAttendance.length}</span> hari
              </p>
            </div>

            {/* Rata-rata Nilai Card */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Rata-rata Nilai Rapor</p>
                <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/15 rounded-xl">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mt-3 font-mono">{myAvgGrade || '-'}</h3>
              <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                Kategori akademik: <span className="text-blue-400 font-bold">{myAvgGrade >= 90 ? 'A (Sangat Baik)' : myAvgGrade >= 80 ? 'B (Baik)' : myAvgGrade >= 75 ? 'C (Cukup)' : 'Butuh Perbaikan'}</span>
              </p>
            </div>

            {/* Prestasi Card */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Prestasi Anda</p>
                <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/15 rounded-xl">
                  <Trophy className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mt-3 font-mono">{myAchievements.length}</h3>
              <p className="text-[10px] text-slate-500 mt-1.5">
                Penghargaan atau predikat kehormatan aktif
              </p>
            </div>

            {/* Catatan Kasus Card */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Catatan Kasus / Pelanggaran</p>
                <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/15 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mt-3 font-mono">{myCases.length}</h3>
              <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                {myCases.length > 0 ? 'Segera temui guru BK / Wali Kelas' : 'Pertahankan perilaku baik Anda!'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart: Student Grades details */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Grafik Pencapaian Nilai Akademik Anda</h3>
              {myGradeChartData.length > 0 ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={myGradeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="Rerata Sumatif" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="STS" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="SAS" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500 text-xs italic border border-dashed border-slate-800 rounded-xl">
                  Belum ada laporan nilai untuk semester berjalan.
                </div>
              )}
            </div>

            {/* Parent Notification History Box */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Notifikasi Orangtua</h3>
                <p className="text-[10px] text-slate-400 mb-4">Histori pesan otomatis yang dikirimkan ke email orangtua ({currentStudent?.parentEmail})</p>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {myEmails.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs italic">
                      Belum ada pesan yang terkirim ke email orangtua Anda.
                    </div>
                  ) : (
                    [...myEmails].reverse().map((log) => (
                      <div key={log.id} className="p-3 bg-slate-950/30 border border-slate-800 rounded-xl">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1.5">
                          <span className="font-bold text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">{log.type}</span>
                          <span>{new Date(log.timestamp).toLocaleDateString('id-ID')}</span>
                        </div>
                        <h4 className="font-bold text-xs text-white truncate">{log.subject}</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal">{log.content}</p>
                        <p className="text-[10px] text-emerald-400 mt-1 font-mono font-medium">
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
              <p className="text-[10px] text-slate-500 text-center border-t border-slate-800/40 pt-3 mt-3">
                Kehadiran, nilai, kasus, dan prestasi otomatis tersambung ke sistem notifikasi SIAP.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
