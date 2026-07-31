/**
 * Roll Label PDF Generator
 * 
 * Generates professional barcode labels for roll label printers.
 * Supports: 40×30mm, 50×30mm, 58mm, 80mm
 * One label per page - compatible with both Thermal Transfer and Direct Thermal printers.
 */

import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { formatCurrency } from '@/lib/format';
import { Product } from '@/services/productsService';

export type LabelSize = '40x30mm' | '50x30mm' | '58mm' | '80mm';

interface LabelConfig {
  width: number; // in mm
  height: number; // in mm
  barcodeWidth: number;
  barcodeHeight: number;
  fontSize: {
    name: number;
    sku: number;
    price: number;
  };
  margin: number;
}

const LABEL_CONFIGS: Record<LabelSize, LabelConfig> = {
  '40x30mm': {
    width: 40,
    height: 30,
    barcodeWidth: 1,
    barcodeHeight: 10,
    fontSize: {
      name: 6,
      sku: 5,
      price: 7,
    },
    margin: 2,
  },
  '50x30mm': {
    width: 50,
    height: 30,
    barcodeWidth: 1.2,
    barcodeHeight: 12,
    fontSize: {
      name: 7,
      sku: 5,
      price: 7,
    },
    margin: 2,
  },
  '58mm': {
    width: 58,
    height: 40,
    barcodeWidth: 1.5,
    barcodeHeight: 15,
    fontSize: {
      name: 8,
      sku: 6,
      price: 9,
    },
    margin: 3,
  },
  '80mm': {
    width: 80,
    height: 50,
    barcodeWidth: 2,
    barcodeHeight: 20,
    fontSize: {
      name: 10,
      sku: 7,
      price: 11,
    },
    margin: 4,
  },
};

/**
 * Generate barcode image as data URL
 */
function generateBarcodeImage(
  code: string,
  width: number,
  height: number
): string | null {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, code, {
      format: 'CODE128',
      width,
      height,
      displayValue: false,
      margin: 2,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error generating barcode:', error);
    return null;
  }
}

/**
 * Wrap text to fit within max width
 */
function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  // Approximate character width based on font size
  const avgCharWidth = fontSize * 0.5;
  const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  // Limit to 2 lines max
  return lines.slice(0, 2);
}

/**
 * Generate roll label PDF
 * One label per page
 */
export function generateRollLabelPDF(
  products: Product[],
  labelSize: LabelSize,
  filename: string = 'barcode-label.pdf'
): void {
  const config = LABEL_CONFIGS[labelSize];
  const doc = new jsPDF({
    orientation: config.width > config.height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [config.width, config.height],
  });

  products.forEach((product, index) => {
    // Add new page for each product (except first)
    if (index > 0) {
      doc.addPage();
    }

    const centerX = config.width / 2;
    let currentY = config.margin;

    // Generate barcode image
    const barcodeImage = generateBarcodeImage(
      product.code,
      config.barcodeWidth,
      config.barcodeHeight
    );

    if (barcodeImage) {
      const barcodeWidth = config.width - (config.margin * 2);
      const barcodeImgHeight = config.barcodeHeight;

      // Draw barcode (centered)
      doc.addImage(
        barcodeImage,
        'PNG',
        config.margin,
        currentY,
        barcodeWidth,
        barcodeImgHeight
      );
      currentY += barcodeImgHeight + 2;

      // Product name (centered, bold, wrapped to 2 lines max)
      doc.setFontSize(config.fontSize.name);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      const maxNameWidth = config.width - (config.margin * 2);
      const nameLines = wrapText(product.name, maxNameWidth, config.fontSize.name);
      
      nameLines.forEach((line, idx) => {
        doc.text(line, centerX, currentY + (idx * (config.fontSize.name * 0.4)), {
          align: 'center',
          maxWidth: maxNameWidth,
        });
      });
      currentY += (nameLines.length * (config.fontSize.name * 0.4)) + 2;

      // SKU (centered)
      doc.setFontSize(config.fontSize.sku);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`SKU ${product.code}`, centerX, currentY, {
        align: 'center',
      });
      currentY += config.fontSize.sku * 0.4 + 1;

      // Price (centered, bold)
      doc.setFontSize(config.fontSize.price);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(
        formatCurrency(product.selling_price_retail),
        centerX,
        currentY,
        { align: 'center' }
      );
    }
  });

  doc.save(filename);
}
