/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Printer,
  Search,
  CheckCircle,
  HelpCircle,
  User,
  School,
  Sparkles,
  Eye,
  CreditCard,
  Check,
  Settings,
  Sliders,
  Type
} from 'lucide-react';
import { Student, SystemSetting } from '../types';

interface KartuSiswaSecProps {
  students: Student[];
  availableClasses: string[];
  systemSetting: SystemSetting;
}

type CardTheme = 'emerald' | 'blue' | 'crimson' | 'indigo' | 'dark' | 'amber';

export default function KartuSiswaSec({ students, availableClasses, systemSetting }: KartuSiswaSecProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(students[0] || null);
  
  // Customization States (Allows the admin/teacher to customize EVERYTHING in real-time)
  const [theme, setTheme] = useState<CardTheme>('emerald');
  const [cardTitle, setCardTitle] = useState('KARTU TANDA SISWA');
  const [customSchoolName, setCustomSchoolName] = useState(systemSetting.schoolName || 'MADRASAH ALIYAH NEGERI');
  const [customSchoolAddress, setCustomSchoolAddress] = useState(systemSetting.schoolAddress || 'Jl. Pendidikan No. 45, Jakarta, Indonesia');
  const [customHeadmasterName, setCustomHeadmasterName] = useState(systemSetting.headmasterName || 'H. Mulyono, S.Pd., M.Pd.');
  const [customHeadmasterNip, setCustomHeadmasterNip] = useState('197812052005011002');
  const [customStampText, setCustomStampText] = useState('SIAP V2\nOFFICIAL\nSEAL');
  
  const [showAddress, setShowAddress] = useState(true);
  const [showTtl, setShowTtl] = useState(true);
  const [showGender, setShowGender] = useState(true);
  const [showRules, setShowRules] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [customNotes, setCustomNotes] = useState(
    '1. Kartu ini wajib dibawa setiap hari untuk presensi masuk/pulang.\n2. Tidak boleh dicoret-coret, kotor, atau dipindahtangankan.\n3. Jika menemukan kartu ini, mohon kembalikan ke tata usaha madrasah.'
  );

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || student.nisn.includes(searchQuery);
    const matchesClass = classFilter ? student.class === classFilter : true;
    return matchesSearch && matchesClass;
  });

  // Get QR URL (used for scan-absensi)
  const getQrUrl = (nisn: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${nisn}&color=0f172a&bgcolor=ffffff`;
  };

  // Theme styles dictionary
  const themeStyles: Record<CardTheme, {
    primary: string;
    bgGrad: string;
    accent: string;
    textAccent: string;
    badge: string;
    border: string;
    tint: string;
  }> = {
    emerald: {
      primary: 'bg-emerald-600',
      bgGrad: 'from-emerald-600 to-teal-800',
      accent: 'border-emerald-500',
      textAccent: 'text-emerald-400',
      badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      border: 'border-emerald-500/30',
      tint: 'bg-emerald-500/5',
    },
    blue: {
      primary: 'bg-blue-600',
      bgGrad: 'from-blue-600 to-indigo-800',
      accent: 'border-blue-500',
      textAccent: 'text-blue-400',
      badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      border: 'border-blue-500/30',
      tint: 'bg-blue-500/5',
    },
    crimson: {
      primary: 'bg-rose-600',
      bgGrad: 'from-rose-600 to-red-800',
      accent: 'border-rose-500',
      textAccent: 'text-rose-400',
      badge: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      border: 'border-rose-500/30',
      tint: 'bg-rose-500/5',
    },
    indigo: {
      primary: 'bg-indigo-600',
      bgGrad: 'from-indigo-600 to-violet-800',
      accent: 'border-indigo-500',
      textAccent: 'text-indigo-400',
      badge: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      border: 'border-indigo-500/30',
      tint: 'bg-indigo-500/5',
    },
    dark: {
      primary: 'bg-slate-800',
      bgGrad: 'from-slate-800 to-slate-950',
      accent: 'border-slate-700',
      textAccent: 'text-slate-400',
      badge: 'bg-slate-700/50 text-slate-300 border border-slate-600/30',
      border: 'border-slate-700/50',
      tint: 'bg-slate-700/5',
    },
    amber: {
      primary: 'bg-amber-600',
      bgGrad: 'from-amber-600 to-amber-900',
      accent: 'border-amber-500',
      textAccent: 'text-amber-400',
      badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      border: 'border-amber-500/30',
      tint: 'bg-amber-500/5',
    }
  };

  const activeTheme = themeStyles[theme];

  // Print Card Handlers
  const handlePrintCard = (student: Student) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Mohon izinkan pop-up browser Anda untuk mencetak.');
      return;
    }

    const rulesHtml = customNotes
      .split('\n')
      .map(line => `<li>${line.replace(/^\d+\.\s*/, '')}</li>`)
      .join('');

    const logoHtml = systemSetting.logoUrl
      ? `<img src="${systemSetting.logoUrl}" class="logo-img" />`
      : `<div class="logo-fallback"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path></svg></div>`;

    const themeColorHex = {
      emerald: '#059669',
      blue: '#2563eb',
      crimson: '#e11d48',
      indigo: '#4f46e5',
      dark: '#1e293b',
      amber: '#d97706'
    }[theme];

    const themeColorHexDark = {
      emerald: '#0f766e',
      blue: '#1e40af',
      crimson: '#9f1239',
      indigo: '#3730a3',
      dark: '#0f172a',
      amber: '#78350f'
    }[theme];

    const studentPhotoHtml = student.photoUrl
      ? `<img src="${student.photoUrl}" class="photo" />`
      : `<div class="photo-placeholder">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
         </div>`;

    const htmlContent = `
      <html>
        <head>
          <title>Cetak Kartu Siswa - ${student.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
            
            body {
              font-family: 'Inter', sans-serif;
              background-color: #f1f5f9;
              padding: 40px;
              color: #1e293b;
              margin: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }

            .no-print-bar {
              background-color: #ffffff;
              border: 1px solid #e2e8f0;
              padding: 12px 24px;
              border-radius: 12px;
              margin-bottom: 30px;
              display: flex;
              gap: 15px;
              align-items: center;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            }

            .btn-print {
              background-color: ${themeColorHex};
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 8px;
              font-weight: 700;
              font-size: 13px;
              cursor: pointer;
              transition: opacity 0.15s;
            }
            .btn-print:hover { opacity: 0.9; }

            /* Standard Portrait Dimensions: 54mm x 85.6mm scaled up for printing */
            .cards-container {
              display: flex;
              gap: 40px;
              flex-wrap: wrap;
              justify-content: center;
            }

            .card-wrapper {
              width: 320px;
              height: 500px;
              background: #ffffff;
              border-radius: 16px;
              border: 1px solid #cbd5e1;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
              overflow: hidden;
              position: relative;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              page-break-inside: avoid;
            }

            /* Front Card Styling */
            .card-front {
              background-color: #ffffff;
            }

            .header-strip {
              background: linear-gradient(135deg, ${themeColorHex}, ${themeColorHexDark});
              color: #ffffff;
              padding: 14px 12px;
              display: flex;
              align-items: center;
              gap: 10px;
              border-bottom: 3px solid #f59e0b;
              position: relative;
            }

            .logo-container {
              width: 32px;
              height: 32px;
              background-color: rgba(255,255,255,0.15);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 3px;
              border: 1px solid rgba(255,255,255,0.2);
              flex-shrink: 0;
            }
            .logo-img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .logo-fallback {
              color: #ffffff;
            }

            .school-meta {
              min-width: 0;
            }
            .school-name {
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.3px;
              margin: 0;
              text-transform: uppercase;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .school-addr {
              font-size: 7.5px;
              opacity: 0.85;
              margin: 2px 0 0 0;
              font-weight: 500;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .card-title-bar {
              text-align: center;
              background-color: #f8fafc;
              border-bottom: 1px solid #f1f5f9;
              padding: 6px 0;
            }
            .card-title-text {
              font-size: 9px;
              font-weight: 800;
              letter-spacing: 1.5px;
              color: #475569;
              text-transform: uppercase;
              margin: 0;
            }

            /* Card Content Area */
            .content-area {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 16px 20px;
              box-sizing: border-box;
            }

            .photo-frame {
              width: 95px;
              height: 120px;
              border-radius: 10px;
              border: 3px solid ${themeColorHex};
              box-shadow: 0 4px 8px rgba(0,0,0,0.08);
              overflow: hidden;
              background-color: #f8fafc;
              margin-bottom: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            }
            .photo-frame img.photo {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .photo-placeholder {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: #f1f5f9;
            }

            .student-name-box {
              text-align: center;
              margin-bottom: 10px;
              width: 100%;
            }
            .student-name {
              font-size: 14px;
              font-weight: 800;
              color: #0f172a;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: -0.2px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .student-class-badge {
              display: inline-block;
              font-size: 9px;
              font-weight: 700;
              color: ${themeColorHex};
              background-color: rgba(0, 0, 0, 0.04);
              border: 1px solid rgba(0, 0, 0, 0.05);
              padding: 2px 8px;
              border-radius: 20px;
              margin-top: 3px;
              text-transform: uppercase;
            }

            /* Detail Table */
            .details-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 5px;
              font-size: 9.5px;
            }
            .details-table td {
              padding: 3.5px 0;
              vertical-align: top;
            }
            .details-label {
              color: #64748b;
              font-weight: 600;
              width: 80px;
            }
            .details-colon {
              color: #cbd5e1;
              width: 10px;
            }
            .details-value {
              color: #1e293b;
              font-weight: 700;
            }

            .front-footer-strip {
              height: 12px;
              background-color: ${themeColorHex};
              margin-top: auto;
            }

            /* Back Card Styling */
            .card-back {
              background-color: #ffffff;
              display: flex;
              flex-direction: column;
            }

            .back-accent-stripe {
              height: 10px;
              background: linear-gradient(90deg, ${themeColorHex}, #cbd5e1, ${themeColorHexDark});
            }

            .back-content {
              flex: 1;
              padding: 20px 18px;
              display: flex;
              flex-direction: column;
              align-items: center;
              box-sizing: border-box;
            }

            .rules-title-box {
              width: 100%;
              margin-bottom: 8px;
            }
            .rules-title {
              font-size: 10px;
              font-weight: 800;
              color: ${themeColorHex};
              letter-spacing: 0.8px;
              text-transform: uppercase;
              margin: 0;
              border-bottom: 1.5px solid #e2e8f0;
              padding-bottom: 4px;
            }

            .rules-list {
              font-size: 8.5px;
              color: #475569;
              padding-left: 14px;
              margin: 0 0 15px 0;
              line-height: 1.5;
              font-weight: 500;
              width: 100%;
            }
            .rules-list li {
              margin-bottom: 4px;
            }

            /* Large Centered Barcode / QR Code */
            .center-qr-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              margin: 5px 0 15px 0;
              background-color: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 10px 12px;
              width: 130px;
              box-shadow: inset 0 1px 3px rgba(0,0,0,0.02);
            }
            .center-qr-image {
              width: 95px;
              height: 95px;
              margin-bottom: 6px;
              background: white;
              padding: 4px;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
            }
            .center-qr-caption {
              font-family: 'JetBrains Mono', monospace;
              font-size: 8px;
              font-weight: 700;
              color: #475569;
              letter-spacing: 1.5px;
            }

            .back-bottom-row {
              width: 100%;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: auto;
            }

            .stamp-signature-area {
              width: 100%;
              display: flex;
              justify-content: flex-end;
              position: relative;
            }

            .signature-box {
              text-align: center;
              width: 130px;
              position: relative;
            }
            .sig-date {
              font-size: 7.5px;
              color: #64748b;
              margin-bottom: 26px;
            }
            .sig-name {
              font-size: 8.5px;
              font-weight: 800;
              color: #0f172a;
              border-bottom: 1px solid #1e293b;
              padding-bottom: 1.5px;
              margin: 0;
              text-transform: uppercase;
            }
            .sig-nip {
              font-size: 7px;
              color: #64748b;
              margin-top: 1.5px;
              font-family: monospace;
            }

            /* Stamp Effect */
            .stamp-seal {
              position: absolute;
              bottom: 4px;
              left: -15px;
              width: 44px;
              height: 44px;
              border: 1.5px dashed rgba(225, 29, 72, 0.4);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              transform: rotate(-15deg);
              pointer-events: none;
            }
            .stamp-text {
              font-size: 5px;
              font-weight: 800;
              color: rgba(225, 29, 72, 0.5);
              text-transform: uppercase;
              text-align: center;
              line-height: 1.1;
              white-space: pre-line;
            }

            .card-back-footer {
              background-color: #fafafa;
              border-top: 1px solid #e2e8f0;
              padding: 8px 18px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 7px;
              color: #94a3b8;
              font-weight: 600;
            }

            @media print {
              body {
                background-color: #ffffff;
                padding: 0;
              }
              .no-print-bar {
                display: none;
              }
              .card-wrapper {
                box-shadow: none;
                border: 1px solid #94a3b8;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print-bar">
            <div>
              <strong style="font-size: 15px;">Mode Cetak Kartu Siswa SIAP</strong>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Silakan klik tombol cetak. Disarankan menyetel mode "Portrait", ukuran kertas "A4", margin "None", dan centang opsi "Background graphics" agar warna latar tercetak sempurna.</div>
            </div>
            <button class="btn-print" onclick="window.print()">Mulai Cetak Kartu</button>
          </div>

          <div class="cards-container">
            <!-- Front Card -->
            <div class="card-wrapper card-front">
              <div class="header-strip">
                <div class="logo-container">
                  ${logoHtml}
                </div>
                <div class="school-meta">
                  <h1 class="school-name">${customSchoolName}</h1>
                  <p class="school-addr">${customSchoolAddress}</p>
                </div>
              </div>

              <div class="card-title-bar">
                <h2 class="card-title-text">${cardTitle}</h2>
              </div>

              <div class="content-area">
                <div class="photo-frame">
                  ${studentPhotoHtml}
                </div>

                <div class="student-name-box">
                  <h3 class="student-name">${student.name}</h3>
                  <span class="student-class-badge">KELAS ${student.class}</span>
                </div>

                <table class="details-table">
                  <tr>
                    <td class="details-label">NISN / ID</td>
                    <td class="details-colon">:</td>
                    <td class="details-value">${student.nisn}</td>
                  </tr>
                  ${showTtl ? `
                  <tr>
                    <td class="details-label">TTL</td>
                    <td class="details-colon">:</td>
                    <td class="details-value">${student.pob || '-'}, ${student.dob || '-'}</td>
                  </tr>` : ''}
                  ${showGender ? `
                  <tr>
                    <td class="details-label">Jenis Kelamin</td>
                    <td class="details-colon">:</td>
                    <td class="details-value">${student.gender}</td>
                  </tr>` : ''}
                  ${showAddress ? `
                  <tr>
                    <td class="details-label">Alamat</td>
                    <td class="details-colon">:</td>
                    <td class="details-value" style="font-size: 8.5px; line-height: 1.2;">${student.address || '-'}</td>
                  </tr>` : ''}
                </table>
              </div>

              <div class="front-footer-strip"></div>
            </div>

            <!-- Back Card with Barcode Centered Underneath Notes -->
            <div class="card-wrapper card-back">
              <div class="back-accent-stripe"></div>
              
              <div class="back-content">
                ${showRules ? `
                <div class="rules-title-box">
                  <h4 class="rules-title">TATA TERTIB KARTU</h4>
                </div>
                <ul class="rules-list">
                  ${rulesHtml}
                </ul>
                ` : ''}

                <!-- Center Large Barcode / QR Code for Presensi -->
                <div class="center-qr-container">
                  <img src="${getQrUrl(student.nisn)}" class="center-qr-image" />
                  <span class="center-qr-caption">ID: ${student.nisn}</span>
                </div>

                <!-- Bottom Signature Area -->
                <div class="back-bottom-row">
                  <div class="stamp-signature-area">
                    ${showSignature ? `
                    <div class="signature-box">
                      <div class="sig-date">Kepala Madrasah,</div>
                      <div class="stamp-seal">
                        <div class="stamp-text">${customStampText}</div>
                      </div>
                      <h5 class="sig-name">${customHeadmasterName}</h5>
                      <span class="sig-title">NIP. ${customHeadmasterNip}</span>
                    </div>
                    ` : ''}
                  </div>
                </div>
              </div>

              <div class="card-back-footer">
                <span>Diterbit oleh ${customSchoolName}</span>
                <span style="font-family: monospace;">SIAP-V2</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 selection:bg-emerald-500 selection:text-white font-sans text-xs">
      {/* Header and top banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" /> Pembuatan Kartu Siswa Digital (Portrait)
          </h2>
          <p className="text-slate-400 text-xs mt-1">Buat, kustomisasi penuh, cetak, dan unduh kartu pelajar profesional siswa lengkap dengan barcode QR absensi di belakang kartu</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono font-bold border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" /> Desain Custom
          </span>
        </div>
      </div>

      {/* Main card builder panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Student Selector & Card Customizer */}
        <div className="xl:col-span-5 space-y-5">
          
          {/* 1. Student Selector Card */}
          <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-3">
            <h3 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-2 border-b border-slate-800 pb-1.5">
              <User className="w-4 h-4 text-emerald-400" /> 1. Pilih Siswa
            </h3>

            {/* Filters */}
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Cari nama atau NISN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-300 focus:outline-none text-xs"
                >
                  <option value="">Semua Kelas</option>
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>Kelas {cls}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mini list container */}
            <div className="max-h-44 overflow-y-auto space-y-1 border border-slate-800/80 rounded-lg p-1.5 bg-slate-950/20">
              {filteredStudents.length === 0 ? (
                <p className="p-3 text-slate-500 italic text-center text-[11px]">Siswa tidak ditemukan</p>
              ) : (
                filteredStudents.map(std => (
                  <button
                    key={std.nisn}
                    onClick={() => setSelectedStudent(std)}
                    className={`w-full text-left p-2 rounded-lg transition-all flex items-center justify-between ${
                      selectedStudent?.nisn === std.nisn
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-[11px] font-bold truncate">{std.name}</p>
                      <p className={`text-[9px] font-mono ${selectedStudent?.nisn === std.nisn ? 'text-slate-900/80' : 'text-slate-500'}`}>
                        {std.nisn} • Kelas {std.class}
                      </p>
                    </div>
                    {selectedStudent?.nisn === std.nisn && (
                      <CheckCircle className="w-4 h-4 text-slate-950 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 2. Admin Card Builder Panel - Full customization of headers and school metadata */}
          <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-2 border-b border-slate-800 pb-1.5">
              <Settings className="w-4 h-4 text-emerald-400" /> 2. Kustomisasi Desain & Data Instansi
            </h3>

            {/* School Name & Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nama Madrasah / Sekolah</label>
                <input
                  type="text"
                  value={customSchoolName}
                  onChange={(e) => setCustomSchoolName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-[10px]"
                  placeholder="Nama Madrasah"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Alamat Madrasah</label>
                <input
                  type="text"
                  value={customSchoolAddress}
                  onChange={(e) => setCustomSchoolAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-[10px]"
                  placeholder="Alamat Instansi"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nama Kepala Sekolah / Madrasah</label>
                <input
                  type="text"
                  value={customHeadmasterName}
                  onChange={(e) => setCustomHeadmasterName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-[10px]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">NIP Kepala Madrasah</label>
                <input
                  type="text"
                  value={customHeadmasterNip}
                  onChange={(e) => setCustomHeadmasterNip(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-[10px] font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Teks Stempel Cap (Maks 3 Baris)</label>
                <textarea
                  rows={2}
                  value={customStampText}
                  onChange={(e) => setCustomStampText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-[10px]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Judul Kartu</label>
                <input
                  type="text"
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 uppercase font-bold focus:outline-none focus:border-emerald-500 text-[10px]"
                />
              </div>
            </div>

            {/* Colors */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">Warna Tema Kartu</label>
              <div className="grid grid-cols-6 gap-1.5">
                {(Object.keys(themeStyles) as CardTheme[]).map(t => {
                  const tColors: Record<CardTheme, string> = {
                    emerald: 'bg-emerald-500',
                    blue: 'bg-blue-500',
                    crimson: 'bg-rose-500',
                    indigo: 'bg-indigo-500',
                    dark: 'bg-slate-700',
                    amber: 'bg-amber-500'
                  };
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      className={`h-7 rounded-lg border-2 flex items-center justify-center transition ${tColors[t]} ${
                        theme === t ? 'border-white scale-105 shadow-md shadow-black/45' : 'border-transparent hover:scale-102'
                      }`}
                      title={t}
                    >
                      {theme === t && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggle components */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="block text-slate-400 font-semibold mb-1">Opsi Tampilkan Detail</label>
              
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 bg-slate-900/60 p-2 border border-slate-800/80 rounded-lg cursor-pointer hover:bg-slate-900 transition">
                  <input
                    type="checkbox"
                    checked={showTtl}
                    onChange={(e) => setShowTtl(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span className="text-[10px] text-slate-300 font-semibold">Tgl Lahir (TTL)</span>
                </label>

                <label className="flex items-center gap-2 bg-slate-900/60 p-2 border border-slate-800/80 rounded-lg cursor-pointer hover:bg-slate-900 transition">
                  <input
                    type="checkbox"
                    checked={showGender}
                    onChange={(e) => setShowGender(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span className="text-[10px] text-slate-300 font-semibold">Jenis Kelamin</span>
                </label>

                <label className="flex items-center gap-2 bg-slate-900/60 p-2 border border-slate-800/80 rounded-lg cursor-pointer hover:bg-slate-900 transition col-span-2">
                  <input
                    type="checkbox"
                    checked={showAddress}
                    onChange={(e) => setShowAddress(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span className="text-[10px] text-slate-300 font-semibold">Alamat Tempat Tinggal</span>
                </label>

                <label className="flex items-center gap-2 bg-slate-900/60 p-2 border border-slate-800/80 rounded-lg cursor-pointer hover:bg-slate-900 transition">
                  <input
                    type="checkbox"
                    checked={showRules}
                    onChange={(e) => setShowRules(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span className="text-[10px] text-slate-300 font-semibold">Tata Tertib</span>
                </label>

                <label className="flex items-center gap-2 bg-slate-900/60 p-2 border border-slate-800/80 rounded-lg cursor-pointer hover:bg-slate-900 transition">
                  <input
                    type="checkbox"
                    checked={showSignature}
                    onChange={(e) => setShowSignature(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span className="text-[10px] text-slate-300 font-semibold">Ttd Kepsek</span>
                </label>
              </div>
            </div>

            {/* Backside notes */}
            {showRules && (
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Butir Tata Tertib (Satu per baris)</label>
                <textarea
                  rows={3}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-300 text-[10px] focus:outline-none focus:border-emerald-500 leading-normal"
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Visual Live Card Preview */}
        <div className="xl:col-span-7 flex flex-col items-center justify-center p-6 bg-slate-950/20 border border-slate-800/80 rounded-2xl min-h-[500px]">
          
          {selectedStudent ? (
            <div className="w-full max-w-2xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h4 className="font-bold text-white text-sm">Visualisasi Preview Kartu</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5 font-semibold">Format potret standard dengan barcode absensi QR diletakkan di bagian belakang.</p>
                </div>
                
                <button
                  onClick={() => handlePrintCard(selectedStudent)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-emerald-500/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Printer className="w-4.5 h-4.5" />
                  <span>Cetak / Unduh Kartu Siswa</span>
                </button>
              </div>

              {/* Side by side Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-center items-center">
                
                {/* 1. FRONT PREVIEW */}
                <div className="space-y-2">
                  <div className="text-slate-400 font-bold text-center uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-emerald-400" /> Tampak Depan
                  </div>
                  
                  {/* Front Card Container */}
                  <div className="mx-auto w-[270px] h-[420px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl relative select-none">
                    
                    {/* Header Strip */}
                    <div className={`p-3 text-white flex items-center gap-2 border-b-2 border-amber-400 bg-gradient-to-br ${activeTheme.bgGrad}`}>
                      <div className="w-7 h-7 bg-white/10 border border-white/25 rounded-md flex items-center justify-center p-0.5 flex-shrink-0">
                        {systemSetting.logoUrl ? (
                          <img src={systemSetting.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <School className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[8.5px] font-extrabold tracking-wide uppercase truncate leading-none mb-0.5">
                          {customSchoolName}
                        </h4>
                        <p className="text-[6.5px] opacity-80 truncate leading-none font-medium text-slate-300">
                          {customSchoolAddress}
                        </p>
                      </div>
                    </div>

                    {/* Card Title */}
                    <div className="bg-slate-900 border-b border-slate-800/40 text-center py-1">
                      <span className="text-[7.5px] font-extrabold tracking-widest text-slate-400 uppercase">
                        {cardTitle}
                      </span>
                    </div>

                    {/* Card Body content */}
                    <div className="flex-1 flex flex-col items-center px-4 py-3 bg-slate-950/90 text-slate-300">
                      
                      {/* Photo frame */}
                      <div className={`w-20 h-[100px] rounded-lg border-2 ${activeTheme.accent} overflow-hidden shadow-md bg-slate-900 flex items-center justify-center mb-2.5`}>
                        {selectedStudent.photoUrl ? (
                          <img src={selectedStudent.photoUrl} alt={selectedStudent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="text-slate-600 text-center flex flex-col items-center">
                            <User className="w-8 h-8 text-slate-700 mb-0.5" />
                            <span className="text-[8px] font-bold text-slate-600">PHOTO</span>
                          </div>
                        )}
                      </div>

                      {/* Name Header */}
                      <div className="text-center w-full mb-1">
                        <h3 className="text-[11px] font-black text-white uppercase tracking-tight truncate leading-none mb-1">
                          {selectedStudent.name}
                        </h3>
                        <span className={`inline-block text-[7.5px] font-bold px-1.5 py-0.5 rounded-full ${activeTheme.badge}`}>
                          KELAS {selectedStudent.class}
                        </span>
                      </div>

                      {/* Detail list table with "Jenis Kelamin" */}
                      <table className="w-full text-[8.5px] leading-relaxed mt-1">
                        <tbody>
                          <tr>
                            <td className="text-slate-500 font-medium py-0.5 w-16">NISN / ID</td>
                            <td className="text-slate-700 py-0.5 w-2">:</td>
                            <td className="text-slate-300 font-extrabold py-0.5">{selectedStudent.nisn}</td>
                          </tr>
                          {showTtl && (
                            <tr>
                              <td className="text-slate-500 font-medium py-0.5">TTL</td>
                              <td className="text-slate-700 py-0.5">:</td>
                              <td className="text-slate-300 font-bold py-0.5">
                                {selectedStudent.pob || '-'}, {selectedStudent.dob || '-'}
                              </td>
                            </tr>
                          )}
                          {showGender && (
                            <tr>
                              <td className="text-slate-500 font-medium py-0.5">Jenis Kelamin</td>
                              <td className="text-slate-700 py-0.5">:</td>
                              <td className="text-slate-300 font-bold py-0.5">{selectedStudent.gender}</td>
                            </tr>
                          )}
                          {showAddress && (
                            <tr>
                              <td className="text-slate-500 font-medium py-0.5">Alamat</td>
                              <td className="text-slate-700 py-0.5">:</td>
                              <td className="text-slate-300 font-semibold py-0.5 leading-snug truncate max-w-[120px]" title={selectedStudent.address}>
                                {selectedStudent.address || '-'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Front footer minimal solid strip instead of barcode */}
                    <div className={`h-2 bg-emerald-500 ${activeTheme.primary}`} />

                  </div>
                </div>

                {/* 2. BACK PREVIEW */}
                <div className="space-y-2">
                  <div className="text-slate-400 font-bold text-center uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-amber-400" /> Tampak Belakang
                  </div>

                  {/* Back Card Container */}
                  <div className="mx-auto w-[270px] h-[420px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl relative select-none">
                    <div className={`h-2 bg-gradient-to-r ${activeTheme.bgGrad}`} />

                    <div className="flex-1 p-4.5 flex flex-col justify-between text-slate-300 bg-slate-950/95">
                      
                      {/* Rules (Keterangan) */}
                      {showRules ? (
                        <div className="space-y-1">
                          <h5 className={`text-[8px] font-extrabold tracking-wider uppercase border-b border-slate-900 pb-1 ${activeTheme.textAccent}`}>
                            TATA TERTIB KARTU
                          </h5>
                          <ul className="list-decimal list-outside pl-3.5 text-[7.5px] text-slate-400 space-y-1 leading-normal font-medium">
                            {customNotes.split('\n').map((line, idx) => (
                              <li key={idx}>
                                {line.replace(/^\d+\.\s*/, '')}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="text-center text-[7.5px] text-slate-600 italic">
                          Tata tertib kartu dinonaktifkan
                        </div>
                      )}

                      {/* Centered Large QR Code / Barcode for Presensi */}
                      <div className="my-2 flex flex-col items-center justify-center">
                        <div className="w-24 h-24 bg-white border border-slate-800 rounded-lg p-1.5 flex items-center justify-center shadow-inner">
                          <img src={getQrUrl(selectedStudent.nisn)} alt="Barcode Presensi" className="w-full h-full" referrerPolicy="no-referrer" />
                        </div>
                        <span className="text-[7.5px] font-mono font-bold text-slate-500 mt-1.5 tracking-wider">
                          ABSENSI ID: {selectedStudent.nisn}
                        </span>
                      </div>

                      {/* Headmaster signature mockups at the bottom */}
                      {showSignature ? (
                        <div className="self-end text-center w-28 relative mt-1">
                          <span className="block text-[6.5px] text-slate-500 mb-5 leading-none">Kepala Madrasah,</span>
                          
                          {/* Official stamp */}
                          <div className="absolute top-1 -left-4.5 w-9 h-9 border border-dashed border-rose-500/20 rounded-full flex items-center justify-center rotate-12 pointer-events-none">
                            <span className="text-[4.5px] text-rose-500/20 font-black tracking-tight leading-none text-center uppercase">
                              {customStampText.replace(/\n/g, ' ')}
                            </span>
                          </div>

                          <span className="block text-[8px] font-black text-white uppercase border-b border-slate-800 pb-0.5 leading-none">
                            {customHeadmasterName}
                          </span>
                          <span className="block text-[6px] text-slate-500 font-mono mt-0.5 leading-none">
                            NIP. {customHeadmasterNip}
                          </span>
                        </div>
                      ) : null}

                    </div>

                    {/* Back card footer */}
                    <div className="border-t border-slate-900 bg-slate-950 px-4 py-2 flex justify-between items-center text-[6.5px] text-slate-500 font-bold">
                      <span>Diterbit oleh {customSchoolName}</span>
                      <span className="font-mono">SIAP V2</span>
                    </div>

                  </div>
                </div>

              </div>

              {/* Instructions Callout */}
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-[10px] text-slate-400 leading-relaxed space-y-1">
                  <p className="font-bold text-slate-300">💡 Panduan Cetak & laminasi Kartu Fisik:</p>
                  <p>1. Tekan tombol <strong className="text-white">"Cetak / Unduh Kartu Siswa"</strong> di atas.</p>
                  <p>2. Pada jendela baru yang muncul, klik <strong className="text-white">"Mulai Cetak Kartu"</strong> untuk membuka dialog pencetakan browser.</p>
                  <p>3. Setel tujuan ke <strong className="text-emerald-400">"Save as PDF"</strong> untuk mengunduh, atau langsung kirim ke printer.</p>
                  <p>4. Gunakan ukuran kertas A4, margin "None", skala "100%", dan pastikan opsi <strong className="text-white">"Background Graphics"</strong> dicentang agar warna latar kartu tercetak dengan sempurna.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 space-y-3">
              <CreditCard className="w-12 h-12 text-slate-700 mx-auto" />
              <p className="text-xs italic">Harap tambahkan data siswa terlebih dahulu di menu "Data Siswa" untuk memulai pembuatan kartu.</p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
