/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, Teacher, Attendance, Grade, CaseReport, Achievement, AcademicSetting, SystemSetting, EmailLog, ClassStaff } from './types';

export const INITIAL_CLASS_STAFFS: ClassStaff[] = [
  { classId: 'VII-A', waliKelasNuptk: '197605122003121002', guruKelasNuptk: '198504022010012005' },
  { classId: 'VII-B', waliKelasNuptk: '198504022010012005', guruKelasNuptk: '199008152015031003' },
  { classId: 'VIII-A', waliKelasNuptk: '199008152015031003', guruKelasNuptk: '197605122003121002' },
  { classId: 'VIII-B', waliKelasNuptk: '197605122003121002', guruKelasNuptk: '198504022010012005' },
  { classId: 'IX-A', waliKelasNuptk: '198504022010012005', guruKelasNuptk: '199008152015031003' },
  { classId: 'IX-B', waliKelasNuptk: '199008152015031003', guruKelasNuptk: '197605122003121002' }
];

export const INITIAL_STUDENTS: Student[] = [
  {
    nisn: '1234567890',
    name: 'Ahmad Subarjo',
    class: 'IX-A',
    pob: 'Jakarta',
    dob: '2011-04-12',
    gender: 'Laki-laki',
    parentName: 'Hendra Subarjo',
    parentEmail: 'hendrasubarjo@gmail.com',
    address: 'Jl. Merdeka No. 45, Jakarta Pusat',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150',
    savings: 1500000,
    cashBill: 50000,
    academicYear: '2025/2026'
  },
  {
    nisn: '0987654321',
    name: 'Siti Aminah',
    class: 'IX-A',
    pob: 'Bandung',
    dob: '2011-08-23',
    gender: 'Perempuan',
    parentName: 'Rahmat Kartolo',
    parentEmail: 'rahmatkartolo@gmail.com',
    address: 'Jl. Dago No. 102, Bandung',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
    savings: 750000,
    cashBill: 20000,
    academicYear: '2025/2026'
  },
  {
    nisn: '1122334455',
    name: 'Budi Hermawan',
    class: 'VIII-B',
    pob: 'Surabaya',
    dob: '2012-01-15',
    gender: 'Laki-laki',
    parentName: 'Agus Hermawan',
    parentEmail: 'agushermawan@gmail.com',
    address: 'Jl. Darmo Raya No. 12, Surabaya',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    savings: 1200000,
    cashBill: 0,
    academicYear: '2025/2026'
  },
  {
    nisn: '5544332211',
    name: 'Dewi Lestari',
    class: 'VIII-A',
    pob: 'Yogyakarta',
    dob: '2012-11-30',
    gender: 'Perempuan',
    parentName: 'Setyawan Lestari',
    parentEmail: 'setyawanlestari@gmail.com',
    address: 'Jl. Malioboro No. 8, Yogyakarta',
    photoUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=150',
    savings: 500000,
    cashBill: 100000,
    academicYear: '2025/2026'
  },
  {
    nisn: '9988776655',
    name: 'Eko Prasetyo',
    class: 'IX-B',
    pob: 'Semarang',
    dob: '2011-06-05',
    gender: 'Laki-laki',
    parentName: 'Tri Prasetyo',
    parentEmail: 'triprasetyo@gmail.com',
    address: 'Jl. Pemuda No. 88, Semarang',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    savings: 2100000,
    cashBill: 15000,
    academicYear: '2025/2026'
  }
];

export const INITIAL_TEACHERS: Teacher[] = [
  {
    nuptk: '197605122003121002',
    name: 'Drs. Mulyono',
    subject: 'Matematika',
    email: 'mulyono.guru@gmail.com',
    username: 'mulyono',
    password: 'guru',
    dutyType: 'GURU_MAPEL'
  },
  {
    nuptk: '198504022010012005',
    name: 'Siti Nurjanah, S.Pd.',
    subject: 'Guru Kelas (VII-A)',
    email: 'sitinurjanah.guru@gmail.com',
    username: 'sitinurjanah',
    password: 'guru',
    dutyType: 'GURU_KELAS',
    assignedClass: 'VII-A'
  },
  {
    nuptk: '199008152015031003',
    name: 'Andi Wijaya, S.Pd.',
    subject: 'IPA',
    email: 'andiwijaya.guru@gmail.com',
    username: 'andiwijaya',
    password: 'guru',
    dutyType: 'GURU_MAPEL'
  }
];

export const INITIAL_ACADEMIC: AcademicSetting = {
  activeYear: '2025/2026',
  activeSemester: 'Ganjil',
  years: ['2024/2025', '2025/2026', '2026/2027'],
  semesters: ['Ganjil', 'Genap'],
  subjects: ['Matematika', 'Bahasa Indonesia', 'IPA', 'IPS', 'Bahasa Inggris', 'Pendidikan Agama', 'PJOK', 'Seni Budaya'],
  classes: ['VII-A', 'VII-B', 'VIII-A', 'VIII-B', 'IX-A', 'IX-B'],
  kkm: 75
};

export const INITIAL_SYSTEM: SystemSetting = {
  schoolName: 'SMP Negeri 1 Harapan Bangsa',
  schoolAddress: 'Jl. Pendidikan No. 1, Kota Madya, Indonesia',
  adminEmail: 'admin.siap@harapanbangsa.sch.id',
  headmasterName: 'Dr. H. Ahmad Dahlan, M.Pd.',
  logoUrl: '', // Will be rendered dynamically using beautiful SVG icon if empty
  adminUsername: 'admin',
  adminPassword: 'admin',
};

