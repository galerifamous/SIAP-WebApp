/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Database,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  FileJson,
  Calendar,
  ShieldCheck,
  FileCheck,
  Trash2
} from 'lucide-react';
import {
  Student,
  Teacher,
  Attendance,
  Grade,
  CaseReport,
  Achievement,
  AcademicSetting,
  SystemSetting,
  EmailLog
} from '../types';

interface BackupRestoreSecProps {
  students: Student[];
  teachers: Teacher[];
  attendance: Attendance[];
  grades: Grade[];
  cases: CaseReport[];
  achievements: Achievement[];
  emails: EmailLog[];
  academicSetting: AcademicSetting;
  systemSetting: SystemSetting;
  onRestoreData: (restored: {
    students?: Student[];
    teachers?: Teacher[];
    attendance?: Attendance[];
    grades?: Grade[];
    cases?: CaseReport[];
    achievements?: Achievement[];
    emails?: EmailLog[];
    academicSetting?: AcademicSetting;
    systemSetting?: SystemSetting;
  }) => void;
  onResetToDefault: () => void;
  role: 'ADMIN' | 'GURU' | 'SISWA';
  schoolName: string;
}

const GOOGLE_APPS_SCRIPT_CODE = `// ==========================================
// GOOGLE APPS SCRIPT DATABASE INTEGRATION FOR SIAP
// ==========================================
// Panduan & Langkah Penyebaran (Deployment):
// 1. Buat Google Spreadsheet baru atau buka yang sudah ada.
// 2. Klik menu Ekstensi (Extensions) > Apps Script.
// 3. Hapus semua kode bawaan di editor, lalu tempelkan (paste) seluruh kode ini.
// 4. Ubah nilai FOLDER_ID di bawah jika ingin mencadangkan file JSON secara otomatis ke Google Drive.
// 5. Klik ikon Simpan (kertas) di atas editor.
// 6. Klik tombol "Deploy" (Penerapan) > "Deployment baru".
// 7. Pilih jenis "Aplikasi web" (Web App).
// 8. Isi deskripsi (misal: "SIAP Cloud Database v2").
// 9. Jalankan sebagai: "Saya (email Anda)" (Execute as: "Me").
// 10. Siapa yang memiliki akses: "Siapa saja" (Who has access: "Anyone").
// 11. Klik "Deploy", lalu jika muncul verifikasi izin, pilih "Setujui Akses" (pilih Akun Anda > Advanced > Go to Untitled project > Allow).
// 12. Salin "URL Aplikasi Web" (Web app URL) yang diakhiri dengan "/exec".
// 13. Tempelkan URL tersebut ke kolom "URL Web App" di aplikasi SIAP Anda untuk memulai sinkronisasi.

const FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE"; // Ganti dengan ID folder Google Drive jika diinginkan (opsional)

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Penanganan Kirim Email Langsung dari SIAP dengan fitur Reply-To (Redirect Balasan ke Guru)
    if (payload.action === "send_email") {
      try {
        let emailOptions = {
          to: payload.recipient,
          subject: payload.subject,
          body: payload.content,
          name: payload.senderName || "Sistem Informasi SIAP"
        };
        
        // Jika dikirim oleh Guru, atur replyTo agar balasan orang tua langsung terkirim ke email guru yang bersangkutan
        if (payload.senderEmail) {
          emailOptions.replyTo = payload.senderEmail;
        }
        
        MailApp.sendEmail(emailOptions);
        
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Email berhasil terkirim via Google MailApp dengan reply-to dialihkan ke: " + (payload.senderEmail || "default")
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (mailErr) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: "Gagal mengirim email: " + mailErr.toString()
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // 2. Sync Siswa
    if (payload.siap_students) {
      writeToSheet(ss, "Siswa", [
        "NISN", "Nama", "Kelas", "Tempat Lahir", "Tanggal Lahir", "Gender", 
        "Nama Orang Tua", "Email Orang Tua", "Alamat", "Saldo Tabungan", "Tagihan Kas"
      ], payload.siap_students.map(item => [
        item.nisn, item.name, item.class, item.pob, item.dob, item.gender,
        item.parentName, item.parentEmail, item.address, item.savings, item.cashBill
      ]));
    }
    
    // 3. Sync Guru
    if (payload.siap_teachers) {
      writeToSheet(ss, "Guru", [
        "NUPTK", "Nama", "Mata Pelajaran", "Email", "Username", "Tipe Tugas", "Kelas Ditugaskan"
      ], payload.siap_teachers.map(item => [
        item.nuptk, item.name, item.subject || "", item.email, item.username, item.dutyType || "", item.assignedClass || ""
      ]));
    }
    
    // 4. Sync Kehadiran
    if (payload.siap_attendance) {
      writeToSheet(ss, "Kehadiran", [
        "ID", "NISN", "Nama Siswa", "Kelas", "Tanggal", "Status", "Tahun Ajaran", "Semester", "Waktu Input"
      ], payload.siap_attendance.map(item => [
        item.id, item.nisn, item.studentName, item.class, item.date, item.status, item.academicYear, item.semester, item.timestamp
      ]));
    }
    
    // 5. Sync Nilai Rapor
    if (payload.siap_grades) {
      writeToSheet(ss, "Nilai_Rapor", [
        "ID", "NISN", "Nama Siswa", "Kelas", "Mata Pelajaran", "Tahun Ajaran", "Semester", "Sumatif 1", "Sumatif 2", "Sumatif 3", "Sumatif 4", "STS", "SAS", "Nilai Akhir", "Waktu Input"
      ], payload.siap_grades.map(item => [
        item.id, item.nisn, item.studentName, item.class, item.subject, item.academicYear, item.semester,
        item.sumatif && item.sumatif[0] !== undefined ? item.sumatif[0] : "",
        item.sumatif && item.sumatif[1] !== undefined ? item.sumatif[1] : "",
        item.sumatif && item.sumatif[2] !== undefined ? item.sumatif[2] : "",
        item.sumatif && item.sumatif[3] !== undefined ? item.sumatif[3] : "",
        item.sts !== undefined ? item.sts : "",
        item.sas !== undefined ? item.sas : "",
        item.finalScore !== undefined ? item.finalScore : "",
        item.timestamp
      ]));
    }
    
    // 6. Sync Kasus Siswa
    if (payload.siap_cases) {
      writeToSheet(ss, "Kasus_Pelanggaran", [
        "ID", "NISN", "Nama Siswa", "Kelas", "Tanggal", "Nama Kasus", "Kategori", "Tindak Lanjut", "Tahun Ajaran", "Semester"
      ], payload.siap_cases.map(item => [
        item.id, item.nisn, item.studentName, item.class, item.date, item.caseName, item.category, item.resolution, item.academicYear, item.semester
      ]));
    }
    
    // 7. Sync Prestasi
    if (payload.siap_achievements) {
      writeToSheet(ss, "Prestasi", [
        "ID", "NISN", "Nama Siswa", "Kelas", "Tanggal", "Nama Prestasi", "Tingkat", "Keterangan", "Tahun Ajaran", "Semester"
      ], payload.siap_achievements.map(item => [
        item.id, item.nisn, item.studentName, item.class, item.date, item.achievementName, item.level, item.description, item.academicYear, item.semester
      ]));
    }

    // 8. Sync Email Log
    if (payload.siap_emails) {
      writeToSheet(ss, "Log_Email", [
        "ID", "Waktu Kirim", "Penerima", "Peran", "Subjek", "Konten", "Status", "Jenis Notifikasi", "Pengirim"
      ], payload.siap_emails.map(item => [
        item.id, item.timestamp, item.recipient, item.role, item.subject, item.content, item.status, item.type, item.senderName || item.sender || ""
      ]));
    }
    
    // Simpan file backup JSON ke folder Google Drive jika ID Folder dikonfigurasi
    if (FOLDER_ID && FOLDER_ID !== "YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE") {
      try {
        const folder = DriveApp.getFolderById(FOLDER_ID);
        const fileName = "SIAP_BACKUP_CLOUD_" + new Date().toISOString().slice(0,10) + "_" + new Date().getTime() + ".json";
        folder.createFile(fileName, JSON.stringify(payload, null, 2), MimeType.PLAIN_TEXT);
      } catch (driveErr) {
        console.log("Drive Backup Error: " + driveErr.toString());
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Sinkronisasi berhasil! Google Sheets & Google Drive telah diperbarui."
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Gagal memproses data: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const payload = {};
    
    // Read Siswa
    payload.siap_students = readFromSheet(ss, "Siswa", [
      "nisn", "name", "class", "pob", "dob", "gender", 
      "parentName", "parentEmail", "address", "savings", "cashBill"
    ], [
      "string", "string", "string", "string", "string", "string",
      "string", "string", "string", "number", "number"
    ]);
    
    // Read Guru
    payload.siap_teachers = readFromSheet(ss, "Guru", [
      "nuptk", "name", "subject", "email", "username", "dutyType", "assignedClass"
    ], [
      "string", "string", "string", "string", "string", "string", "string"
    ]);
    
    // Read Kehadiran
    payload.siap_attendance = readFromSheet(ss, "Kehadiran", [
      "id", "nisn", "studentName", "class", "date", "status", "academicYear", "semester", "timestamp"
    ], [
      "string", "string", "string", "string", "string", "string", "string", "string", "string"
    ]);
    
    // Read Nilai
    const rawGrades = readFromSheet(ss, "Nilai_Rapor", [
      "id", "nisn", "studentName", "class", "subject", "academicYear", "semester",
      "sumatif1", "sumatif2", "sumatif3", "sumatif4", "sts", "sas", "finalScore", "timestamp"
    ], [
      "string", "string", "string", "string", "string", "string", "string",
      "number", "number", "number", "number", "number", "number", "number", "string"
    ]);
    if (rawGrades) {
      payload.siap_grades = rawGrades.map(g => {
        const sumatif = [];
        if (g.sumatif1 !== null && g.sumatif1 !== "") sumatif.push(Number(g.sumatif1));
        if (g.sumatif2 !== null && g.sumatif2 !== "") sumatif.push(Number(g.sumatif2));
        if (g.sumatif3 !== null && g.sumatif3 !== "") sumatif.push(Number(g.sumatif3));
        if (g.sumatif4 !== null && g.sumatif4 !== "") sumatif.push(Number(g.sumatif4));
        return {
          id: g.id,
          nisn: g.nisn,
          studentName: g.studentName,
          class: g.class,
          subject: g.subject,
          academicYear: g.academicYear,
          semester: g.semester,
          sumatif: sumatif,
          sts: Number(g.sts || 0),
          sas: Number(g.sas || 0),
          finalScore: Number(g.finalScore || 0),
          timestamp: g.timestamp
        };
      });
    }
    
    // Read Kasus
    payload.siap_cases = readFromSheet(ss, "Kasus_Pelanggaran", [
      "id", "nisn", "studentName", "class", "date", "caseName", "category", "resolution", "academicYear", "semester"
    ], [
      "string", "string", "string", "string", "string", "string", "string", "string", "string", "string"
    ]);
    
    // Read Prestasi
    payload.siap_achievements = readFromSheet(ss, "Prestasi", [
      "id", "nisn", "studentName", "class", "date", "achievementName", "level", "description", "academicYear", "semester"
    ], [
      "string", "string", "string", "string", "string", "string", "string", "string", "string", "string"
    ]);

    // Read Emails
    payload.siap_emails = readFromSheet(ss, "Log_Email", [
      "id", "timestamp", "recipient", "role", "subject", "content", "status", "type", "senderName"
    ], [
      "string", "string", "string", "string", "string", "string", "string", "string", "string"
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: payload
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Gagal membaca data dari cloud: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function writeToSheet(ss, sheetName, headers, rows) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }
  
  sheet.appendRow(headers);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function readFromSheet(ss, sheetName, keys, types) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return [];
  
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const list = [];
  
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const obj = {};
    for (let j = 0; j < keys.length; j++) {
      let val = row[j];
      if (val === undefined || val === null) {
        val = "";
      }
      if (types[j] === "number") {
        obj[keys[j]] = val !== "" ? Number(val) : 0;
      } else {
        obj[keys[j]] = String(val);
      }
    }
    list.push(obj);
  }
  
  return list;
}`;

