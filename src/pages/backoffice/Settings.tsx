import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Store, Bell, Printer, Shield } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pengaturan</h1>
        <p className="text-muted-foreground">Kelola pengaturan aplikasi POS Anda</p>
      </div>

      {/* Store Settings */}
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
            <Label htmlFor="storeName">Nama Toko</Label>
            <Input id="storeName" defaultValue="Toko POS" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="storeAddress">Alamat</Label>
            <Input id="storeAddress" defaultValue="Jl. Contoh No. 123" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="storePhone">Telepon</Label>
            <Input id="storePhone" defaultValue="021-12345678" />
          </div>
        </div>
        <Button>Simpan Perubahan</Button>
      </div>

      {/* Notification Settings */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Notifikasi</h2>
            <p className="text-sm text-muted-foreground">Pengaturan notifikasi</p>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notifikasi Stok Menipis</p>
              <p className="text-sm text-muted-foreground">
                Dapatkan notifikasi saat stok produk menipis
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notifikasi Transaksi</p>
              <p className="text-sm text-muted-foreground">
                Dapatkan notifikasi untuk setiap transaksi baru
              </p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Laporan Harian</p>
              <p className="text-sm text-muted-foreground">
                Terima ringkasan laporan penjualan harian
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>

      {/* Printer Settings */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100">
            <Printer className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Printer</h2>
            <p className="text-sm text-muted-foreground">Pengaturan printer struk</p>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Cetak Otomatis</p>
              <p className="text-sm text-muted-foreground">
                Otomatis cetak struk setelah transaksi
              </p>
            </div>
            <Switch />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="printerName">Nama Printer</Label>
            <Input id="printerName" placeholder="Pilih printer..." />
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100">
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Keamanan</h2>
            <p className="text-sm text-muted-foreground">Pengaturan keamanan akun</p>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <Button variant="outline">Ubah Password</Button>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Autentikasi 2 Faktor</p>
              <p className="text-sm text-muted-foreground">
                Tambahkan lapisan keamanan ekstra
              </p>
            </div>
            <Switch />
          </div>
        </div>
      </div>
    </div>
  );
}
