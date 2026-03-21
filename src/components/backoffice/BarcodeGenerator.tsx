import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeGeneratorProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}

export function BarcodeGenerator({
  value,
  width = 2,
  height = 50,
  displayValue = true,
  fontSize = 12,
  className = '',
}: BarcodeGeneratorProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          margin: 5,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch {
        // fallback for invalid barcode
        JsBarcode(svgRef.current, value.replace(/[^a-zA-Z0-9-_.]/g, ''), {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          margin: 5,
        });
      }
    }
  }, [value, width, height, displayValue, fontSize]);

  return <svg ref={svgRef} className={className} />;
}
