/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  QrCode,
  ClipboardList,
  GraduationCap,
  PenTool,
  FileText,
  FolderOpen,
  AlertTriangle,
  Trophy,
  Settings,
  Sliders,
  Monitor,
  Briefcase,
  User,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  School,
  Coins,
  Database,
  CreditCard,
  Download,
  TrendingUp
} from 'lucide-react';
import { Role } from '../types';

interface SidebarProps {
  role: Role;
  userName: string;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  onLogout: () => void;
  logoUrl?: string;
  schoolName: string;
  academicYear: string;
  semester: string;
  academicYears: string[];
  semesters: ('Ganjil' | 'Genap')[];
  onYearChange: (year: string) => void;
  onSemesterChange: (semester: 'Ganjil' | 'Genap') => void;
  teacherDutyType?: string;
}

export default function Sidebar({
  role,
  userName,
  activeMenu,
  setActiveMenu,
  onLogout,
  logoUrl,
  schoolName,
  academicYear,
  semester,
  academicYears,
  semesters,
  onYearChange,
  onSemesterChange,
  teacherDutyType
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    absensi: true,
    nilai: true,
    record: true,
    pengaturan: false
  });

  const toggleExpand = (menu: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const menuActive = (menuId: string) => activeMenu === menuId;

  const handleMenuClick = (menuId: string) => {
    setActiveMenu(menuId);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Header Bar - Sticky/Fixed top, styled beautifully instead of floating elements */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 bg-slate-950/40 border border-slate-800 text-slate-200 rounded-lg hover:bg-slate-800 transition"
            id="sidebar-toggle"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <School className="w-5 h-5 text-emerald-400" />
            )}
            <span className="text-white font-bold text-sm tracking-tight">SIAP versi 1</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 font-mono bg-slate-950/40 px-2.5 py-1 border border-slate-800 rounded-lg">
          {academicYear} | Smtr {semester}
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 transform lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } font-sans selection:bg-emerald-500 selection:text-white`}
      >
        {/* Upper Sidebar */}
        <div className="flex-1 flex flex-col overflow-y-auto pt-6 pb-4">
          {/* Brand Logo and Title */}
          <div className="px-5 mb-6 flex items-center gap-3">
            <div className={`flex-shrink-0 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-inner overflow-hidden flex items-center justify-center ${logoUrl ? 'w-12 h-12 p-0.5' : 'p-2'}`}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                <School className="w-8 h-8 text-emerald-400" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5 leading-none">
                SIAP <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">versi 1</span>
              </h2>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wider truncate" title={schoolName}>
                {schoolName}
              </p>
            </div>
          </div>

          {/* Academic Stats Box */}
          <div className="mx-4 mb-5 p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Tahun Pelajaran
              </label>
              <select
                value={academicYear}
                onChange={(e) => onYearChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-emerald-400 font-mono text-[11px] font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {academicYears.map((yr) => (
                  <option key={yr} value={yr} className="bg-slate-900 text-slate-100">
                    {yr}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => onSemesterChange(e.target.value as 'Ganjil' | 'Genap')}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-teal-400 font-mono text-[11px] font-bold focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                {semesters.map((sem) => (
                  <option key={sem} value={sem} className="bg-slate-900 text-slate-100">
                    {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 space-y-1">
            {/* Dashboard (All Roles) */}
            <button
              onClick={() => handleMenuClick('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                menuActive('dashboard')
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-4.5 h-4.5" />
                <span>Dashboard</span>
              </div>
            </button>

            {/* Profile (Siswa Only) */}
            {role === 'SISWA' && (
              <button
                onClick={() => handleMenuClick('profil')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  menuActive('profil')
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-4.5 h-4.5" />
                  <span>Profil Siswa</span>
                </div>
              </button>
            )}

            {/* Data Siswa (Admin & Guru) */}
            {role !== 'SISWA' && (
              <button
                onClick={() => handleMenuClick('siswa')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  menuActive('siswa')
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4.5 h-4.5" />
                  <span>Data Siswa</span>
                </div>
              </button>
            )}

            {/* Kenaikan Kelas (Admin & Guru) */}
            {role !== 'SISWA' && (
              <button
                onClick={() => handleMenuClick('naik-kelas')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  menuActive('naik-kelas')
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4.5 h-4.5" />
                  <span>Kenaikan Kelas</span>
                </div>
              </button>
            )}

            {/* Absensi (Admin & Guru: Collapsible, Siswa: Flat menu) */}
            {role !== 'SISWA' ? (
              <div className="space-y-1">
                <button
                  onClick={() => toggleExpand('absensi')}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <CalendarCheck className="w-4.5 h-4.5" />
                    <span>Absensi</span>
                  </div>
                  {expandedMenus.absensi ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {expandedMenus.absensi && (
                  <div className="pl-6 space-y-1 animate-slideDown">
                    <button
                      onClick={() => handleMenuClick('absensi-scan')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        menuActive('absensi-scan')
                          ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/20'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Scan Barcode Absensi</span>
                    </button>
                    <button
                      onClick={() => handleMenuClick('absensi-siswa')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        menuActive('absensi-siswa')
                          ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/20'
                      }`}
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>Absensi Siswa</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => handleMenuClick('absensi-siswa')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  menuActive('absensi-siswa')
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CalendarCheck className="w-4.5 h-4.5" />
                  <span>Absensi Siswa</span>
                </div>
              </button>
            )}

            {/* Nilai Siswa (Admin & Guru: Collapsible, Siswa: Flat menu) */}
            {role !== 'SISWA' ? (
              <div className="space-y-1">
                <button
                  onClick={() => toggleExpand('nilai')}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-4.5 h-4.5" />
                    <span>Nilai Siswa</span>
                  </div>
                  {expandedMenus.nilai ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {expandedMenus.nilai && (
                  <div className="pl-6 space-y-1">
                    <button
                      onClick={() => handleMenuClick('nilai-input')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        menuActive('nilai-input')
                          ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/20'
                      }`}
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Input Nilai Siswa</span>
                    </button>
                    <button
                      onClick={() => handleMenuClick('nilai-siswa')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        menuActive('nilai-siswa')
                          ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/20'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Nilai Siswa</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => handleMenuClick('nilai-siswa')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  menuActive('nilai-siswa')
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4.5 h-4.5" />
                  <span>Nilai Siswa</span>
                </div>
              </button>
            )}

            {/* Record (Collapsible for all roles) */}
            <div className="space-y-1">
              <button
                onClick={() => toggleExpand('record')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-4.5 h-4.5" />
                  <span>Record Siswa</span>
                </div>
                {expandedMenus.record ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {expandedMenus.record && (
                <div className="pl-6 space-y-1">
                  <button
                    onClick={() => handleMenuClick('kasus')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      menuActive('kasus')
                        ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/20'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Laporan Kasus Siswa</span>
                  </button>
                  <button
                    onClick={() => handleMenuClick('prestasi')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      menuActive('prestasi')
                        ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/20'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Prestasi Siswa</span>
                  </button>
                </div>
              )}
            </div>

            {/* Uang Kas & Tabungan (All Roles) */}
            <button
              onClick={() => handleMenuClick('uang-kas')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                menuActive('uang-kas')
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Coins className="w-4.5 h-4.5" />
                <span>Uang Kas & Tabungan</span>
              </div>
            </button>

            {/* QR Code Absen (Admin & Guru) */}
            {role !== 'SISWA' && (
              <button
                onClick={() => handleMenuClick('qr-code')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  menuActive('qr-code')
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <QrCode className="w-4.5 h-4.5" />
                  <span>QR Code Absen</span>
                </div>
              </button>
            )}

            {/* Kartu Siswa (Admin & Guru) */}
            {role !== 'SISWA' && (
              <button
                onClick={() => handleMenuClick('kartu-siswa')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  menuActive('kartu-siswa')
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4.5 h-4.5" />
                  <span>Kartu Siswa</span>
                </div>
              </button>
            )}

            {/* Backup & Restore (Admin & Guru) */}
            {role !== 'SISWA' && (
              <button
                onClick={() => handleMenuClick('backup-restore')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  menuActive('backup-restore')
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Database className="w-4.5 h-4.5" />
                  <span>Backup & Restore</span>
                </div>
              </button>
            )}

            {/* Unduh Aplikasi (Semua Akun - Admin, Guru, Siswa) */}
            <button
              onClick={() => handleMenuClick('unduh-aplikasi')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                menuActive('unduh-aplikasi')
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Download className="w-4.5 h-4.5" />
                <span>Unduh Aplikasi</span>
              </div>
            </button>

            {/* Pengaturan (Admin Only: Collapsible) */}
            {role === 'ADMIN' && (
              <div className="space-y-1">
                <button
                  onClick={() => toggleExpand('pengaturan')}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-4.5 h-4.5" />
                    <span>Pengaturan</span>
                  </div>
                  {expandedMenus.pengaturan ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {expandedMenus.pengaturan && (
                  <div className="pl-6 space-y-1">
                    <button
                      onClick={() => handleMenuClick('set-akademik')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        menuActive('set-akademik')
                          ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/20'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Pengaturan Akademik</span>
                    </button>
                    <button
                      onClick={() => handleMenuClick('set-sistem')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        menuActive('set-sistem')
                          ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/20'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>Pengaturan Sistem</span>
                    </button>
                    <button
                      onClick={() => handleMenuClick('set-guru')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        menuActive('set-guru')
                          ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/20'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Guru</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        {/* User Card & Logout (All Roles) */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
              <User className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{userName}</p>
              <p className="text-[10px] text-slate-400/80 font-bold uppercase tracking-wider">
                {role === 'ADMIN' ? 'Administrator' : role === 'GURU' ? (teacherDutyType || 'Tenaga Pendidik') : 'Siswa Aktif'}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs rounded-xl border border-rose-500/20 transition-all active:scale-[0.98]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>
    </>
  );
}
