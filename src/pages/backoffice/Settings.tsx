import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getStoreById, updateStore } from '@/services/storesService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Store } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { activeStoreId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Store data
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');

  // Load store data
  useEffect(() => {
    loadStoreData();
  }, [activeStoreId]);

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
    if (!storeName.trim()) {
      toast.error('Nama toko tidak boleh kosong');
      return;
    }

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
        <p className="text-muted-foreground">Kelola informasi toko Anda</p>
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
    </div>
  );
}
