/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { toast } from '../utils/dialog';
import {
  QrCode,
  Download,
  Printer,
  Search,
  Filter,
  Camera,
  CheckCircle,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { Student, Teacher, User as UserType } from '../types';

interface QrCodeSecProps {
  students: Student[];
  availableClasses: string[];
  schoolName: string;
  role: 'ADMIN' | 'GURU' | 'SISWA';
  teachers?: Teacher[];
  currentUser?: UserType;
}

export default function QrCodeSec({ 
  students, 
  availableClasses, 
  schoolName,
  role,
  teachers,
  currentUser
}: QrCodeSecProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');

  const loggedTeacher = (role === 'GURU' && teachers && currentUser)
    ? teachers.find(t => t.nuptk === currentUser?.id || t.username === currentUser?.username)
    : undefined;
  const showClassFilter = role === 'ADMIN' || (role === 'GURU' && loggedTeacher?.dutyType === 'GURU_MAPEL');

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || student.nisn.includes(searchQuery);
    const matchesClass = classFilter ? student.class === classFilter : true;
    return matchesSearch && matchesClass;
  });

  // Get QR Server URL
  const getQrUrl = (nisn: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${nisn}&color=022c22&bgcolor=f0fdf4`;
  };

  // Trigger individual QR image download
  const handleDownloadQr = (student: Student) => {
    const url = getQrUrl(student.nisn);
    const win = window.open(url, '_blank');
    if (!win) {
      toast.warning('Mohon aktifkan pop-up browser Anda.');
    }
  };

  // Print all student ID cards
  const handlePrintCards = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.warning('Mohon izinkan pop-up untuk mencetak kartu.');
      return;
    }

    const html = `
      <html>
        <head>
          <title>Kartu Absensi QR Code - SIAP</title>
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 25px; max-width: 800px; margin: 0 auto; }
            .card {
              border: 2px solid #cbd5e1;
              background-color: #ffffff;
              border-radius: 16px;
              padding: 20px;
              display: flex;
              align-items: center;
              gap: 15px;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
              position: relative;
              overflow: hidden;
              page-break-inside: avoid;
            }
            .card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 6px;
              background: linear-gradient(90deg, #10b981, #06b6d4);
            }
            .photo { width: 75px; height: 75px; border-radius: 50%; object-cover: cover; border: 2px solid #e2e8f0; }
            .no-photo { width: 75px; height: 75px; border-radius: 50%; border: 2px dashed #cbd5e1; background-color: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #64748b; text-align: center; }
            .info { flex-1: 1; }
            .school { font-size: 8px; font-weight: bold; text-transform: uppercase; color: #10b981; letter-spacing: 1px; margin-bottom: 3px; }
            .name { font-size: 14px; font-weight: bold; color: #0f172a; margin: 0; }
            .class { font-size: 11px; color: #64748b; font-weight: bold; margin-top: 3px; }
            .nisn { font-family: monospace; font-size: 10px; color: #94a3b8; margin-top: 2px; }
            .qr { width: 85px; height: 85px; border-radius: 8px; border: 1px solid #e2e8f0; padding: 4px; background-color: #f0fdf4; }
            @media print {
              body { background-color: #ffffff; padding: 0; }
              .card { box-shadow: none; border: 1.5px solid #94a3b8; }
            }
          </style>
        </head>
        <body>
          <div style="text-align: center; margin-bottom: 25px;" class="no-print">
            <h2 style="margin: 0;">Kartu Presensi Siswa Digital</h2>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">Siap cetak & potong untuk kartu gantungan kunci/saku siswa</p>
          </div>
          
          <div class="grid">
            ${filteredStudents.map(student => `
              <div class="card">
                ${student.photoUrl 
                  ? `<img src="${student.photoUrl}" class="photo" />` 
                  : `<div class="no-photo">FOTO SISWA</div>`
                }
                <div class="info">
                  <div class="school">${schoolName}</div>
                  <div class="name">${student.name}</div>
                  <div class="class">KELAS: ${student.class}</div>
                  <div class="nisn">NISN: ${student.nisn}</div>
                </div>
                <img src="${getQrUrl(student.nisn)}" class="qr" />
              </div>
            `).join('')}
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 selection:bg-emerald-500 selection:text-white font-sans">
      {/* Header and print all card bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Sistem Kartu QR Code Absensi</h2>
          <p className="text-slate-400 text-xs mt-1">Unduh kode QR absen masing-masing siswa, atau cetak lembaran kartu pengenal siap laminating</p>
        </div>

        <button
          onClick={handlePrintCards}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-2 transition duration-150 shadow-md shadow-emerald-500/10"
        >
          <Printer className="w-4.5 h-4.5" />
          <span>Cetak Semua Kartu Kelas</span>
        </button>
      </div>

      {/* Filter and search utilities */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari siswa untuk kode QR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/40 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-300 text-xs focus:outline-none focus:border-emerald-500/80 transition-all"
          />
        </div>

        {showClassFilter && (
          <div className="flex items-center gap-2">
            <div className="text-slate-500 text-xs font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter Kelas:
            </div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="bg-slate-950/40 border border-slate-800 rounded-xl py-2 px-4 text-slate-300 text-xs font-semibold focus:outline-none focus:border-emerald-500/80"
            >
              <option value="">Semua Kelas</option>
              {availableClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* QR Code Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 italic">
            Data siswa tidak ditemukan untuk pencarian ini.
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div
              key={student.nisn}
              className="p-5 bg-slate-950/30 border border-slate-800 hover:border-slate-700/60 rounded-2xl flex flex-col items-center justify-between transition duration-150"
            >
              {/* Header card info */}
              <div className="w-full flex items-center gap-3 mb-4">
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={student.name}
                    className="w-10 h-10 object-cover rounded-full border border-slate-700 bg-slate-800"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <Camera className="w-4 h-4 text-slate-500" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-white text-xs truncate">{student.name}</h4>
                  <p className="text-[10px] text-emerald-400 font-bold mt-0.5">{student.class}</p>
                </div>
              </div>

              {/* QR Image Box */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-4 text-center">
                <img
                  src={getQrUrl(student.nisn)}
                  alt={`QR Absen ${student.name}`}
                  className="w-36 h-36 mx-auto rounded-lg border border-emerald-500/10 shadow-lg bg-emerald-50"
                  referrerPolicy="no-referrer"
                />
                <p className="text-[10px] font-mono font-bold text-slate-400 mt-2.5 uppercase tracking-widest">
                  NISN: {student.nisn}
                </p>
              </div>

              {/* Action Downloads */}
              <div className="w-full grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleDownloadQr(student)}
                  className="py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-200 font-bold text-[10px] uppercase rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
                  title="Unduh QR Code"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh PNG</span>
                </button>
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                            <div style="text-align:center;font-family:sans-serif;padding:30px;border:1px solid #ccc;border-radius:15px;">
                              <h3>QR Code Presensi SIAP</h3>
                              <h2>${student.name} (${student.class})</h2>
                              <img src="${getQrUrl(student.nisn)}" style="width:250px;height:250px;" />
                              <p style="font-family:monospace;margin-top:15px;letter-spacing:1px;">NISN: ${student.nisn}</p>
                            </div>
                            <script>window.onload = function() { window.print(); }</script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }
                  }}
                  className="py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-200 font-bold text-[10px] uppercase rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
                  title="Cetak QR Code"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Instructional guidelines */}
      <div className="mt-8 p-4 bg-slate-950/20 border border-slate-800/80 rounded-2xl text-xs text-slate-400 leading-relaxed flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-white mb-1.5 uppercase tracking-wide">💡 Panduan Integrasi Kartu Absensi QR</h4>
          <p className="mb-1">
            1. Klik **Cetak Semua Kartu Kelas** untuk mendapatkan lembaran cetak siap pakai. Anda dapat membagikannya langsung ke siswa.
          </p>
          <p className="mb-1">
            2. Siswa dapat membawa kartu tersebut, dan guru dapat memindainya menggunakan tab **Scan Barcode Absensi** untuk kehadiran instan.
          </p>
          <p>
            3. Data yang dipindai otomatis memicu sistem pengiriman notifikasi email ke email orangtua murid secara real-time.
          </p>
        </div>
      </div>
    </div>
  );
}
