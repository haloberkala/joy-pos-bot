import { useRef, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { importZKTecoFile } from '@/services/attendanceImportService';

interface Props {
  storeId: number;
  onSuccess?: () => void;
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

      const hasActivity = importResult.inserted > 0 || importResult.updated > 0;

      if (hasActivity) {
        const parts: string[] = [];
        if (importResult.inserted > 0) parts.push(`${importResult.inserted} ditambah`);
        if (importResult.updated > 0) parts.push(`${importResult.updated} diupdate`);
        if (importResult.skipped > 0) parts.push(`${importResult.skipped} dilewati`);
        toast.success(parts.join(', '));
        onSuccess?.();
      } else if (importResult.errors.length > 0) {
        toast.error(importResult.errors[0]);
      } else {
        toast.warning(`Semua data dilewati (${importResult.skipped} baris tidak ada perubahan).`);
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
