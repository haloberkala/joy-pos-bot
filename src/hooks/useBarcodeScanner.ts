import { useEffect, useRef, useCallback } from 'react';

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minLength?: number;
  maxKeystrokeGap?: number; // ms antar karakter scanner (default 50ms)
  enabled?: boolean;
}

/**
 * useBarcodeScanner — Global keyboard-wedge barcode listener
 *
 * Cara kerja:
 * - Scanner mengirim karakter sangat cepat (<50ms/karakter)
 * - Manusia mengetik lebih lambat (>80ms/karakter)
 * - Hook membedakan keduanya berdasarkan gap antar keystroke
 *
 * Perbaikan v2:
 * - Capture phase: intercept event sebelum sampai ke form field
 * - onScan disimpan di ref: tidak re-register listener tiap render
 * - Form field logic: hanya block jika gap besar (ketukan manusia)
 */
export function useBarcodeScanner({
  onScan,
  minLength = 6,
  maxKeystrokeGap = 50,
  enabled = true,
}: BarcodeScannerOptions) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Simpan onScan di ref agar tidak trigger re-register listener tiap render parent
  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  const flush = useCallback(() => {
    const code = bufferRef.current.trim();
    bufferRef.current = '';
    if (code.length >= minLength) {
      onScanRef.current(code);
    }
  }, [minLength]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      const isFormField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      const now = Date.now();
      const gap = now - lastKeyTimeRef.current;

      // Reset buffer jika gap terlalu lama (bukan input scanner)
      if (gap > maxKeystrokeGap && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      // Jika user mengetik manual di form (gap besar = human typing)
      // dan buffer masih kosong → ini bukan scanner, biarkan form menerimanya
      if (isFormField && gap > maxKeystrokeGap && bufferRef.current.length === 0) {
        lastKeyTimeRef.current = now;
        return;
      }

      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          e.preventDefault(); // Cegah submit form saat scan di dalam form field
          flush();
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        // Auto-flush untuk scanner mode continuous (tanpa Enter)
        timeoutRef.current = setTimeout(flush, maxKeystrokeGap * 4);
      }
    };

    // capture: true = intercept sebelum event sampai ke elemen form
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, maxKeystrokeGap, flush]);
}
