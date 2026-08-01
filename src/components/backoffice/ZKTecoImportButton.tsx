import { useRef, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { importZKTecoFile, ImportResult } from '@/services/attendanceImportService';

interface Props {
  storeId: number;
  onSuccess?: () => void;
}

/**
 * Bangun ringkasan toast dari ImportResult yang granular.
 *
 * - Jika ada data masuk/update  → success toast + detail baris per baris
 * - Jika semua dilewati         → warning toast + penyebab
 * - Jika error fatal            → error toast
 */
function buildToast(r: ImportResult): void {
  const hasActivity = r.inserted > 0 || r.updated > 0;
  const hasSkips    = r.skipped > 0;

  // Baris detail per kategori skip
  const detailLines: string[] = [];
  if (r.skippedDetail.sameData > 0)
    detailLines.push(`${r.skippedDetail.sameData} data tidak berubah`);
  if (r.skippedDetail.manualEditProtected > 0)
    detailLines.push(`${r.skippedDetail.manualEditProtected} data diedit manual (dilindungi)`);
  if (r.skippedDetail.unknownFingerprint > 0) {
    const ids = r.unknownFingerprintIds.join(', ');
    detailLines.push(
      `${r.skippedDetail.unknownFingerprint} fingerprint belum terdaftar (ID: ${ids})`
    );
  }
  if (r.errors.length > 0)
    detailLines.push(...r.errors);

  const description = detailLines.length > 0 ? detailLines.join('\n') : undefined;

  if (hasActivity) {
    const parts: string[] = [];
    if (r.inserted > 0) parts.push(`${r.inserted} data ditambahkan`);
    if (r.updated > 0)  parts.push(`${r.updated} data diperbarui`);
    if (hasSkips)       parts.push(`${r.skipped} dilewati`);
    toast.success(parts.join(', '), { description });
    return;
  }

  if (r.errors.length > 0 && !hasSkips) {
    toast.error(r.errors[0], {
      description: r.errors.slice(1).join('\n') || undefined,
    });
    return;
  }

  // Tidak ada yang masuk/update, hanya skip
  if (r.skippedDetail.unknownFingerprint > 0 && r.skipped === r.skippedDetail.unknownFingerprint) {
    // Semua skip karena fingerprint tidak terdaftar
    const ids = r.unknownFingerprintIds.join(', ');
    toast.warning(
      `${r.skippedDetail.unknownFingerprint} fingerprint belum terdaftar.`,
      { description: `ID: ${ids}` }
    );
    return;
  }

  if (r.skippedDetail.sameData > 0 && r.skipped === r.skippedDetail.sameData) {
    toast.warning('Semua data identik, tidak ada yang diperbarui.');
    return;
  }

  // Campuran berbagai alasan skip
  toast.warning(`${r.skipped} data dilewati.`, { description });
}

export function ZKTecoImportButton({ storeId, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    if (!/\.(xls|xlsx)$/i.test(file.name)) {
      toast.error('Format tidak didukung. Gunakan file .xls atau .xlsx dari mesin absensi.');
      return;
    }

    setIsLoading(true);
    try {
      const { importResult } = await importZKTecoFile(file, storeId);
      buildToast(importResult);

      if (importResult.inserted > 0 || importResult.updated > 0) {
        onSuccess?.();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal membaca file.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => !isLoading && inputRef.current?.click()}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-white
          text-sm font-medium text-foreground hover:bg-surface active:scale-[0.97]
          transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Memproses...
          </>
        ) : (
          <>
            <FileUp className="w-4 h-4" />
            Import Excel
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".xls,.xlsx"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload file Excel absensi"
      />
    </>
  );
}
