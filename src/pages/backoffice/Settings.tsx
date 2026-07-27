import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getStoreById, updateStore } from '@/services/storesService';
import { exportFullDatabase } from '@/services/backupService';
import { importFullDatabase } from '@/services/restoreService';
import { printer, PrinterError, isWebUSBSupported } from '@/lib/printer';
import type { PrinterInfo } from '@/lib/printer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Store, AlertTriangle, Download, Upload, HardDrive,
  Loader2, ShieldAlert, Printer, Zap, Wifi, WifiOff,
  RefreshCw, CheckCircle2, PlugZap,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { activeStoreId, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving]   = useState(false);

  // Printer state
  const [printerInfo, setPrinterInfo]   = useState<PrinterInfo>(printer.getInfo());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting]       = useState(false);
  const serialSupported = isWebUSBSupported();

  // Backup / Restore state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<{ step: string; pct: number } | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store data
  const [storeName,    setStoreName]    = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone,   setStorePhone]   = useState('');

  // Printer status config
  const [paperWidth, setPaperWidth]   = useState<58 | 80>(printer.getPaperWidth());
  const [drawerPin, setDrawerPin]     = useState(printer.getConfig().drawerPin);
  const [baudRate, setBaudRate]       = useState(printer.getConfig().baudRate);

  useEffect(() => { loadStoreData(); }, [activeStoreId]);

  // Subscribe ke perubahan status printer
  useEffect(() => {
    const unsub = printer.onStatusChange((info) => {
      setPrinterInfo(info);
      setPaperWidth(info.paperWidth);
    });
    return unsub;
  }, []);

  const loadStoreData = async () => {
    try {
      setIsLoading(true);
      const store = await getStoreById(activeStoreId);
      if (store) {
        setStoreName(store.name);
        setStoreAddress(store.address || '');
        setStorePhone(store.phone || '');
      }
    } catch (err) {
      console.error('Error loading store data:', err);
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
        phone: storePhone.trim() || null,
      });
      toast.success('Pengaturan toko berhasil disimpan');
    } catch (err) {
      console.error('Error saving store settings:', err);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Printer Handlers ─────────────────────────────────────────────────────────

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const ok = await printer.connect();
      if (ok) toast.success('Printer terhubung');
      // jika cancel (ok=false) tidak perlu toast
    } finally {
      setIsConnecting(false);
    }
  };

  const handleReconnect = async () => {
    setIsConnecting(true);
    try {
      const ok = await printer.reconnect();
      if (ok) toast.success('Printer terhubung kembali');
      else toast.warning('Tidak ada printer tersimpan. Klik "Hubungkan Printer".');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await printer.disconnect();
    toast.info('Printer diputus.');
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    try {
      await printer.testPrint();
      toast.success('Test print berhasil dikirim');
    } catch (err) {
      if (err instanceof PrinterError) {
        toast.error(err.message);
      } else {
        toast.error('Gagal mengirim test print');
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleOpenDrawer = async () => {
    setIsTesting(true);
    try {
      await printer.openCashDrawer();
      toast.success('Perintah terkirim! Laci kasir seharusnya terbuka.');
    } catch (err) {
      if (err instanceof PrinterError) {
        toast.error(err.message);
      } else {
        toast.error('Gagal membuka laci kasir');
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handlePaperWidthChange = (w: 58 | 80) => {
    setPaperWidth(w);
    printer.setPaperWidth(w);
  };

  const handleDrawerPinChange = (p: 'pin2' | 'pin5') => {
    setDrawerPin(p);
    printer.setDrawerPin(p);
  };

  const handleBaudRateChange = (r: number) => {
    setBaudRate(r);
    printer.setBaudRate(r);
  };

  // ── Backup Handlers ──────────────────────────────────────────────────────────

  const handleExport = async () => {
    try {
      setIsExporting(true);
      toast.info('Menyiapkan export data, harap tunggu...');
      await exportFullDatabase(activeStoreId, storeName || 'Toko');
      toast.success('Export berhasil! File Excel telah diunduh.');
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
        toast.warning(`Restore selesai dengan ${warnings.length} peringatan.`, { duration: 8000 });
      } else {
        toast.success('Data berhasil dipulihkan dari backup!');
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

  const isConnected = printerInfo.status === 'connected';

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
            <p className="text-sm text-muted-foreground">Nama dan alamat ditampilkan di struk</p>
          </div>
        </div>
        <Separator />
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="storeName">Nama Toko *</Label>
            <Input id="storeName" value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Masukkan nama toko" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="storeAddress">Alamat</Label>
            <Input id="storeAddress" value={storeAddress} onChange={e => setStoreAddress(e.target.value)} placeholder="Masukkan alamat toko" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="storePhone">Nomor Telepon</Label>
            <Input id="storePhone" value={storePhone} onChange={e => setStorePhone(e.target.value)} placeholder="Masukkan nomor telepon" />
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </div>

      {/* ── Printer Card ── */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <Printer className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Printer Thermal</h2>
            <p className="text-sm text-muted-foreground">Koneksi via WebUSB API</p>
          </div>
        </div>
        <Separator />

        {/* API support warning */}
        {!serialSupported && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">Browser tidak mendukung WebUSB API</p>
              <p className="mt-0.5">Gunakan <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong>. Firefox dan Safari tidak didukung.</p>
            </div>
          </div>
        )}

        {/* Status rows */}
        <div className="rounded-lg border border-border divide-y divide-border text-sm">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2">
              {isConnected
                ? <Wifi className="w-4 h-4 text-emerald-500" />
                : <WifiOff className="w-4 h-4 text-muted-foreground" />}
              <span className="font-medium">Status</span>
            </div>
            <span className={isConnected ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}>
              {printerInfo.status === 'connecting'
                ? '🔄 Menghubungkan...'
                : isConnected ? '🟢 Terhubung' : '🔴 Tidak Terhubung'}
            </span>
          </div>

          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-muted-foreground">Printer</span>
            <span className="font-medium">{printerInfo.portName ?? '—'}</span>
          </div>

          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-muted-foreground">Transport</span>
            <span className="font-medium text-blue-600">WebUSB</span>
          </div>
        </div>

        {/* Paper Width */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Lebar Kertas</Label>
          <div className="grid grid-cols-2 gap-2">
            {([80, 58] as const).map(w => (
              <button
                key={w}
                onClick={() => handlePaperWidthChange(w)}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  paperWidth === w
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                }`}
              >
                {paperWidth === w && <CheckCircle2 className="w-3.5 h-3.5" />}
                {w}mm
              </button>
            ))}
          </div>
        </div>

        {/* Drawer Pin */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Pin Laci Kasir (RJ-11)</Label>
          <div className="grid grid-cols-2 gap-2">
            {(['pin2', 'pin5'] as const).map(p => (
              <button
                key={p}
                onClick={() => handleDrawerPinChange(p)}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  drawerPin === p
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                }`}
              >
                {drawerPin === p && <CheckCircle2 className="w-3.5 h-3.5" />}
                {p === 'pin2' ? 'Pin 2 (default)' : 'Pin 5 (alt)'}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Sebagian besar printer menggunakan Pin 2. Coba Pin 5 jika laci tidak terbuka.</p>
        </div>

        {/* Baud Rate */}
        <div className="space-y-2">
          <Label htmlFor="baudRate" className="text-sm font-medium">Baud Rate</Label>
          <select
            id="baudRate"
            value={baudRate}
            onChange={e => handleBaudRateChange(Number(e.target.value))}
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary"
          >
            {[9600, 19200, 38400, 115200].map(r => (
              <option key={r} value={r}>{r} bps{r === 9600 ? ' (default)' : ''}</option>
            ))}
          </select>
        </div>

        {/* Setup guide */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-800 space-y-0.5">
            <p className="font-semibold">Setup pertama kali:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Hubungkan printer thermal ke PC via USB</li>
              <li>Sambungkan laci kasir ke printer via kabel RJ-11</li>
              <li>Klik <strong>Hubungkan Printer</strong>, pilih port di dialog browser</li>
              <li>Klik <strong>Test Print</strong> untuk verifikasi</li>
            </ol>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {/* Connect / Disconnect */}
          {!isConnected ? (
            <Button
              className="col-span-2 gap-2"
              onClick={handleConnect}
              disabled={isConnecting || !serialSupported}
            >
              {isConnecting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Menghubungkan...</>
                : <><PlugZap className="w-4 h-4" /> Hubungkan Printer</>
              }
            </Button>
          ) : (
            <Button
              variant="outline"
              className="col-span-2 gap-2"
              onClick={handleDisconnect}
            >
              <WifiOff className="w-4 h-4" /> Putuskan Koneksi
            </Button>
          )}

          {/* Reconnect */}
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleReconnect}
            disabled={isConnecting || !serialSupported}
          >
            <RefreshCw className="w-4 h-4" /> Reconnect
          </Button>

          {/* Test Print */}
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleTestPrint}
            disabled={isTesting || !isConnected}
          >
            {isTesting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</>
              : <><Printer className="w-4 h-4" /> Test Print</>
            }
          </Button>

          {/* Open Cash Drawer */}
          <Button
            variant="outline"
            className="col-span-2 gap-2"
            onClick={handleOpenDrawer}
            disabled={isTesting || !isConnected}
          >
            <Zap className="w-4 h-4 text-orange-500" /> Buka Laci Kasir
          </Button>
        </div>
      </div>

      {/* ── Backup & Restore (Owner Only) ── */}
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
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-2">
              <div className="flex items-start gap-2">
                <Download className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Export Semua Data</p>
                  <p className="text-xs text-muted-foreground">Unduh database ke file Excel multi-sheet.</p>
                </div>
              </div>
              <Button className="w-full gap-2" variant="outline" onClick={handleExport} disabled={isExporting || isImporting}>
                {isExporting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengekspor Data...</>
                  : <><Download className="w-4 h-4" /> Export Semua Data</>
                }
              </Button>
            </div>

            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Restore Data dari Excel</p>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-destructive">Hati-hati:</strong> data yang ada bisa tertimpa dan hilang selamanya.
                  </p>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileSelect} />
              <Button className="w-full gap-2" variant="destructive" onClick={() => fileInputRef.current?.click()} disabled={isImporting || isExporting}>
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
      <Dialog open={showRestoreDialog} onOpenChange={open => { if (!open) { setShowRestoreDialog(false); setPendingRestoreFile(null); } }}>
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
                  <strong>BAHAYA:</strong> Data akan <strong>DITIMPA secara paksa</strong>.
                  Transaksi baru setelah file ini dibuat berisiko hilang.
                </span>
              </span>
              {pendingRestoreFile && (
                <span className="block mt-3 text-xs text-muted-foreground">
                  File: <strong>{pendingRestoreFile.name}</strong>{' '}
                  ({(pendingRestoreFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setShowRestoreDialog(false); setPendingRestoreFile(null); }}>Batal</Button>
            <Button variant="destructive" className="gap-2" onClick={handleRestoreConfirm}>
              <Upload className="w-4 h-4" /> Ya, Timpa Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
