/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
export function convertToCSV<T extends Record<string, any>>(data: T[], headers: string[], keys: (keyof T)[]): string {
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
  let headmasterName = 'H. Mulyono, S.Pd., M.Pd.';
  try {
    const sysRaw = localStorage.getItem('siap_system');
    if (sysRaw) {
      const sys = JSON.parse(sysRaw);
      if (sys.schoolAddress) schoolAddress = sys.schoolAddress;
      if (sys.headmasterName) headmasterName = sys.headmasterName;
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
  const colCount = headers.length;
  
  const makeFooterRow = (text: string) => {
    const cells = Array(colCount).fill('""');
    const targetCol = Math.max(0, colCount - 2);
    cells[targetCol] = `"${text}"`;
    return cells.join(delimiter);
  };

  const footerRows = [
    "",
    "",
    makeFooterRow(`${cityName}, ${formattedDate}`),
    makeFooterRow("Mengetahui,"),
    makeFooterRow("Kepala Madrasah,"),
    "",
    "",
    "",
    makeFooterRow(headmasterName.toUpperCase()),
    makeFooterRow("NIP. 197812052005011002")
  ];

  return ["sep=;", headerLine, ...rows, ...footerRows].join('\n');
}

// Custom printer helper with elegant official letter headmaster signature and A4 layout
export function printToPDF(title: string, headers: string[], rows: string[][], schoolName: string, academicYear: string, semester: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Mohon izinkan pop-up untuk mencetak PDF.');
    return;
  }

  // Dynamic system signature footer retrieved from local storage
  let schoolAddress = '';
  let logoUrl = '';
  let headmasterName = 'H. Mulyono, S.Pd., M.Pd.';
  try {
    const sysRaw = localStorage.getItem('siap_system');
    if (sysRaw) {
      const sys = JSON.parse(sysRaw);
      if (sys.schoolAddress) schoolAddress = sys.schoolAddress;
      if (sys.logoUrl) logoUrl = sys.logoUrl;
      if (sys.headmasterName) headmasterName = sys.headmasterName;
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
            justify-content: center;
            border-bottom: 4.5px double #0f172a;
            padding-bottom: 12px;
            margin-bottom: 25px;
            position: relative;
          }

          .kop-logo {
            width: 80px;
            height: 80px;
            object-fit: contain;
            margin-right: 20px;
            flex-shrink: 0;
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
            margin-right: 20px;
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
            padding-right: 40px; /* balance the left logo space */
          }

          .kop-yayasan {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #475569;
            margin: 0 0 2px 0;
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

          .doc-number {
            font-family: monospace;
            font-size: 11px;
            color: #475569;
            margin: 0;
          }

          .meta-grid {
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 15px;
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
            justify-content: flex-end;
            margin-top: 30px;
            page-break-inside: avoid;
          }

          .signature-box {
            width: 280px;
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
          ${logoUrl ? `
            <img src="${logoUrl}" class="kop-logo" />
          ` : `
            <div class="kop-logo-placeholder">
              KOP<br/>SEKOLAH
            </div>
          `}
          <div class="kop-text-area">
            <p class="kop-yayasan">YAYASAN PENYELENGGARA PENDIDIKAN MADRASAH</p>
            <p class="kop-kemendikbud">KEMENTERIAN AGAMA REPUBLIK INDONESIA</p>
            <h1 class="kop-school-name">${schoolName}</h1>
            <p class="kop-alamat">${schoolAddress || 'Alamat lengkap instansi sekolah belum disetting di dashboard pengaturan.'}</p>
          </div>
        </div>

        <!-- Document Title & Header -->
        <div class="doc-header">
          <h2 class="doc-title">${title}</h2>
          <p class="doc-number">Nomor: SIAP/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}</p>
        </div>

        <!-- Metadata Block -->
        <div class="meta-grid">
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

        <!-- Aligned Headmaster Signature Footer -->
        <div class="signature-wrapper">
          <div class="signature-box">
            <div class="sig-place-date">${cityName}, ${formattedDate}</div>
            <div class="sig-title">Kepala Madrasah,</div>
            
            <div style="height: 65px;"></div> <!-- placeholder spacing for physical signature/stamp -->
            
            <p class="sig-name">${headmasterName}</p>
            <p class="sig-nip">NIP. 197812052005011002</p>
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
