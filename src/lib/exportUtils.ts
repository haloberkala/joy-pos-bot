import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

interface ExportOptions {
  title: string;
  subtitle?: string;
  filename: string;
  columns: ExportColumn[];
  data: Record<string, string | number>[];
  summaryRows?: { label: string; value: string }[];
}

export function exportToPDF(options: ExportOptions) {
  const { title, subtitle, filename, columns, data, summaryRows } = options;
  const doc = new jsPDF();

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 20);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, 28);
  }

  // Table
  const headers = columns.map((c) => c.header);
  const rows = data.map((row) => columns.map((c) => String(row[c.key] ?? '')));

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: subtitle ? 34 : 28,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: {
      fillColor: [45, 150, 130],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Summary
  if (summaryRows && summaryRows.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    let y = finalY + 10;
    doc.setFontSize(10);
    summaryRows.forEach((row) => {
      doc.setFont('helvetica', 'bold');
      doc.text(row.label, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(row.value, 80, y);
      y += 7;
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Dicetak: ${new Date().toLocaleDateString('id-ID')} | Halaman ${i} dari ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`${filename}.pdf`);
}

export function exportToExcel(options: ExportOptions) {
  const { filename, columns, data, summaryRows } = options;

  const headers = columns.map((c) => c.header);
  const rows = data.map((row) => columns.map((c) => row[c.key] ?? ''));

  const wsData = [headers, ...rows];

  // Add summary rows
  if (summaryRows && summaryRows.length > 0) {
    wsData.push([]); // empty row
    summaryRows.forEach((row) => {
      wsData.push([row.label, row.value]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = columns.map((c) => ({ wch: c.width || 15 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
