import { useEffect, useRef, useCallback } from 'react';

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minLength?: number;
  scannerKeystrokeDelay?: number; // Max ms between scanner keystrokes (default 50ms)
  humanKeystrokeDelay?: number;   // Min ms for human typing (default 100ms)
  enabled?: boolean;
}

/**
 * useBarcodeScanner — Production-grade keyboard-wedge barcode scanner hook
 *
 * PROBLEM:
 * - Barcode scanner acts as keyboard (USB HID)
 * - POS has auto-focused search input
 * - Scanner types fast (<50ms/char), humans type slow (>100ms/char)
 * - Need to differentiate WITHOUT letting barcode appear in input
 *
 * TECHNICAL CHALLENGE:
 * Browser event order: keydown → beforeinput → input → keyup
 * - First character is ALWAYS ambiguous (could be human or scanner)
 * - We only know it's a scanner when 2nd char arrives <50ms after 1st
 * - By then, 1st char already in input (if we don't preventDefault)
 *
 * SOLUTION (Aggressive Prevention + Selective Passthrough):
 * 1. Capture ALL keydown events in capture phase (before reaching input)
 * 2. preventDefault() on printable chars IMMEDIATELY (aggressive block)
 * 3. Buffer the character
 * 4. If next char arrives quickly (<50ms) → scanner detected, continue buffering
 * 5. If timeout (>100ms) → human typing, STOP preventing future keys
 * 6. On Enter or timeout → flush buffer and execute callback
 *
 * TRADE-OFFS:
 * - Must preventDefault BEFORE knowing if it's scanner (aggressive)
 * - First char of human typing has ~50ms delay (imperceptible)
 * - Scanner chars never reach input (desired behavior)
 * - Human typing flows normally after first char
 *
 * INSPIRATION:
 * Similar to commercial POS systems (Moka, Pawoon, Square) which use:
 * - Event interception at capture phase
 * - Timing-based detection
 * - Selective event blocking
 */
export function useBarcodeScanner({
  onScan,
  minLength = 6,
  scannerKeystrokeDelay = 50,
  humanKeystrokeDelay = 100,
  enabled = true,
}: BarcodeScannerOptions) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScanningRef = useRef(false);
  const preventionActiveRef = useRef(false);

  // Store callback in ref to avoid re-registering listener on every render
  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  const reset = useCallback(() => {
    bufferRef.current = '';
    isScanningRef.current = false;
    preventionActiveRef.current = false;
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
  }, []);

  const flush = useCallback(() => {
    const code = bufferRef.current.trim();
    reset();
    
    if (code.length >= minLength) {
      onScanRef.current(code);
    }
  }, [minLength, reset]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const gap = now - lastKeyTimeRef.current;

      // Handle Enter key
      if (e.key === 'Enter') {
        if (bufferRef.current.length > 0) {
          // Prevent Enter if we have buffered content (likely end of barcode)
          e.preventDefault();
          e.stopPropagation();
          flush();
        }
        return;
      }

      // Only handle printable characters
      if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      // Check if this could be scanner input
      const couldBeScanner = 
        bufferRef.current.length === 0 || // First char (always ambiguous)
        (bufferRef.current.length > 0 && gap < scannerKeystrokeDelay); // Fast follow-up

      if (couldBeScanner) {
        // AGGRESSIVE PREVENTION: Block this keystroke from reaching input
        e.preventDefault();
        e.stopPropagation();
        
        preventionActiveRef.current = true;
        bufferRef.current += e.key;
        lastKeyTimeRef.current = now;

        // Clear any existing timeout
        if (flushTimeoutRef.current) {
          clearTimeout(flushTimeoutRef.current);
        }

        // Check if we've confirmed this is a scanner (2+ chars with fast gaps)
        if (bufferRef.current.length >= 2) {
          isScanningRef.current = true;
        }

        // Set timeout to flush or reset
        // - For scanner: wait for more chars or Enter (flush when done)
        // - For human: timeout means they stopped, clear buffer
        flushTimeoutRef.current = setTimeout(() => {
          if (isScanningRef.current) {
            // Scanner mode: flush the complete barcode
            flush();
          } else {
            // Was just a single char (human typing), reset
            // Future keystrokes will not be prevented
            reset();
          }
        }, humanKeystrokeDelay);
      } else {
        // Gap is too large, this is human typing
        // Stop preventing and reset buffer
        if (bufferRef.current.length > 0) {
          reset();
        }
        // Let this keystroke pass through normally (no preventDefault)
      }
    };

    // Use capture phase to intercept BEFORE event reaches form inputs
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      reset();
    };
  }, [enabled, scannerKeystrokeDelay, humanKeystrokeDelay, flush, reset]);
}