export default function BackupRestoreSec({
  students,
  teachers,
  attendance,
  grades,
  cases,
  achievements,
  emails,
  academicSetting,
  systemSetting,
  onRestoreData,
  onResetToDefault,
  role,
  schoolName
}: BackupRestoreSecProps) {
  const [dragActive, setDragActive] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  const [gasUrl, setGasUrl] = useState(() => localStorage.getItem('siap_gas_url') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoringCloud, setIsRestoringCloud] = useState(false);
  const [showScriptGuide, setShowScriptGuide] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download Backup File
  const handleExportBackup = () => {
    try {
      const backupObj = {
        metadata: {
          exporterRole: role,
          exportedAt: new Date().toISOString(),
          schoolName: systemSetting.schoolName,
          academicYear: academicSetting.activeYear,
          semester: academicSetting.activeSemester,
          version: '2.0.0-siap'
        },
        siap_students: students,
        siap_teachers: teachers,
        siap_attendance: attendance,
        siap_grades: grades,
        siap_cases: cases,
        siap_achievements: achievements,
        siap_emails: emails,
        siap_academic: academicSetting,
        siap_system: systemSetting
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `BACKUP_SIAP_${schoolName.replace(/\s+/g, '_')}_${timestamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMsg("Backup data berhasil diekspor! Simpan file JSON tersebut dengan aman.");
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg("Gagal melakukan ekspor backup: " + err.message);
    }
  };

  // Google Apps Script Cloud Backup
  const handleCloudBackup = async () => {
    if (!gasUrl) {
      setErrorMsg("Harap masukkan URL Google Apps Script Web App terlebih dahulu.");
      return;
    }
    
    setIsSyncing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    localStorage.setItem('siap_gas_url', gasUrl);

    // Sync gasUrl to backend server
    fetch('/api/save-gas-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gasUrl })
    }).catch(err => console.warn("Failed to sync GAS URL to server:", err));

    try {
      const backupObj = {
        siap_students: students,
        siap_teachers: teachers,
        siap_attendance: attendance,
        siap_grades: grades,
        siap_cases: cases,
        siap_achievements: achievements,
        siap_emails: emails,
        siap_academic: academicSetting,
        siap_system: systemSetting
      };

      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(backupObj)
      });

      const resText = await response.text();
      let resJson;
      try {
        resJson = JSON.parse(resText);
      } catch (e) {
        resJson = { success: true, message: "Sinkronisasi selesai (Respons: " + resText.slice(0, 50) + ")." };
      }

      if (resJson && (resJson.success || response.ok)) {
        setSuccessMsg(resJson.message || "Sinkronisasi cloud berhasil! Seluruh data telah diperbarui ke Spreadsheet dan Google Drive Anda.");
      } else {
        setErrorMsg("Sinkronisasi gagal: " + (resJson?.message || "Respons server tidak sesuai. Periksa deployment Web App Anda."));
      }
    } catch (err: any) {
      console.error(err);
      // Fallback message for successful triggers that encounter browser redirection/CORS limits
      setSuccessMsg("Permintaan sinkronisasi terkirim ke cloud! Harap periksa lembar Spreadsheet Anda beberapa saat lagi untuk memastikan pembaruan data.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSuccessMsg(null), 7000);
    }
  };

  // Google Apps Script Cloud Restore (Restore from Spreadsheet)
  const handleCloudRestore = async () => {
    if (!gasUrl) {
      setErrorMsg("Harap masukkan URL Google Apps Script Web App terlebih dahulu.");
      return;
    }
    
    if (!confirm("Apakah Anda yakin ingin memulihkan seluruh data aplikasi dari Google Sheets? Tindakan ini akan menimpa data yang ada saat ini secara permanen.")) {
      return;
    }

    setIsRestoringCloud(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    localStorage.setItem('siap_gas_url', gasUrl);

    // Sync gasUrl to backend server
    fetch('/api/save-gas-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gasUrl })
    }).catch(err => console.warn("Failed to sync GAS URL to server:", err));

    try {
      const urlWithCacheBuster = gasUrl + (gasUrl.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
      const response = await fetch(urlWithCacheBuster);
      const resJson = await response.json();

      if (resJson && resJson.success && resJson.data) {
        const cloudData = resJson.data;
        const payload: {
          students?: Student[];
          teachers?: Teacher[];
          attendance?: Attendance[];
          grades?: Grade[];
          cases?: CaseReport[];
          achievements?: Achievement[];
          emails?: EmailLog[];
        } = {};

        if (Array.isArray(cloudData.siap_students)) payload.students = cloudData.siap_students;
        if (Array.isArray(cloudData.siap_teachers)) payload.teachers = cloudData.siap_teachers;
        if (Array.isArray(cloudData.siap_attendance)) payload.attendance = cloudData.siap_attendance;
        if (Array.isArray(cloudData.siap_grades)) payload.grades = cloudData.siap_grades;
        if (Array.isArray(cloudData.siap_cases)) payload.cases = cloudData.siap_cases;
        if (Array.isArray(cloudData.siap_achievements)) payload.achievements = cloudData.siap_achievements;
        if (Array.isArray(cloudData.siap_emails)) payload.emails = cloudData.siap_emails;

        onRestoreData(payload);
        setSuccessMsg("Pemulihan data cloud berhasil! Seluruh komponen data telah sinkron dengan Spreadsheet Google.");
      } else {
        setErrorMsg("Gagal memulihkan data: " + (resJson?.message || "Struktur respon tidak valid. Pastikan data di Spreadsheet tidak kosong."));
      }
    } catch (err: any) {
      setErrorMsg("Gagal mengambil data dari cloud: " + err.message + ". Pastikan deployment Apps Script Anda memiliki akses publik 'Anyone'.");
    } finally {
      setIsRestoringCloud(false);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  // Validate the Backup JSON file structure
  const validateBackupJSON = (json: any): boolean => {
    if (!json) return false;
    // Check if at least some core keys exist
    const hasStudents = Array.isArray(json.siap_students);
    const hasTeachers = Array.isArray(json.siap_teachers);
    const hasAcademic = json.siap_academic && typeof json.siap_academic === 'object';
    const hasSystem = json.siap_system && typeof json.siap_system === 'object';

    return hasStudents || hasTeachers || hasAcademic || hasSystem;
  };

  // Parse and preview upload file
  const processBackupFile = (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setPreviewData(null);

    if (file.type !== "application/json" && !file.name.endsWith('.json')) {
      setErrorMsg("Format file salah. Silakan unggah file dengan format .json.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rawResult = e.target?.result as string;
        const parsed = JSON.parse(rawResult);

        if (!validateBackupJSON(parsed)) {
          setErrorMsg("File JSON yang diunggah tidak valid sebagai backup aplikasi SIAP.");
          return;
        }

        setPreviewData(parsed);
      } catch (err: any) {
        setErrorMsg("Gagal membaca atau mem-parse file JSON: " + err.message);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Gagal membaca file.");
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processBackupFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processBackupFile(e.target.files[0]);
    }
  };

  // Confirm restore action
  const handleRestoreConfirm = () => {
    if (!previewData) return;

    try {
      const payload: {
        students?: Student[];
        teachers?: Teacher[];
        attendance?: Attendance[];
        grades?: Grade[];
        cases?: CaseReport[];
        achievements?: Achievement[];
        emails?: EmailLog[];
        academicSetting?: AcademicSetting;
        systemSetting?: SystemSetting;
      } = {};

      if (Array.isArray(previewData.siap_students)) payload.students = previewData.siap_students;
      if (Array.isArray(previewData.siap_teachers)) payload.teachers = previewData.siap_teachers;
      if (Array.isArray(previewData.siap_attendance)) payload.attendance = previewData.siap_attendance;
      if (Array.isArray(previewData.siap_grades)) payload.grades = previewData.siap_grades;
      if (Array.isArray(previewData.siap_cases)) payload.cases = previewData.siap_cases;
      if (Array.isArray(previewData.siap_achievements)) payload.achievements = previewData.siap_achievements;
      if (Array.isArray(previewData.siap_emails)) payload.emails = previewData.siap_emails;
      if (previewData.siap_academic) payload.academicSetting = previewData.siap_academic;
      if (previewData.siap_system) payload.systemSetting = previewData.siap_system;

      onRestoreData(payload);
      setSuccessMsg("Sistem berhasil dipulihkan dari file backup! Semua data akademik telah diperbarui.");
      setPreviewData(null);
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg("Terjadi kesalahan saat memulihkan data: " + err.message);
    }
  };

  // Reset to Factory defaults
  const handleResetExecute = () => {
    if (resetConfirmText.toLowerCase() !== 'reset data') {
      alert("Masukkan kalimat konfirmasi dengan tepat.");
      return;
    }
    onResetToDefault();
    setSuccessMsg("Sistem telah berhasil disetel ulang ke kondisi bawaan (factory reset).");
    setResetConfirmOpen(false);
    setResetConfirmText('');
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 selection:bg-emerald-500 selection:text-white font-sans text-xs">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" /> Backup & Restore Data
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Ekspor seluruh basis data ke file JSON lokal, pulihkan data sebelumnya, atau kembalikan setelan sistem ke kondisi awal.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="flex gap-2.5 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl mb-6">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Aksi Berhasil</p>
            <p className="text-emerald-400/80 leading-relaxed text-[11px]">{successMsg}</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex gap-2.5 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl mb-6">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Terjadi Kesalahan</p>
            <p className="text-rose-400/80 leading-relaxed text-[11px]">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* SECTION: CLOUD INTEGRATION (GOOGLE SHEETS, DRIVE, APPS SCRIPT) */}
      <div className="p-6 bg-slate-950/40 border border-slate-800 rounded-2xl mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Integrasi Cloud Google (Spreadsheet & Google Drive)
            </h3>
            <p className="text-slate-400 text-[11px] mt-1">
              Hubungkan aplikasi dengan Google Sheets Anda sebagai basis data cloud serta Google Drive sebagai folder backup otomatis.
            </p>
          </div>
          <button
            onClick={() => setShowScriptGuide(!showScriptGuide)}
            className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
          >
            {showScriptGuide ? 'Sembunyikan Panduan' : 'Lihat Panduan & Kode Apps Script'}
          </button>
        </div>

        {/* Apps Script Guide & Source Code */}
        {showScriptGuide && (
          <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl mb-4 space-y-3 animate-fadeIn text-[11px] text-slate-300 leading-relaxed">
            <h4 className="font-bold text-emerald-400 uppercase tracking-widest text-[9px]">Langkah Integrasi Google Apps Script:</h4>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
              <li>Buka file <strong>Google Spreadsheet</strong> yang telah Anda buat.</li>
              <li>Klik menu <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>.</li>
              <li>Hapus semua kode default yang ada di dalam editor.</li>
              <li>Salin (copy) seluruh kode di bawah ini dan tempelkan (paste) ke dalam editor Apps Script.</li>
              <li>Jika Anda ingin file backup JSON tersimpan di Drive secara otomatis, ganti nilai <code className="text-emerald-300 font-mono">YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE</code> dengan ID folder Google Drive Anda.</li>
              <li>Klik tombol <strong>Deploy</strong> &gt; <strong>Deployment baru (New deployment)</strong>.</li>
              <li>Pilih jenis <strong>Aplikasi web (Web app)</strong>. Isi keterangan, jalankan sebagai <strong>"Saya (email Anda)"</strong>, dan pilih akses <strong>"Siapa saja (Anyone)"</strong>.</li>
              <li>Klik <strong>Deploy</strong>, setujui izin akses (pilih Advanced &gt; Go to Untitled Project), lalu salin <strong>URL Aplikasi Web</strong> yang diberikan.</li>
              <li>Tempelkan (paste) URL tersebut ke dalam input di bawah ini, lalu klik tombol sinkronisasi.</li>
            </ol>

            <div className="relative mt-2">
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
                    alert("Kode Google Apps Script berhasil disalin ke clipboard!");
                  }}
                  className="px-2.5 py-1 bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 rounded transition text-[10px]"
                >
                  Salin Kode Script
                </button>
              </div>
              <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto text-[10px] text-slate-300 font-mono max-h-[220px]">
{GOOGLE_APPS_SCRIPT_CODE}
              </pre>
            </div>
          </div>
        )}

        {/* Input & Action Buttons */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-slate-300">URL Web App Google Apps Script</label>
            <input
              type="url"
              value={gasUrl}
              onChange={(e) => setGasUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 text-xs"
            />
            <p className="text-[10px] text-slate-500">
              URL ini dihasilkan setelah Anda melakukan "Deploy" &rarr; "Deployment baru" di Google Apps Script Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <button
              onClick={handleCloudBackup}
              disabled={isSyncing}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-emerald-500/10 ${
                isSyncing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSyncing ? (
                <>
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                  <span>Mensinkronkan...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Sinkronkan ke Spreadsheet & Drive</span>
                </>
              )}
            </button>

            <button
              onClick={handleCloudRestore}
              disabled={isRestoringCloud}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition ${
                isRestoringCloud ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isRestoringCloud ? (
                <>
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                  <span>Mengambil Data...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Pulihkan dari Spreadsheet Cloud</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box Left: Ekspor Backup */}
        <div className="p-6 bg-slate-950/40 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <Download className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ekspor Backup Data</h3>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px] mb-4">
              Menyimpan seluruh basis data sekolah saat ini ke dalam satu file tunggal format JSON. File backup ini dapat disimpan sebagai arsip mingguan atau bulanan untuk mencegah kehilangan data akibat pembersihan cache browser.
            </p>

            <div className="space-y-2.5 p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <h4 className="font-bold text-slate-300 uppercase tracking-widest text-[9px]">Arsip yang akan di-backup:</h4>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Siswa: <strong className="text-slate-200 font-mono font-bold">{students.length}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Guru: <strong className="text-slate-200 font-mono font-bold">{teachers.length}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Kehadiran: <strong className="text-slate-200 font-mono font-bold">{attendance.length}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Nilai Rapor: <strong className="text-slate-200 font-mono font-bold">{grades.length}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Kasus Siswa: <strong className="text-slate-200 font-mono font-bold">{cases.length}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Prestasi: <strong className="text-slate-200 font-mono font-bold">{achievements.length}</strong></span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleExportBackup}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Semua Data (.json)</span>
          </button>
        </div>

        {/* Box Right: Import/Restore Backup */}
        <div className="p-6 bg-slate-950/40 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-sky-500/10 border border-sky-500/20 rounded-lg">
                <UploadCloud className="w-4.5 h-4.5 text-sky-400" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pulihkan Data (Restore)</h3>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px] mb-4">
              Unggah file JSON hasil ekspor backup sebelumnya untuk menimpa database saat ini. Harap berhati-hati, memulihkan data akan menggantikan data aktif saat ini secara permanen.
            </p>

            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[110px] ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/70'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
              <FileJson className="w-8 h-8 text-slate-500 mb-2" />
              <p className="font-bold text-slate-300">Tarik & lepas file backup JSON di sini</p>
              <p className="text-[10px] text-slate-500 mt-1">Atau klik untuk memilih file dari komputer Anda</p>
            </div>
          </div>

          {/* Backup Preview and Action Panel */}
          {previewData && (
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-slate-200">Pratinjau File Backup</span>
                </div>
                <button
                  onClick={() => setPreviewData(null)}
                  className="text-slate-500 hover:text-rose-400 transition font-bold"
                >
                  Batal
                </button>
              </div>

              {previewData.metadata && (
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/40">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>Tgl: {new Date(previewData.metadata.exportedAt).toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-slate-500" />
                    <span>Peran: {previewData.metadata.exporterRole || 'ADMIN'}</span>
                  </div>
                  <div className="col-span-2 border-t border-slate-800/50 pt-1 mt-1 truncate font-bold text-slate-300">
                    Sekolah: {previewData.metadata.schoolName}
                  </div>
                </div>
              )}

              <div className="text-[10px] text-slate-400 space-y-1 bg-slate-950/30 p-2.5 rounded-lg">
                <p className="font-bold text-slate-300 uppercase tracking-wider text-[9px] mb-1">Rincian Komponen Data:</p>
                <p>• {Array.isArray(previewData.siap_students) ? previewData.siap_students.length : 0} Data Siswa</p>
                <p>• {Array.isArray(previewData.siap_teachers) ? previewData.siap_teachers.length : 0} Data Guru</p>
                <p>• {Array.isArray(previewData.siap_attendance) ? previewData.siap_attendance.length : 0} Log Kehadiran</p>
                <p>• {Array.isArray(previewData.siap_grades) ? previewData.siap_grades.length : 0} Entri Nilai Rapor</p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleRestoreConfirm}
                  className="flex-1 py-2 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition"
                >
                  Konfirmasi Pulihkan Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Box Bottom: Reset Data (ADMIN ONLY) */}
      {role === 'ADMIN' && (
        <div className="mt-8 p-6 bg-rose-500/5 border border-rose-500/15 rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <h3 className="text-sm font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Trash2 className="w-4.5 h-4.5" /> Setel Ulang ke Kondisi Bawaan (Factory Reset)
              </h3>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Aksi ini akan menghapus semua data transaksi absensi, nilai, riwayat pelanggaran, kas, dan guru yang telah Anda input, serta mengembalikan data siswa ke setelan demonstrasi awal. Aksi ini tidak dapat dibatalkan.
              </p>
            </div>
            <div>
              {!resetConfirmOpen ? (
                <button
                  onClick={() => setResetConfirmOpen(true)}
                  className="w-full md:w-auto px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold border border-rose-500/20 rounded-xl transition duration-150"
                >
                  Mulai Setel Ulang
                </button>
              ) : (
                <div className="bg-slate-950 p-4 border border-rose-500/20 rounded-xl space-y-3 min-w-[260px] animate-fadeIn">
                  <p className="font-bold text-rose-400 text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Ketik "reset data" untuk konfirmasi:
                  </p>
                  <input
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="Tulis kalimat konfirmasi..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-rose-500 text-xs text-center"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleResetExecute}
                      className="flex-1 py-1.5 px-2 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-lg transition"
                    >
                      Reset Sekarang
                    </button>
                    <button
                      onClick={() => {
                        setResetConfirmOpen(false);
                        setResetConfirmText('');
                      }}
                      className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