export const INITIAL_ATTENDANCE = (academicYear: string, semester: string): Attendance[] => [
  {
    id: 'att-1',
    nisn: '1234567890',
    studentName: 'Ahmad Subarjo',
    class: 'IX-A',
    date: '2026-06-25',
    status: 'Hadir',
    academicYear,
    semester,
    timestamp: '2026-06-25T07:15:23'
  },
  {
    id: 'att-2',
    nisn: '0987654321',
    studentName: 'Siti Aminah',
    class: 'IX-A',
    date: '2026-06-25',
    status: 'Hadir',
    academicYear,
    semester,
    timestamp: '2026-06-25T07:18:41'
  },
  {
    id: 'att-3',
    nisn: '1122334455',
    studentName: 'Budi Hermawan',
    class: 'VIII-B',
    date: '2026-06-25',
    status: 'Sakit',
    academicYear,
    semester,
    timestamp: '2026-06-25T07:30:00'
  },
  {
    id: 'att-4',
    nisn: '5544332211',
    studentName: 'Dewi Lestari',
    class: 'VIII-A',
    date: '2026-06-25',
    status: 'Izin',
    academicYear,
    semester,
    timestamp: '2026-06-25T07:22:11'
  },
  {
    id: 'att-5',
    nisn: '9988776655',
    studentName: 'Eko Prasetyo',
    class: 'IX-B',
    date: '2026-06-25',
    status: 'Alpa',
    academicYear,
    semester,
    timestamp: '2026-06-25T08:00:00'
  }
];

export const INITIAL_GRADES = (academicYear: string, semester: string): Grade[] => [
  {
    id: 'g-1',
    nisn: '1234567890',
    studentName: 'Ahmad Subarjo',
    class: 'IX-A',
    subject: 'Matematika',
    academicYear,
    semester,
    sumatif: [85, 90],
    sts: 80,
    sas: 90,
    finalScore: 85.8,
    timestamp: '2026-06-24T14:20:00'
  },
  {
    id: 'g-2',
    nisn: '1234567890',
    studentName: 'Ahmad Subarjo',
    class: 'IX-A',
    subject: 'Bahasa Indonesia',
    academicYear,
    semester,
    sumatif: [90],
    sts: 85,
    sas: 88,
    finalScore: 87.7,
    timestamp: '2026-06-24T14:22:00'
  },
  {
    id: 'g-3',
    nisn: '0987654321',
    studentName: 'Siti Aminah',
    class: 'IX-A',
    subject: 'Matematika',
    academicYear,
    semester,
    sumatif: [95, 93],
    sts: 92,
    sas: 96,
    finalScore: 94,
    timestamp: '2026-06-24T15:00:00'
  },
  {
    id: 'g-4',
    nisn: '0987654321',
    studentName: 'Siti Aminah',
    class: 'IX-A',
    subject: 'Bahasa Indonesia',
    academicYear,
    semester,
    sumatif: [88],
    sts: 90,
    sas: 92,
    finalScore: 90,
    timestamp: '2026-06-24T15:05:00'
  },
  {
    id: 'g-5',
    nisn: '1122334455',
    studentName: 'Budi Hermawan',
    class: 'VIII-B',
    subject: 'IPA',
    academicYear,
    semester,
    sumatif: [75, 78],
    sts: 70,
    sas: 80,
    finalScore: 75.5,
    timestamp: '2026-06-24T15:10:00'
  }
];

export const INITIAL_CASES = (academicYear: string, semester: string): CaseReport[] => [
  {
    id: 'c-1',
    nisn: '1234567890',
    studentName: 'Ahmad Subarjo',
    class: 'IX-A',
    date: '2026-06-23',
    caseName: 'Terlambat masuk sekolah selama 3 hari berturut-turut',
    category: 'Ringan',
    resolution: 'Diberikan teguran lisan dan bimbingan oleh wali kelas',
    academicYear,
    semester
  },
  {
    id: 'c-2',
    nisn: '9988776655',
    studentName: 'Eko Prasetyo',
    class: 'IX-B',
    date: '2026-06-20',
    caseName: 'Tidak mengumpulkan tugas Matematika sebanyak 4 kali',
    category: 'Ringan',
    resolution: 'Diminta menyelesaikan tugas di perpustakaan saat jam istirahat',
    academicYear,
    semester
  }
];

export const INITIAL_ACHIEVEMENTS = (academicYear: string, semester: string): Achievement[] => [
  {
    id: 'ac-1',
    nisn: '0987654321',
    studentName: 'Siti Aminah',
    class: 'IX-A',
    date: '2026-06-15',
    achievementName: 'Juara 1 Olimpiade Sains Nasional (OSN) bidang Matematika',
    level: 'Nasional',
    description: 'Memperoleh medali emas tingkat nasional mewakili Provinsi Jawa Barat',
    academicYear,
    semester
  },
  {
    id: 'ac-2',
    nisn: '1122334455',
    studentName: 'Budi Hermawan',
    class: 'VIII-B',
    date: '2026-06-18',
    achievementName: 'Juara 2 Turnamen Bulu Tangkis Tunggal Putra',
    level: 'Kabupaten',
    description: 'Meraih medali perak tingkat Kabupaten dalam Kejuaraan Pelajar',
    academicYear,
    semester
  }
];

export const INITIAL_EMAILS: EmailLog[] = [];
