import jsPDF from 'jspdf';

const BLACK: [number, number, number] = [0, 0, 0];
const PAGE_WIDTH = 241.3;
const PAGE_HEIGHT = 139.7;
const LEFT = 12;
const TOP = 5;
const WIDTH = 190;
const HEIGHT = 130;
const RIGHT = LEFT + WIDTH;
const BOTTOM = TOP + HEIGHT;
const FONT_SIZE = 8.5;
const LINE_WIDTH = 0.2;

/** Generates a fixed calibration sheet for the Epson LX-310 printable area. */
export function generateCalibrationPDF(): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [PAGE_WIDTH, PAGE_HEIGHT],
    putOnlyUsedFonts: true,
    compress: false,
  });

  doc.setDrawColor(...BLACK);
  doc.setTextColor(...BLACK);
  doc.setLineWidth(LINE_WIDTH);
  doc.setFont('courier', 'normal');
  doc.setFontSize(FONT_SIZE);
  doc.rect(LEFT, TOP, WIDTH, HEIGHT);

  for (let offset = 0; offset <= WIDTH; offset += 10) {
    const x = LEFT + offset;
    doc.line(x, TOP, x, BOTTOM);
    doc.text(String(offset), x, TOP + 4, { align: offset === 0 ? 'left' : offset === WIDTH ? 'right' : 'center' });
  }

  for (let offset = 0; offset <= HEIGHT; offset += 10) {
    const y = TOP + offset;
    doc.line(LEFT, y, RIGHT, y);
    doc.text(String(offset), LEFT - 2, Math.min(y + 2.5, BOTTOM), { align: 'right' });
  }

  drawCrosshair(doc, LEFT, TOP);
  drawCrosshair(doc, RIGHT, TOP);
  drawCrosshair(doc, LEFT, BOTTOM);
  drawCrosshair(doc, RIGHT, BOTTOM);
  drawCrosshair(doc, LEFT + WIDTH / 2, TOP + HEIGHT / 2);

  drawAlphabet(doc, LEFT + 4, TOP + 14, 'left');
  drawAlphabet(doc, LEFT + WIDTH / 2, TOP + HEIGHT / 2 - 5, 'center');
  drawAlphabet(doc, RIGHT - 4, BOTTOM - 10, 'right');

  doc.setFont('courier', 'bold');
  doc.text('Printer Calibration', LEFT + 4, BOTTOM - 22);
  doc.setFont('courier', 'normal');
  doc.text('Expected printable width: 190 mm', LEFT + 4, BOTTOM - 17);
  doc.text('Paper: 241.3 x 139.7 mm', LEFT + 4, BOTTOM - 12);

  return doc;
}

function drawCrosshair(doc: jsPDF, x: number, y: number): void {
  const size = 2.5;
  doc.line(x - size, y, x + size, y);
  doc.line(x, y - size, x, y + size);
}

function drawAlphabet(doc: jsPDF, x: number, y: number, align: 'left' | 'center' | 'right'): void {
  doc.setFont('courier', 'normal');
  doc.setFontSize(FONT_SIZE);
  doc.text('ABCDEFGHIJKLMNOPQRSTUVWXYZ', x, y, { align });
  doc.text('abcdefghijklmnopqrstuvwxyz', x, y + 4.5, { align });
  doc.text('0123456789', x, y + 9, { align });
}
