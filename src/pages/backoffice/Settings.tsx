import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getStoreById, updateStore } from '@/services/storesService';
import {
  getCashDrawerConfig, saveCashDrawerConfig,
  isWebSerialSupported, triggerCashDrawer,
  CashDrawerConfig,
} from '@/services/cashDrawerService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Store, Banknote, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { activeStoreId } = useAuth();
  const [isLoading, setIsLoading]   = useState(true);
  const [isSaving, setIsSaving]     = useState(false);
  const [isTestingDrawer, setIsTestingDrawer] = useState(false);

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

        {/* Browser support warning */}
        {!webSerialSupported && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">Browser tidak mendukung Web Serial API</p>
              <p className="mt-0.5">Fitur ini memerlukan <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong>. Firefox / Safari tidak didukung.</p>
            </div>
          </div>
        )}

        {/* Enable toggle */}
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

            {/* Pin selector */}
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

            {/* Baud rate */}
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

            {/* Info */}
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

            {/* Test button */}
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
    </div>
  );
}
