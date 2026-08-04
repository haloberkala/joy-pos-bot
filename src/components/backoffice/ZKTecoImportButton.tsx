import { useRef, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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

    if (!/\.dat$/i.test(file.name)) {
      toast.error('Format tidak didukung. Gunakan file attlog.dat dari mesin absensi.');
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
      <Button
        onClick={() => !isLoading && inputRef.current?.click()}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Memproses...
          </>
        ) : (
          <>
            <FileUp className="w-4 h-4 mr-2" />
            Import Absensi
          </>
        )}
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept=".dat"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload file attlog.dat absensi"
      />
    </>
  );
}
