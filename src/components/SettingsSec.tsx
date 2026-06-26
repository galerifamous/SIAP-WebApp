/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Sliders,
  Monitor,
  Briefcase,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Camera,
  HelpCircle,
  Save,
  BookOpen,
  Calendar,
  Edit,
  Key,
  X,
  Lock
} from 'lucide-react';
import { AcademicSetting, SystemSetting, Teacher } from '../types';

interface SettingsSecProps {
  academicSetting: AcademicSetting;
  systemSetting: SystemSetting;
  teachers: Teacher[];
  onUpdateAcademic: (updated: AcademicSetting) => void;
  onUpdateSystem: (updated: SystemSetting) => void;
  onAddTeacher: (teacher: Teacher) => void;
  onUpdateTeacher: (updated: Teacher) => void;
  onDeleteTeacher: (nuptk: string) => void;
  availableSubjects: string[];
  activeMenu?: string;
}

export default function SettingsSec({
  academicSetting,
  systemSetting,
  teachers,
  onUpdateAcademic,
  onUpdateSystem,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  availableSubjects,
  activeMenu
}: SettingsSecProps) {
  const activeTab = activeMenu === 'set-sistem' ? 'sistem' : activeMenu === 'set-guru' ? 'guru' : 'akademik';

  // --- ACADEMIC SETTINGS STATE ---
  const [newYear, setNewYear] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newClass, setNewClass] = useState('');

  // --- SYSTEM SETTINGS STATE ---
  const [sysName, setSysName] = useState(systemSetting.schoolName);
  const [sysAddress, setSysAddress] = useState(systemSetting.schoolAddress);
  const [sysEmail, setSysEmail] = useState(systemSetting.adminEmail);
  const [sysHead, setSysHead] = useState(systemSetting.headmasterName);
  const [sysLogo, setSysLogo] = useState(systemSetting.logoUrl);
  const [sysAdminUser, setSysAdminUser] = useState(systemSetting.adminUsername || 'admin');
  const [sysAdminPass, setSysAdminPass] = useState(systemSetting.adminPassword || 'admin');
  const logoInputRef = useRef<HTMLInputElement>(null);

  // --- GURU PORTAL STATE ---
  const [showAddGuru, setShowAddGuru] = useState(false);
  const [guruNuptk, setGuruNuptk] = useState('');
  const [guruName, setGuruName] = useState('');
  const [guruSubject, setGuruSubject] = useState(availableSubjects[0] || 'Matematika');
  const [guruEmail, setGuruEmail] = useState('');
  const [guruUsername, setGuruUsername] = useState('');
  const [guruPassword, setGuruPassword] = useState('guru');

  // --- GURU PORTAL EDIT & RESET STATES ---
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');

  const [resettingTeacher, setResettingTeacher] = useState<Teacher | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Save System Settings
  const handleSaveSystem = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSystem({
      schoolName: sysName,
      schoolAddress: sysAddress,
      adminEmail: sysEmail,
      headmasterName: sysHead,
      logoUrl: sysLogo,
      adminUsername: sysAdminUser,
      adminPassword: sysAdminPass
    });
    alert('Pengaturan parameter sistem berhasil diperbarui dan disinkronkan!');
  };

  // Convert uploaded logo to Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSysLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Add Academic Year
  const handleAddYear = () => {
    const val = newYear.trim();
    if (!val) return;
    if (academicSetting.years.includes(val)) {
      alert('Tahun Pelajaran sudah terdaftar.');
      return;
    }
    onUpdateAcademic({
      ...academicSetting,
      years: [...academicSetting.years, val]
    });
    setNewYear('');
  };

  // Add Subject
  const handleAddSubject = () => {
    const val = newSubject.trim();
    if (!val) return;
    if (academicSetting.subjects.includes(val)) {
      alert('Mata Pelajaran sudah terdaftar.');
      return;
    }
    onUpdateAcademic({
      ...academicSetting,
      subjects: [...academicSetting.subjects, val]
    });
    setNewSubject('');
  };

  // Add Class
  const handleAddClass = () => {
    const val = newClass.trim();
    if (!val) return;
    if (academicSetting.classes.includes(val)) {
      alert('Rombel/Kelas sudah terdaftar.');
      return;
    }
    onUpdateAcademic({
      ...academicSetting,
      classes: [...academicSetting.classes, val]
    });
    setNewClass('');
  };

  // Submit Guru Form
  const handleAddGuruSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guruNuptk.trim() || !guruName.trim() || !guruEmail.trim() || !guruUsername.trim()) {
      alert('Harap lengkapi seluruh kolom isian Guru.');
      return;
    }
    if (teachers.some(t => t.nuptk === guruNuptk)) {
      alert('NUPTK Guru tersebut sudah terdaftar.');
      return;
    }

    onAddTeacher({
      nuptk: guruNuptk,
      name: guruName,
      subject: guruSubject,
      email: guruEmail,
      username: guruUsername,
      password: guruPassword
    });

    // Reset
    setGuruNuptk('');
    setGuruName('');
    setGuruEmail('');
    setGuruUsername('');
    setGuruPassword('guru');
    setShowAddGuru(false);
    alert('Tenaga Pendidik baru berhasil ditambahkan!');
  };

  // Edit Guru Handlers
  const handleStartEditGuru = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setEditName(teacher.name);
    setEditSubject(teacher.subject);
    setEditEmail(teacher.email);
    setEditUsername(teacher.username);
    setResettingTeacher(null); // Close reset password if open
    setShowAddGuru(false); // Close add form if open
  };

  const handleSaveEditGuru = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    if (!editName.trim() || !editEmail.trim() || !editUsername.trim()) {
      alert('Harap lengkapi nama, email, dan username Guru.');
      return;
    }

    onUpdateTeacher({
      ...editingTeacher,
      name: editName,
      subject: editSubject,
      email: editEmail,
      username: editUsername
    });

    setEditingTeacher(null);
    alert('Identitas guru berhasil diperbarui!');
  };

  // Password Reset Handlers
  const handleStartResetPassword = (teacher: Teacher) => {
    setResettingTeacher(teacher);
    setNewPassword('');
    setEditingTeacher(null); // Close edit form if open
    setShowAddGuru(false); // Close add form if open
  };

  const handleSaveResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingTeacher) return;
    if (!newPassword.trim()) {
      alert('Harap masukkan kata sandi baru.');
      return;
    }

    onUpdateTeacher({
      ...resettingTeacher,
      password: newPassword
    });

    setResettingTeacher(null);
    setNewPassword('');
    alert('Kata sandi guru berhasil diubah!');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 selection:bg-emerald-500 selection:text-white font-sans text-xs">
      {/* Header tabs navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Pengaturan SIAP</h2>
          <p className="text-slate-400 text-xs mt-1">Konfigurasi database akademik, parameter sistem sekolah, dan manajemen akses tenaga pendidik (Guru)</p>
        </div>
      </div>

      {activeTab === 'akademik' && (
        // --- TAB 1: ACADEMIC SETTINGS ---
        <div className="space-y-6">
          {/* Active Settings Selector */}
          <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" /> Penyetelan Tahun Pelajaran & Semester Aktif
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Tahun Pelajaran Utama</label>
                <select
                  value={academicSetting.activeYear}
                  onChange={(e) => onUpdateAcademic({ ...academicSetting, activeYear: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-bold focus:outline-none"
                >
                  {academicSetting.years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Semester Utama</label>
                <select
                  value={academicSetting.activeSemester}
                  onChange={(e) => onUpdateAcademic({ ...academicSetting, activeSemester: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-bold focus:outline-none"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-3 leading-relaxed italic">
              *CATATAN AHLI CODING: Merubah Tahun Pelajaran atau Semester di atas akan otomatis mengaktifkan ruang data (Absensi, Nilai, Kasus, Prestasi) yang baru khusus untuk periode terpilih, sehingga histori data sebelumnya tersimpan rapi tanpa tumpang tindih. Data direktori siswa tetap konsisten dipertahankan.
            </p>
          </div>

          {/* Directory Multipliers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Add Academic Years */}
            <div className="p-5 bg-slate-950/20 border border-slate-800 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Tahun Pelajaran</h3>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Contoh: 2027/2028"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleAddYear}
                  className="p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-800 rounded-lg p-2 bg-slate-950/40">
                {academicSetting.years.map(y => (
                  <div key={y} className="flex justify-between items-center p-1.5 text-[11px] text-slate-300 bg-slate-900 rounded border border-slate-800/40">
                    <span className="font-semibold">{y}</span>
                    {academicSetting.activeYear === y && (
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-1 rounded">Aktif</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Add Subjects */}
            <div className="p-5 bg-slate-950/20 border border-slate-800 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Mata Pelajaran</h3>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Nama Mapel Baru..."
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleAddSubject}
                  className="p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-800 rounded-lg p-2 bg-slate-950/40">
                {academicSetting.subjects.map(s => (
                  <div key={s} className="p-1.5 text-[11px] text-slate-300 bg-slate-900 rounded border border-slate-800/40 font-semibold">
                    {s}
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Add Classes */}
            <div className="p-5 bg-slate-950/20 border border-slate-800 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Rombel / Kelas</h3>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Contoh: VII-C"
                  value={newClass}
                  onChange={(e) => setNewClass(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleAddClass}
                  className="p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-800 rounded-lg p-2 bg-slate-950/40">
                {academicSetting.classes.map(c => (
                  <div key={c} className="p-1.5 text-[11px] text-slate-300 bg-slate-900 rounded border border-slate-800/40 font-bold text-teal-400">
                    {c}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sistem' && (
        // --- TAB 2: SYSTEM CONFIGURATION ---
        <form onSubmit={handleSaveSystem} className="p-6 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-emerald-400" /> Konfigurasi Parameter Sistem Sekolah & Logo
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* School Name */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Nama Lembaga / Sekolah *</label>
              <input
                type="text"
                required
                value={sysName}
                onChange={(e) => setSysName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* School Headmaster */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Nama Kepala Sekolah *</label>
              <input
                type="text"
                required
                value={sysHead}
                onChange={(e) => setSysHead(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* School Admin Email */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Email Utama Admin Sistem (Untuk Notifikasi) *</label>
              <input
                type="email"
                required
                value={sysEmail}
                onChange={(e) => setSysEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* School Logo */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Unggah & Sinkron Logo Instansi</label>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="flex-1 border-2 border-dashed border-slate-800 hover:border-emerald-500/55 rounded-xl p-3 text-center cursor-pointer transition bg-slate-950/20"
                >
                  <Camera className="w-4 h-4 mx-auto text-slate-500 mb-0.5" />
                  <span className="text-[10px] text-slate-400 font-bold">Ganti Logo PNG/JPG</span>
                  <input
                    type="file"
                    accept="image/*"
                    ref={logoInputRef}
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
                {sysLogo && (
                  <div className="relative w-12 h-12 rounded-xl border border-slate-700 overflow-hidden bg-slate-800 flex items-center justify-center p-1">
                    <img src={sysLogo} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => setSysLogo('')}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-rose-500/80 text-white rounded-full hover:bg-rose-500"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* School Address */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Alamat Lembaga Sekolah</label>
            <textarea
              rows={2}
              value={sysAddress}
              onChange={(e) => setSysAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Admin Credentials Setup */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3.5 mt-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-emerald-400">
              <Sliders className="w-4 h-4" /> Pengaturan Kredensial Administrator
            </h4>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              Anda dapat mengubah nama pengguna dan sandi utama Administrator di bawah ini. Secara default, kredensial masuk adalah <span className="text-emerald-400 font-mono font-bold">admin / admin</span>. Kredensial baru ini akan langsung aktif setelah Anda menyimpannya.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nama Pengguna (Username) Admin Baru *</label>
                <input
                  type="text"
                  required
                  value={sysAdminUser}
                  onChange={(e) => setSysAdminUser(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Kata Sandi (Password) Admin Baru *</label>
                <input
                  type="text"
                  required
                  value={sysAdminPass}
                  onChange={(e) => setSysAdminPass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-6 rounded-lg shadow-lg flex items-center gap-2"
          >
            <Save className="w-4.5 h-4.5" />
            <span>Simpan Parameter Sistem</span>
          </button>
        </form>
      )}

      {activeTab === 'guru' && (
        // --- TAB 3: TEACHERS MANAGEMENT (GURU) ---
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Direktori Tenaga Pendidik (Guru)</h3>
              <p className="text-slate-400 text-[10px] mt-0.5">Kelola seluruh data guru, email, mata pelajaran, dan kredensial hak akses mereka</p>
            </div>
            {!showAddGuru && (
              <button
                onClick={() => setShowAddGuru(true)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 px-3 rounded-xl flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Guru</span>
              </button>
            )}
          </div>

          {/* Form to add Guru */}
          {showAddGuru && (
            <form onSubmit={handleAddGuruSubmit} className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-4 animate-slideDown text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-emerald-400" /> Daftarkan Tenaga Pendidik Baru
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">NUPTK Guru *</label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan 18 digit NUPTK"
                    value={guruNuptk}
                    onChange={(e) => setGuruNuptk(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nama Lengkap & Gelar *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Dra. Herawati, M.Pd."
                    value={guruName}
                    onChange={(e) => setGuruName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Mata Pelajaran Diampu</label>
                  <select
                    value={guruSubject}
                    onChange={(e) => setGuruSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold text-xs"
                  >
                    {availableSubjects.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email Guru (Wajib) *</label>
                  <input
                    type="email"
                    required
                    placeholder="emailguru@gmail.com"
                    value={guruEmail}
                    onChange={(e) => setGuruEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Username Login Guru *</label>
                  <input
                    type="text"
                    required
                    placeholder="username_guru"
                    value={guruUsername}
                    onChange={(e) => setGuruUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Kata Sandi Akses *</label>
                  <input
                    type="text"
                    required
                    placeholder="Sandi"
                    value={guruPassword}
                    onChange={(e) => setGuruPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Form buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddGuru(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-lg border border-slate-700/60"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-lg"
                >
                  Simpan Guru
                </button>
              </div>
            </form>
          )}

          {/* Form to edit Guru Identity */}
          {editingTeacher && (
            <form onSubmit={handleSaveEditGuru} className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-4 animate-slideDown text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
                <Edit className="w-4 h-4 text-emerald-400" /> Edit Identitas Guru: <span className="text-emerald-400 font-mono">{editingTeacher.nuptk}</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">NUPTK Guru (Tetap)</label>
                  <input
                    type="text"
                    disabled
                    value={editingTeacher.nuptk}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-500 font-mono opacity-60 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nama Lengkap & Gelar *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Mata Pelajaran Diampu</label>
                  <select
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold text-xs"
                  >
                    {availableSubjects.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email Guru (Wajib) *</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Username Login Guru *</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Form buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-lg border border-slate-700/60"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-lg"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          )}

          {/* Form to reset Guru Password */}
          {resettingTeacher && (
            <form onSubmit={handleSaveResetPassword} className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-4 animate-slideDown text-xs max-w-md">
              <h4 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-400" /> Ganti Kata Sandi Guru: <span className="text-amber-400 font-bold">{resettingTeacher.name}</span>
              </h4>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Kata Sandi Baru *</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan sandi baru"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 pl-9 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Form buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResettingTeacher(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-lg border border-slate-700/60"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-lg"
                >
                  Ganti Kata Sandi
                </button>
              </div>
            </form>
          )}

          {/* Teachers table */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/10">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider">
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">NUPTK Guru</th>
                  <th className="p-4">Nama Lengkap & Gelar</th>
                  <th className="p-4">Mapel Diampu</th>
                  <th className="p-4">Alamat Email Guru</th>
                  <th className="p-4">Username Login</th>
                  <th className="p-4">Kata Sandi</th>
                  <th className="p-4 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {teachers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-500 italic">
                      Belum ada guru terdaftar di direktori.
                    </td>
                  </tr>
                ) : (
                  teachers.map((t, idx) => (
                    <tr key={t.nuptk} className="hover:bg-slate-800/20 transition duration-100">
                      <td className="p-4 text-center font-semibold text-slate-500">{idx + 1}</td>
                      <td className="p-4 font-mono font-bold text-slate-400">{t.nuptk}</td>
                      <td className="p-4 font-bold text-white text-sm">{t.name}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 rounded border border-emerald-500/10">
                          {t.subject}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 font-mono">{t.email}</td>
                      <td className="p-4 font-semibold text-teal-400">{t.username}</td>
                      <td className="p-4 text-slate-500 font-mono">••••••</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleStartEditGuru(t)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-lg transition"
                            title="Edit Identitas"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleStartResetPassword(t)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-lg transition"
                            title="Ganti Sandi"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Hapus guru ${t.name}? Tindakan ini akan membatalkan hak akses login guru.`)) {
                                onDeleteTeacher(t.nuptk);
                              }
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 rounded-lg transition"
                            title="Hapus Guru"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
