/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'ADMIN' | 'GURU' | 'SISWA';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  email?: string;
  studentNisn?: string; // If Siswa role
  teacherNuptk?: string; // If Guru role
}

export interface Student {
  nisn: string; // Login ID for student
  name: string;
  class: string; // Rombel
  pob: string; // Place of Birth
  dob: string; // Date of Birth
  gender: 'Laki-laki' | 'Perempuan';
  parentName: string;
  parentEmail: string;
  address: string;
  photoUrl: string; // Base64 or URL
  savings: number; // Tabungan
  cashBill: number; // Tagihan uang kas
  academicYear?: string; // Scopes student records to a specific academic year
}

export interface Teacher {
  nuptk: string;
  name: string;
  subject: string;
  email: string;
  username: string;
  password?: string;
  dutyType?: 'GURU_KELAS' | 'GURU_MAPEL';
  assignedClass?: string;
}

export interface Attendance {
  id: string;
  nisn: string;
  studentName: string;
  class: string;
  date: string; // YYYY-MM-DD
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
  academicYear: string;
  semester: string;
  timestamp: string;
}

export interface SumatifDetail {
  name: string; // e.g. "Sumatif 1"
  harian: number[]; // e.g. [80, 85, 90]
}

export interface Grade {
  id: string;
  nisn: string;
  studentName: string;
  class: string;
  subject: string;
  academicYear: string;
  semester: string;
  sumatif: number[]; // Array of averages of daily scores
  sumatifDetails?: SumatifDetail[]; // Detailed daily scores for each sumatif
  sts: number;
  sas: number;
  finalScore?: number;
  timestamp: string;
}

export interface CaseReport {
  id: string;
  nisn: string;
  studentName: string;
  class: string;
  date: string;
  caseName: string;
  category: 'Ringan' | 'Sedang' | 'Berat';
  resolution: string;
  academicYear: string;
  semester: string;
}

export interface Achievement {
  id: string;
  nisn: string;
  studentName: string;
  class: string;
  date: string;
  achievementName: string;
  level: 'Sekolah' | 'Kecamatan' | 'Kabupaten' | 'Provinsi' | 'Nasional' | 'Internasional';
  description: string;
  academicYear: string;
  semester: string;
}

export interface AcademicSetting {
  activeYear: string;
  activeSemester: 'Ganjil' | 'Genap';
  years: string[];
  semesters: ('Ganjil' | 'Genap')[];
  subjects: string[];
  classes: string[];
  subjectExclusions?: { className: string; subject: string }[];
}

export interface SystemSetting {
  schoolName: string;
  schoolAddress: string;
  adminEmail: string;
  headmasterName: string;
  logoUrl: string; // Base64 or custom logo URL
  adminUsername?: string;
  adminPassword?: string;
}

export interface EmailLog {
  id: string;
  timestamp: string;
  recipient: string;
  role: string;
  subject: string;
  content: string;
  status: 'Sending' | 'Success' | 'Failed';
  type: 'Absensi' | 'Nilai' | 'Kasus' | 'Prestasi' | 'Tabungan' | 'Tagihan Uang Kas';
  sender?: string;
  senderName?: string;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
}

export interface ClassStaff {
  classId: string; // e.g. "VII-A"
  waliKelasNuptk: string; // nuptk of homeroom teacher
  guruKelasNuptk: string; // nuptk of class teacher
}
