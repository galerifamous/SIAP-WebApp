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

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  React.useEffect(() => {
    const handleThemeChange = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const toggleExpand = (menu: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const menuActive = (menuId: string) => activeMenu === menuId;

  const getMenuItemClass = (menuId: string) => {
    const active = menuActive(menuId);
    if (active) {
      return isDark
        ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
        : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-bold';
    } else {
      return isDark
        ? 'text-slate-400 hover:text-white hover:bg-slate-800/40'
        : 'text-slate-700 hover:text-emerald-700 hover:bg-[#cbd5ce]/45';
    }
  };

  const getSubmenuItemClass = (menuId: string) => {
    const active = menuActive(menuId);
    if (active) {
      return isDark
        ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500'
        : 'bg-emerald-500/10 text-emerald-700 border-l-2 border-emerald-600 font-bold';
    } else {
      return isDark
        ? 'text-slate-400 hover:text-white hover:bg-slate-800/20'
        : 'text-slate-600 hover:text-emerald-700 hover:bg-[#cbd5ce]/25';
    }
  };

  const getHeaderItemClass = (menuId: string) => {
    return isDark
      ? 'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all duration-200'
      : 'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:text-emerald-700 hover:bg-[#cbd5ce]/45 transition-all duration-200';
  };

  const handleMenuClick = (menuId: string) => {
    setActiveMenu(menuId);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Header Bar - Sticky/Fixed top, styled beautifully instead of floating elements */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 h-16 z-30 flex items-center justify-between px-4 transition-all duration-300 ${
        isDark ? 'bg-[#0f1612] border-b border-[#17221c]' : 'bg-[#f0f5f1] border-b border-[#cbd5ce]'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`p-2 rounded-lg transition-all duration-300 cursor-pointer ${
              isDark 
                ? 'bg-[#0b0f0c] border border-[#17221c] text-[#f0f5f1] hover:bg-[#1a2b1e]' 
                : 'bg-[#ebf1ec] border border-[#cbd5ce] text-slate-700 hover:bg-[#cbd5ce]/50 shadow-[inset_1px_1px_3px_#cbd5ce]'
            }`}
            id="sidebar-toggle"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <School className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            )}
            <span className={`font-bold text-sm tracking-tight transition-colors duration-300 ${
              isDark ? 'text-white' : 'text-[#0f1612]'
            }`}>SIAP</span>
          </div>
        </div>
        <div className={`text-[10px] font-mono px-2.5 py-1 border rounded-lg transition-all duration-300 ${
          isDark 
            ? 'text-slate-400 bg-[#0b0f0c] border-[#17221c]' 
            : 'text-emerald-700 bg-[#ebf1ec] border-[#cbd5ce]'
        }`}>
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col justify-between transition-all duration-300 transform lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isDark 
            ? 'bg-[#0b0f0c] border-r border-[#17221c]' 
            : 'bg-[#ebf1ec] border-r border-[#cbd5ce]'
        } font-sans selection:bg-emerald-500 selection:text-white`}
      >
        {/* Upper Sidebar */}
        <div className="flex-1 flex flex-col overflow-y-auto pt-6 pb-4">
          {/* Brand Logo and Title */}
          <div className="px-5 mb-6 flex items-center gap-3">
            <div className={`flex-shrink-0 rounded-xl border shadow-inner overflow-hidden flex items-center justify-center transition-all duration-300 ${
              logoUrl ? 'w-12 h-12 p-0.5' : 'p-2'
            } ${
              isDark 
                ? 'bg-emerald-500/10 border-emerald-500/20' 
                : 'bg-white border-[#cbd5ce] shadow-[2px_2px_5px_#cbd5ce]'
            }`}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                <School className={`w-8 h-8 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              )}
            </div>
            <div className="min-w-0">
              <h2 className={`text-lg font-bold tracking-tight flex items-center gap-1.5 leading-none transition-colors duration-300 ${
                isDark ? 'text-white' : 'text-[#0f1612]'
              }`}>
                SIAP
              </h2>
              <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-wider truncate" title={schoolName}>
                {schoolName}
              </p>
            </div>
          </div>

          {/* Academic Stats Box */}
          <div className={`mx-4 mb-5 p-3.5 rounded-xl space-y-3 transition-all duration-300 ${
            isDark 
              ? 'bg-[#070a08] border border-[#17221c]' 
              : 'bg-[#f0f5f1] border border-white shadow-[4px_4px_10px_#cbd5ce,-4px_-4px_10px_#ffffff]'
          }`}>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                Tahun Pelajaran
              </label>
              <select
                value={academicYear}
                onChange={(e) => onYearChange(e.target.value)}
                className={`w-full border rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all duration-300 cursor-pointer ${
                  isDark 
                    ? 'bg-[#0f1612] border-[#17221c] text-emerald-400' 
                    : 'bg-[#ebf1ec] border-[#cbd5ce] text-emerald-700'
                }`}
              >
                {academicYears.map((yr) => (
                  <option key={yr} value={yr} className={isDark ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-800"}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => onSemesterChange(e.target.value as 'Ganjil' | 'Genap')}
                className={`w-full border rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all duration-300 cursor-pointer ${
                  isDark 
                    ? 'bg-[#0f1612] border-[#17221c] text-teal-400' 
                    : 'bg-[#ebf1ec] border-[#cbd5ce] text-emerald-600'
                }`}
              >
                {semesters.map((sem) => (
                  <option key={sem} value={sem} className={isDark ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-800"}>
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
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${getMenuItemClass('dashboard')}`}
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${getMenuItemClass('profil')}`}
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${getMenuItemClass('siswa')}`}
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${getMenuItemClass('naik-kelas')}`}
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
                  className={getHeaderItemClass('absensi')}
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
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${getSubmenuItemClass('absensi-scan')}`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Scan Barcode Absensi</span>
                    </button>
                    <button
                      onClick={() => handleMenuClick('absensi-siswa')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${getSubmenuItemClass('absensi-siswa')}`}
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${getMenuItemClass('absensi-siswa')}`}
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
                  className={getHeaderItemClass('nilai')}
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
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${getSubmenuItemClass('nilai-input')}`}
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Input Nilai Siswa</span>
                    </button>
                    <button
                      onClick={() => handleMenuClick('nilai-siswa')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${getSubmenuItemClass('nilai-siswa')}`}
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${getMenuItemClass('nilai-siswa')}`}
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
                className={getHeaderItemClass('record')}
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
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${getSubmenuItemClass('kasus')}`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Laporan Kasus Siswa</span>
                  </button>
                  <button
                    onClick={() => handleMenuClick('prestasi')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${getSubmenuItemClass('prestasi')}`}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Prestasi Siswa</span>
                  </button>
                </div>
              )}
            </div>

            {/* Uang Kas & Tabungan (All Roles except GURU_MAPEL) */}
            {!(role === 'GURU' && teacherDutyType === 'Guru Mapel') && (
              <button
                onClick={() => handleMenuClick('uang-kas')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${getMenuItemClass('uang-kas')}`}
              >
                <div className="flex items-center gap-3">
                  <Coins className="w-4.5 h-4.5" />
                  <span>Uang Kas & Tabungan</span>
                </div>
              </button>
            )}

            {/* QR Code Absen (Admin & Guru Kelas) */}
            {role !== 'SISWA' && !(role === 'GURU' && teacherDutyType === 'Guru Mapel') && (
              <button
                onClick={() => handleMenuClick('qr-code')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${getMenuItemClass('qr-code')}`}
              >
                <div className="flex items-center gap-3">
                  <QrCode className="w-4.5 h-4.5" />
                  <span>QR Code Absen</span>
                </div>
              </button>
            )}

            {/* Kartu Siswa (Admin & Guru Kelas) */}
            {role !== 'SISWA' && !(role === 'GURU' && teacherDutyType === 'Guru Mapel') && (
              <button
                onClick={() => handleMenuClick('kartu-siswa')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${getMenuItemClass('kartu-siswa')}`}
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${getMenuItemClass('backup-restore')}`}
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
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${getMenuItemClass('unduh-aplikasi')}`}
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
                  className={getHeaderItemClass('pengaturan')}
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
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${getSubmenuItemClass('set-akademik')}`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Pengaturan Akademik</span>
                    </button>
                    <button
                      onClick={() => handleMenuClick('set-sistem')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${getSubmenuItemClass('set-sistem')}`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>Pengaturan Sistem</span>
                    </button>
                    <button
                      onClick={() => handleMenuClick('set-guru')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${getSubmenuItemClass('set-guru')}`}
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
        <div className={`p-4 border-t transition-all duration-300 ${
          isDark ? 'border-[#17221c] bg-[#070a08]/30' : 'border-[#cbd5ce] bg-[#f0f5f1]/50 shadow-[inset_1px_1px_3px_#cbd5ce]'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
              isDark ? 'bg-[#121e15] border border-[#17221c] text-[#f0f5f1]' : 'bg-white border border-[#cbd5ce] text-slate-700 shadow-[1px_1px_3px_#cbd5ce]'
            }`}>
              <User className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-extrabold truncate ${isDark ? 'text-white' : 'text-[#0f1612]'}`}>{userName}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {role === 'ADMIN' ? 'Administrator' : role === 'GURU' ? (teacherDutyType || 'Tenaga Pendidik') : 'Siswa Aktif'}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 font-bold text-xs rounded-xl transition-all duration-300 active:scale-[0.98] cursor-pointer ${
              isDark 
                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20' 
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-[2px_2px_5px_#cbd5ce,-2px_-2px_5px_#ffffff]'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>
    </>
  );
}
