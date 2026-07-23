import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getStoreById, updateStore } from '@/services/storesService';
import {
  getCashDrawerConfig, saveCashDrawerConfig,
  isWebSerialSupported, triggerCashDrawer,
  CashDrawerConfig,
} from '@/services/cashDrawerService';
import { exportFullDatabase } from '@/services/backupService';
import { importFullDatabase } from '@/services/restoreService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Store, Banknote, Zap, AlertTriangle, CheckCircle2,
  Download, Upload, HardDrive, Loader2, ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { activeStoreId, user } = useAuth();
  const [isLoading, setIsLoading]         = useState(true);
  const [isSaving, setIsSaving]           = useState(false);
  const [isTestingDrawer, setIsTestingDrawer] = useState(false);

  // Backup / Restore state
  const [isExporting, setIsExporting]     = useState(false);
  const [isImporting, setIsImporting]     = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<{ step: string; pct: number } | null>(null);

  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store data
  const [storeName,    setStoreName]    = useState('');
  const [storeAddress, setStoreAddress] = useState('');

  // Cash drawer config
  const [drawerConfig, setDrawerConfig] = useState<CashDrawerConfig>(getCashDrawerConfig());
  const webSerialSupported = isWebSerialSupported();

  useEffect(() => { loadStoreData(); }, [activeStoreId]);

  const loadStoreData = async () => {
    try {
      setIsLoading(true);
      const store = await getStoreById(activeStoreId);
      if (store) {
        setStoreName(store.name);
        setStoreAddress(store.address || '');
      }
    } catch (error) {
      console.error('Error loading store data:', error);
      toast.error('Gagal memuat data toko');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!storeName.trim()) { toast.error('Nama toko tidak boleh kosong'); return; }
    try {
      setIsSaving(true);
      await updateStore(activeStoreId, {
        name: storeName.trim(),
        address: storeAddress.trim() || null,
      });
      toast.success('Pengaturan toko berhasil disimpan');
    } catch (error) {
      console.error('Error saving store settings:', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrawerConfigChange = (patch: Partial<CashDrawerConfig>) => {
    const updated = { ...drawerConfig, ...patch };
    setDrawerConfig(updated);
    saveCashDrawerConfig(updated);
  };

  const handleTestDrawer = async () => {
    if (!webSerialSupported) {
      toast.error('Browser tidak mendukung Web Serial API. Gunakan Chrome / Edge.');
      return;
    }
    setIsTestingDrawer(true);
    toast.info('Pilih port printer di dialog browser...');
    const ok = await triggerCashDrawer(drawerConfig.pin, drawerConfig.baudRate);
    setIsTestingDrawer(false);
    if (ok) {
      toast.success('✅ Perintah terkirim! Laci kasir seharusnya terbuka.');
    } else {
      toast.error('Gagal mengirim perintah. Pastikan printer terhubung via USB.');
    }
  };

  // ── Backup Handlers ────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      setIsExporting(true);
      toast.info('Menyiapkan export data, harap tunggu...');
      await exportFullDatabase(activeStoreId, storeName || 'Toko');
      toast.success('✅ Export berhasil! File Excel telah diunduh.');
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error(`Gagal export: ${err.message ?? 'Error tidak diketahui'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';
    setPendingRestoreFile(file);
    setShowRestoreDialog(true);
  };

  const handleRestoreConfirm = async () => {
    if (!pendingRestoreFile) return;
    setShowRestoreDialog(false);
    try {
      setIsImporting(true);
      setRestoreProgress({ step: 'Memulai proses restore...', pct: 0 });

      const { warnings } = await importFullDatabase(pendingRestoreFile, (step, current, total) => {
        setRestoreProgress({ step, pct: Math.round((current / total) * 100) });
      });

      setRestoreProgress({ step: 'Selesai!', pct: 100 });

      if (warnings.length > 0) {
        console.warn('Restore warnings:', warnings);
        toast.warning(
          `Restore selesai dengan ${warnings.length} peringatan. Cek konsol untuk detail.`,
          { duration: 8000 },
        );
      } else {
        toast.success('✅ Data berhasil dipulihkan dari backup!');
      }
    } catch (err: any) {
      console.error('Restore error:', err);
      toast.error(`Gagal restore: ${err.message ?? 'Error tidak diketahui'}`, { duration: 10000 });
    } finally {
      setIsImporting(false);
      setPendingRestoreFile(null);
      setTimeout(() => setRestoreProgress(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pengaturan</h1>
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pengaturan</h1>
        <p className="text-muted-foreground">Kelola informasi toko dan perangkat keras</p>
      </div>

      {/* ── Store Settings ── */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Store className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Informasi Toko</h2>
            <p className="text-sm text-muted-foreground">Detail toko Anda</p>
          </div>
        </div>
        <Separator />
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="storeName">Nama Toko *</Label>
            <Input
              id="storeName"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Masukkan nama toko"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="storeAddress">Alamat</Label>
            <Input
              id="storeAddress"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              placeholder="Masukkan alamat toko"
            />
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </div>

      {/* ── Cash Drawer Settings ── */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100">
            <Banknote className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Laci Kasir (Cash Drawer)</h2>
            <p className="text-sm text-muted-foreground">
              Buka laci otomatis saat transaksi tunai selesai via ESC/POS
            </p>
          </div>
        </div>
        <Separator />

        {!webSerialSupported && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">Browser tidak mendukung Web Serial API</p>
              <p className="mt-0.5">Fitur ini memerlukan <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong>. Firefox / Safari tidak didukung.</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Aktifkan Laci Kasir</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kirim perintah ESC/POS ke printer saat pembayaran Tunai / QRIS
            </p>
          </div>
          <Switch
            id="drawer-enabled"
            checked={drawerConfig.enabled}
            onCheckedChange={(v) => handleDrawerConfigChange({ enabled: v })}
            disabled={!webSerialSupported}
          />
        </div>

        {drawerConfig.enabled && webSerialSupported && (
          <>
            <Separator />
            <div className="grid gap-2">
              <Label className="text-sm">Pin Kabel RJ-11</Label>
              <div className="flex gap-3">
                {(['pin2', 'pin5'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => handleDrawerConfigChange({ pin: p })}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      drawerConfig.pin === p
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {p === 'pin2' ? 'Pin 2 (standar)' : 'Pin 5 (alternatif)'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Sebagian besar printer thermal menggunakan <strong>Pin 2</strong>. Coba Pin 5 jika laci tidak terbuka.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="baudRate" className="text-sm">Baud Rate</Label>
              <select
                id="baudRate"
                value={drawerConfig.baudRate}
                onChange={(e) => handleDrawerConfigChange({ baudRate: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none focus:border-primary"
              >
                {[9600, 19200, 38400, 115200].map((r) => (
                  <option key={r} value={r}>{r} bps{r === 9600 ? ' (default)' : ''}</option>
                ))}
              </select>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <p className="font-semibold mb-1">Cara setup pertama kali:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Hubungkan printer thermal ke PC via USB</li>
                  <li>Sambungkan laci kasir ke printer via kabel RJ-11</li>
                  <li>Klik tombol "Test Buka Laci" di bawah</li>
                  <li>Pilih port printer di dialog browser (sekali saja)</li>
                  <li>Laci akan otomatis terbuka saat transaksi tunai selesai</li>
                </ol>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleTestDrawer}
              disabled={isTestingDrawer}
            >
              <Zap className="w-4 h-4 text-orange-500" />
              {isTestingDrawer ? 'Mengirim perintah...' : 'Test Buka Laci Sekarang'}
            </Button>
          </>
        )}
      </div>

      {/* ── Backup & Restore Card (Owner Only) ── */}
      {user?.role === 'owner' && (
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100">
              <HardDrive className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Manajemen Data & Backup</h2>
              <p className="text-sm text-muted-foreground">
                Export seluruh data ke Excel atau pulihkan data dari file backup sebelumnya.
              </p>
            </div>
          </div>
          <Separator />

          {/* Progress bar during restore */}
          {restoreProgress && (
            <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between text-xs text-blue-800 font-medium">
                <span>{restoreProgress.step}</span>
                <span>{restoreProgress.pct}%</span>
              </div>
              <Progress value={restoreProgress.pct} className="h-2" />
            </div>
          )}

          <div className="grid gap-3">
            {/* Export Button */}
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-2">
              <div className="flex items-start gap-2">
                <Download className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Export Semua Data</p>
                  <p className="text-xs text-muted-foreground">
                    Unduh database lengkap (produk, transaksi, SDM, dll) menjadi satu file Excel multi-sheet untuk arsip.
                  </p>
                </div>
              </div>
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={handleExport}
                disabled={isExporting || isImporting}
              >
                {isExporting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengekspor Data...</>
                  : <><Download className="w-4 h-4" /> Export Semua Data</>
                }
              </Button>
            </div>

            {/* Restore Button */}
            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Restore Data dari Excel</p>
                  <p className="text-xs text-muted-foreground">
                    Pulihkan data dari file backup. <strong className="text-destructive">Hati-hati:</strong> data yang ada bisa tertimpa dan hilang selamanya.
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                className="w-full gap-2"
                variant="destructive"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting || isExporting}
              >
                {isImporting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Memulihkan Data...</>
                  : <><Upload className="w-4 h-4" /> Restore Data dari Excel</>
                }
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog: Konfirmasi Restore ── */}
      <Dialog open={showRestoreDialog} onOpenChange={(open) => {
        if (!open) { setShowRestoreDialog(false); setPendingRestoreFile(null); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              AWAS! Konfirmasi Pemulihan Data
            </DialogTitle>
            <DialogDescription className="text-left pt-2">
              <span className="inline-flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                <span>
                  <strong>BAHAYA:</strong> Mengembalikan data dari file Excel akan{' '}
                  <strong>MENIMPA sistem saat ini secara paksa</strong>. Jika ada
                  transaksi atau data baru yang masuk setelah file Excel ini dibuat,
                  data baru tersebut berisiko hilang atau tertimpa. Pastikan Anda
                  sangat yakin!
                </span>
              </span>
              {pendingRestoreFile && (
                <span className="block mt-3 text-xs text-muted-foreground">
                  File dipilih: <strong>{pendingRestoreFile.name}</strong>{' '}
                  ({(pendingRestoreFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => { setShowRestoreDialog(false); setPendingRestoreFile(null); }}
            >
              Batal
            </Button>
            <Button variant="destructive" className="gap-2" onClick={handleRestoreConfirm}>
              <Upload className="w-4 h-4" />
              Ya, Saya Yakin Timpa Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
