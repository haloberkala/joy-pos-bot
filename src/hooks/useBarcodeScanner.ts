import { useState, useEffect, useCallback, useRef } from 'react';

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minLength?: number;
  maxDelay?: number; // max ms between keystrokes to be considered scanner input
  enabled?: boolean;
}

export function useBarcodeScanner({
  onScan,
  minLength = 6,
  maxDelay = 50,
  enabled = true,
}: BarcodeScannerOptions) {
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const bufferRef = useRef('');
  const lastKeystrokeRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processBuffer = useCallback(() => {
    const barcode = bufferRef.current.trim();
    if (barcode.length >= minLength) {
      setLastScanned(barcode);
      onScan(barcode);
    }
    bufferRef.current = '';
  }, [onScan, minLength]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea (unless it's a barcode field)
      const target = e.target as HTMLElement;
      const isInBarcodeField = target.getAttribute('data-barcode-input') === 'true';
      const isInFormField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
      
      if (isInFormField && !isInBarcodeField) return;

      const now = Date.now();
      const timeSinceLastKeystroke = now - lastKeystrokeRef.current;

      // If too much time passed, reset buffer
      if (timeSinceLastKeystroke > maxDelay && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      lastKeystrokeRef.current = now;

      if (e.key === 'Enter') {
        e.preventDefault();
        processBuffer();
        return;
      }

      // Only accept printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;
        
        // Clear existing timeout
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        // Set timeout to process after delay (in case Enter is not sent)
        timeoutRef.current = setTimeout(() => {
          processBuffer();
        }, maxDelay * 3);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, maxDelay, processBuffer]);

  const clearLastScanned = useCallback(() => {
    setLastScanned(null);
  }, []);

  return { lastScanned, clearLastScanned };
}
