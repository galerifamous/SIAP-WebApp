/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to download a string of data as a file
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Convert JSON array to CSV string with official signature footer at the bottom
export function convertToCSV<T extends Record<string, any>>(
  data: T[],
  headers: string[],
  keys: (keyof T)[],
  waliKelas?: string
): string {
  const delimiter = ';';
  const headerLine = headers.join(delimiter);
  const rows = data.map(item => {
    return keys.map(key => {
      const val = item[key];
      if (val === undefined || val === null) return '""';
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    }).join(delimiter);
  });

  // Dynamic system signature footer retrieved from local storage
  let schoolAddress = '';
  let headmasterName = 'Makhfud, S.Pd.';
  let headmasterNip = '197812052005011002';
  
  try {
    const acadRaw = localStorage.getItem('siap_academic');
    if (acadRaw) {
      const acad = JSON.parse(acadRaw);
      if (acad.headmasterName) headmasterName = acad.headmasterName;
      else if (acad.headmaster) headmasterName = acad.headmaster;
      if (acad.headmasterNip) headmasterNip = acad.headmasterNip;
    }
  } catch (e) {}

  try {
    const sysRaw = localStorage.getItem('siap_system');
    if (sysRaw) {
      const sys = JSON.parse(sysRaw);
      if (sys.schoolAddress) schoolAddress = sys.schoolAddress;
      const hasAcadHead = localStorage.getItem('siap_academic') && (JSON.parse(localStorage.getItem('siap_academic') || '{}').headmasterName || JSON.parse(localStorage.getItem('siap_academic') || '{}').headmaster);
      if (!hasAcadHead && sys.headmasterName) {
        headmasterName = sys.headmasterName;
      }
    }
  } catch (e) {
    // ignore
  }

  let resolvedWaliKelas = waliKelas;
  if (!resolvedWaliKelas) {
    const firstItem = data[0];
    const itemClass = firstItem ? (firstItem.class || firstItem.studentClass) : null;
    if (itemClass) {
      try {
        const staffsRaw = localStorage.getItem('siap_class_staffs');
        const teachersRaw = localStorage.getItem('siap_teachers');
        if (staffsRaw && teachersRaw) {
          const staffs = JSON.parse(staffsRaw);
          const teachers = JSON.parse(teachersRaw);
          const staff = staffs.find((s: any) => s.classId === itemClass);
          if (staff) {
            const teacher = teachers.find((t: any) => t.nuptk === staff.waliKelasNuptk);
            if (teacher) {
              resolvedWaliKelas = teacher.name;
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }

  let cityName = 'Indonesia';
  if (schoolAddress) {
    const parts = schoolAddress.split(',');
    if (parts.length > 1) {
      cityName = parts[parts.length - 2].trim().replace(/Kec\.|Kab\.|Kota/g, '').trim();
    } else if (parts.length > 0) {
      cityName = parts[0].trim();
    }
  }
  if (!cityName || cityName.length > 20) {
    cityName = 'Kota Sekolah';
  }

  const formattedDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const colCount = headers.length;
  
  const makeFooterRowDual = (leftText: string, rightText: string) => {
    const cells = Array(colCount).fill('""');
    cells[1] = `"${leftText}"`;
    cells[Math.max(2, colCount - 2)] = `"${rightText}"`;
    return cells.join(delimiter);
  };

  const footerRows = [
    "",
    "",
    makeFooterRowDual("", `${cityName}, ${formattedDate}`),
    makeFooterRowDual("Mengetahui,", ""),
    makeFooterRowDual("Kepala Madrasah,", "Wali Kelas,"),
    "",
    "",
    "",
    makeFooterRowDual(headmasterName.toUpperCase(), (resolvedWaliKelas || '........................').toUpperCase()),
    makeFooterRowDual("NIP. " + headmasterNip, "NIP. ................................")
  ];

  return ["sep=;", headerLine, ...rows, ...footerRows].join('\n');
}

// Custom printer helper with elegant official letter headmaster signature and A4 layout
export function printToPDF(
  title: string,
  headers: string[],
  rows: string[][],
  schoolName: string,
  academicYear: string,
  semester: string,
  classFilter?: string,
  waliKelas?: string
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Mohon izinkan pop-up untuk mencetak PDF.');
    return;
  }

  // Dynamic system signature footer retrieved from local storage
  let schoolAddress = '';
  let logoUrl = '';
  let govLogoUrl = '';
  let headmasterName = 'Makhfud, S.Pd.';
  let headmasterNip = '197812052005011002';
  
  try {
    const acadRaw = localStorage.getItem('siap_academic');
    if (acadRaw) {
      const acad = JSON.parse(acadRaw);
      if (acad.headmasterName) headmasterName = acad.headmasterName;
      else if (acad.headmaster) headmasterName = acad.headmaster;
      if (acad.headmasterNip) headmasterNip = acad.headmasterNip;
    }
  } catch (e) {}

  try {
    const sysRaw = localStorage.getItem('siap_system');
    if (sysRaw) {
      const sys = JSON.parse(sysRaw);
      if (sys.schoolAddress) schoolAddress = sys.schoolAddress;
      if (sys.logoUrl) logoUrl = sys.logoUrl;
      if (sys.govLogoUrl) govLogoUrl = sys.govLogoUrl;
      const hasAcadHead = localStorage.getItem('siap_academic') && (JSON.parse(localStorage.getItem('siap_academic') || '{}').headmasterName || JSON.parse(localStorage.getItem('siap_academic') || '{}').headmaster);
      if (!hasAcadHead && sys.headmasterName) {
        headmasterName = sys.headmasterName;
      }
    }
  } catch (e) {
    // ignore
  }

  let cityName = 'Indonesia';
  if (schoolAddress) {
    const parts = schoolAddress.split(',');
    if (parts.length > 1) {
      cityName = parts[parts.length - 2].trim().replace(/Kec\.|Kab\.|Kota/g, '').trim();
    } else if (parts.length > 0) {
      cityName = parts[0].trim();
    }
  }
  if (!cityName || cityName.length > 20) {
    cityName = 'Kota Sekolah';
  }

  const formattedDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = `
    <html>
      <head>
        <title>${title} - ${schoolName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap');
          
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 20mm 15mm;
          }

          body {
            font-family: 'Inter', sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

           /* Official Kop Surat (Letterhead) Style */
          .kop-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 4.5px double #0f172a;
            padding-bottom: 12px;
            margin-bottom: 25px;
            position: relative;
          }

          .kop-logo {
            width: 80px;
            height: 80px;
            object-fit: contain;
            flex-shrink: 0;
          }

          .kop-logo-left {
            margin-right: 15px;
          }

          .kop-logo-right {
            margin-left: 15px;
          }

          .kop-logo-placeholder {
            width: 75px;
            height: 75px;
            border-radius: 50%;
            background-color: #f1f5f9;
            border: 2px solid #0f172a;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-size: 10px;
            font-weight: 800;
            color: #475569;
            text-align: center;
            line-height: 1.2;
          }

          .kop-text-area {
            text-align: center;
            flex-grow: 1;
          }

          .kop-kemendikbud {
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #1e293b;
            margin: 0 0 3px 0;
          }

          .kop-school-name {
            font-family: 'Cinzel', serif;
            font-size: 21px;
            font-weight: bold;
            text-transform: uppercase;
            color: #0f172a;
            margin: 0 0 4px 0;
            letter-spacing: 0.5px;
            line-height: 1.1;
          }

          .kop-alamat {
            font-size: 10px;
            color: #475569;
            margin: 0;
            line-height: 1.4;
            font-weight: 500;
          }

          /* Document Header & Details */
          .doc-header {
            text-align: center;
            margin-bottom: 25px;
          }

          .doc-title {
            font-size: 16px;
            font-weight: 800;
            text-transform: uppercase;
            color: #0f172a;
            margin: 0 0 6px 0;
            letter-spacing: 0.5px;
            text-decoration: underline;
          }

          .meta-grid {
            display: grid;
            grid-template-cols: 1fr;
            gap: 8px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 18px;
            margin-bottom: 25px;
            font-size: 12px;
          }

          .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .meta-label {
            color: #64748b;
            font-weight: 500;
            width: 130px;
          }

          .meta-value {
            color: #0f172a;
            font-weight: 700;
          }

          /* Table Styling */
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-top: 5px;
            margin-bottom: 40px;
          }

          th {
            background-color: #0f172a;
            color: #ffffff;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
            text-align: left;
            padding: 11px 12px;
            border: 1px solid #334155;
          }

          td {
            padding: 9px 12px;
            border: 1px solid #cbd5e1;
            color: #334155;
            line-height: 1.4;
          }

          tr:nth-child(even) {
            background-color: #f8fafc;
          }

          /* Signature block styled elegantly */
          .signature-wrapper {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            page-break-inside: avoid;
          }

          .signature-box {
            width: 250px;
            text-align: center;
            font-size: 12px;
          }

          .sig-place-date {
            margin-bottom: 5px;
            color: #334155;
          }

          .sig-title {
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 75px; /* height for signature */
          }

          .sig-name {
            font-weight: 800;
            text-transform: uppercase;
            text-decoration: underline;
            color: #0f172a;
            margin: 0;
            font-size: 13px;
          }

          .sig-nip {
            font-family: monospace;
            font-size: 11px;
            color: #475569;
            margin-top: 4px;
          }

          .document-footer {
            position: fixed;
            bottom: -5mm;
            left: 0;
            right: 0;
            height: 15px;
            display: flex;
            justify-content: space-between;
            font-size: 8px;
            color: #94a3b8;
            font-family: 'Inter', sans-serif;
            border-top: 1px solid #cbd5e1;
            padding-top: 4px;
            z-index: 9999;
          }
          .document-footer-left {
            font-weight: bold;
          }
          .document-footer-right::after {
            content: "Halaman " counter(page);
            font-weight: bold;
          }

          @media print {
            body {
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <!-- Footer on every page -->
        <div class="document-footer">
          <div class="document-footer-left">Aplikasi SIAP • Dokumen Resmi Madrasah</div>
          <div class="document-footer-right"></div>
        </div>

        <!-- Beautiful Kop Surat (Letterhead) -->
        <div class="kop-container">
          <!-- Left Logo (Ministry / Gov Logo) -->
          ${govLogoUrl ? `
            <img src="${govLogoUrl}" class="kop-logo kop-logo-left" />
          ` : `
            <div class="kop-logo-placeholder kop-logo-left">
              KOP<br/>DINAS
            </div>
          `}
          
          <div class="kop-text-area">
            <p class="kop-kemendikbud">KEMENTERIAN AGAMA REPUBLIK INDONESIA</p>
            <h1 class="kop-school-name">${schoolName}</h1>
            <p class="kop-alamat">${schoolAddress || 'Alamat lengkap instansi sekolah belum disetting di dashboard pengaturan.'}</p>
          </div>

          <!-- Right Logo (Madrasah / School Logo) -->
          ${logoUrl ? `
            <img src="${logoUrl}" class="kop-logo kop-logo-right" />
          ` : `
            <div class="kop-logo-placeholder kop-logo-right">
              KOP<br/>SEKOLAH
            </div>
          `}
        </div>

        <!-- Document Title & Header -->
        <div class="doc-header">
          <h2 class="doc-title">${title}</h2>
        </div>

        <!-- Metadata Block -->
        <div class="meta-grid">
          ${classFilter ? `
            <div class="meta-item">
              <span class="meta-label">Tahun Pelajaran</span>
              <span>:</span>
              <span class="meta-value">${academicYear}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Semester</span>
              <span>:</span>
              <span class="meta-value">${semester}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Kelas</span>
              <span>:</span>
              <span class="meta-value">${classFilter}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Wali Kelas</span>
              <span>:</span>
              <span class="meta-value">${waliKelas || '........................'}</span>
            </div>
          ` : `
            <div class="meta-item">
              <span class="meta-label">Tahun Pelajaran</span>
              <span>:</span>
              <span class="meta-value">${academicYear}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Semester / Tingkat</span>
              <span>:</span>
              <span class="meta-value">${semester}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Sistem Aplikasi</span>
              <span>:</span>
              <span class="meta-value">SIAP (Official Digital Report)</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Tanggal Cetak</span>
              <span>:</span>
              <span class="meta-value">${formattedDate}</span>
            </div>
          `}
        </div>

        <!-- Main Report Table -->
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell !== undefined && cell !== null ? cell : '-'}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Aligned Dual Signature Footer -->
        <div class="signature-wrapper">
          <div class="signature-box" style="text-align: left;">
            <div style="visibility: hidden;" class="sig-place-date">${cityName}, ${formattedDate}</div>
            <div style="margin-bottom: 15px; font-weight: bold; text-align: left; color: #0f172a;">Mengetahui,</div>
            <div class="sig-title" style="text-align: left;">Kepala Madrasah,</div>
            <p class="sig-name" style="text-align: left;">${headmasterName}</p>
            <p class="sig-nip" style="text-align: left;">NIP. ${headmasterNip}</p>
          </div>

          <div class="signature-box" style="text-align: right;">
            <div class="sig-place-date">${cityName}, ${formattedDate}</div>
            <div style="visibility: hidden; margin-bottom: 15px;">&nbsp;</div>
            <div class="sig-title" style="text-align: right; padding-right: 25px;">Wali Kelas,</div>
            <p class="sig-name" style="text-align: right; padding-right: 25px;">${waliKelas || '........................'}</p>
            <p class="sig-nip" style="text-align: right; padding-right: 25px;">NIP. ................................</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

// Direct PDF download helper utilizing jsPDF and jspdf-autotable
export function downloadToPDF(
  title: string,
  headers: string[],
  rows: string[][],
  filename: string,
  schoolName?: string,
  academicYear?: string,
  semester?: string,
  classFilter?: string,
  waliKelas?: string
) {
  const doc = new jsPDF('p', 'mm', 'a4');

  // Dynamic system signature footer retrieved from local storage
  let schoolAddress = '';
  let headmasterName = 'Makhfud, S.Pd.';
  let headmasterNip = '197812052005011002';
  let logoUrl = '';
  let govLogoUrl = '';

  try {
    const acadRaw = localStorage.getItem('siap_academic');
    if (acadRaw) {
      const acad = JSON.parse(acadRaw);
      if (acad.headmasterName) headmasterName = acad.headmasterName;
      else if (acad.headmaster) headmasterName = acad.headmaster;
      if (acad.headmasterNip) headmasterNip = acad.headmasterNip;
    }
  } catch (e) {}

  try {
    const sysRaw = localStorage.getItem('siap_system');
    if (sysRaw) {
      const sys = JSON.parse(sysRaw);
      if (sys.schoolAddress) schoolAddress = sys.schoolAddress;
      if (sys.logoUrl) logoUrl = sys.logoUrl;
      if (sys.govLogoUrl) govLogoUrl = sys.govLogoUrl;
      const hasAcadHead = localStorage.getItem('siap_academic') && (JSON.parse(localStorage.getItem('siap_academic') || '{}').headmasterName || JSON.parse(localStorage.getItem('siap_academic') || '{}').headmaster);
      if (!hasAcadHead && sys.headmasterName) {
        headmasterName = sys.headmasterName;
      }
    }
  } catch (e) {
    // ignore
  }

  // Draw Ministry/Gov logo on the left
  if (govLogoUrl) {
    try {
      doc.addImage(govLogoUrl, 'PNG', 15, 11, 20, 20);
    } catch (e) {
      console.error("Error adding gov logo to PDF:", e);
    }
  }

  // Draw school logo on the right
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 'PNG', 175, 11, 20, 20);
    } catch (e) {
      console.error("Error adding school logo to PDF:", e);
    }
  }

  // Header / Kop Surat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', 105, 15, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text(schoolName || 'MADRASAH TSANAWIYAH', 105, 22, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (schoolAddress) {
    const wrappedAddress = doc.splitTextToSize(schoolAddress, 180);
    doc.text(wrappedAddress, 105, 27, { align: 'center' });
  } else {
    doc.text('Alamat lengkap instansi sekolah belum disetting di dashboard pengaturan.', 105, 27, { align: 'center' });
  }

  // Draw Double Line
  doc.setLineWidth(0.8);
  doc.line(15, 33, 195, 33);
  doc.setLineWidth(0.2);
  doc.line(15, 34, 195, 34);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title.toUpperCase(), 105, 42, { align: 'center' });

  // Metadata Grid
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  let yPos = 48;
  if (academicYear || semester || classFilter) {
    doc.text(`Tahun Pelajaran : ${academicYear || '-'}`, 15, yPos);
    doc.text(`Semester          : ${semester || '-'}`, 15, yPos + 5);
    if (classFilter) {
      doc.text(`Kelas                : ${classFilter}`, 15, yPos + 10);
    } else {
      yPos -= 5;
    }
    if (waliKelas) {
      doc.text(`Wali Kelas        : ${waliKelas}`, 15, yPos + 15);
    } else {
      yPos -= 5;
    }
    yPos += 22;
  } else {
    doc.text(`Tanggal Unduh   : ${new Date().toLocaleDateString('id-ID')}`, 15, yPos);
    yPos += 8;
  }

  // Table using jspdf-autotable
  autoTable(doc, {
    startY: yPos,
    head: [headers],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 15, right: 15 },
    styles: { overflow: 'linebreak', cellPadding: 2 },
  });

  // Signature Block at the end of the document
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  const pageHeight = doc.internal.pageSize.height;
  
  let sigY = finalY;
  if (finalY + 40 > pageHeight) {
    doc.addPage();
    sigY = 25;
  }
  
  let cityName = 'Indonesia';
  if (schoolAddress) {
    const parts = schoolAddress.split(',');
    if (parts.length > 1) {
      cityName = parts[parts.length - 2].trim().replace(/Kec\.|Kab\.|Kota/g, '').trim();
    } else if (parts.length > 0) {
      cityName = parts[0].trim();
    }
  }
  if (!cityName || cityName.length > 20) {
    cityName = 'Kota Sekolah';
  }
  const formattedDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  // Right signature (Wali Kelas)
  doc.text(`${cityName}, ${formattedDate}`, 145, sigY);
  doc.text('Wali Kelas,', 145, sigY + 10);
  doc.text(waliKelas || '........................', 145, sigY + 30);
  doc.text('NIP. ................................', 145, sigY + 34);

  // Left signature (Kepala Madrasah)
  doc.text('Mengetahui,', 25, sigY + 5);
  doc.text('Kepala Madrasah,', 25, sigY + 10);
  doc.text(headmasterName, 25, sigY + 30);
  doc.text(`NIP. ${headmasterNip}`, 25, sigY + 34);

  // Save PDF directly
  doc.save(filename);
}
