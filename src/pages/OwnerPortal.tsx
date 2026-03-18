import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { stores as allStores } from '@/data/sampleData';
import { Store as StoreType } from '@/types/pos';
import { toast } from 'sonner';
import {
  Store, Plus, Pencil, Trash2, ShoppingCart, LayoutDashboard,
  MapPin, Phone, LogOut, Building2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function OwnerPortal() {
  const { user, logout, setActiveStoreId } = useAuth();
  const navigate = useNavigate();

  const [storeList, setStoreList] = useState<StoreType[]>([...allStores]);
  const [editStore, setEditStore] = useState<StoreType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StoreType | null>(null);

  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');

  const openCreate = () => {
    setEditStore(null);
    setFormName('');
    setFormAddress('');
    setFormPhone('');
    setIsFormOpen(true);
  };

  const openEdit = (store: StoreType) => {
    setEditStore(store);
    setFormName(store.name);
    setFormAddress(store.address);
    setFormPhone(store.phone);
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) { toast.error('Nama toko wajib diisi'); return; }
    if (editStore) {
      setStoreList(prev => prev.map(s =>
        s.id === editStore.id
          ? { ...s, name: formName, address: formAddress, phone: formPhone, updated_at: new Date() }
          : s
      ));
      toast.success('Toko berhasil diperbarui');
    } else {
      const newId = Math.max(...storeList.map(s => s.id), 0) + 1;
      setStoreList(prev => [...prev, {
        id: newId, name: formName, address: formAddress, phone: formPhone,
        created_at: new Date(), updated_at: new Date(),
      }]);
      toast.success('Toko baru berhasil ditambahkan');
    }
    setIsFormOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setStoreList(prev => prev.filter(s => s.id !== deleteTarget.id));
    toast.success(`Toko "${deleteTarget.name}" dihapus`);
    setDeleteTarget(null);
  };

  const enterStore = (storeId: number, target: 'pos' | 'backoffice') => {
    setActiveStoreId(storeId);
    navigate(target === 'pos' ? '/' : '/backoffice');
  };

  const handleLogout = () => { logout(); navigate('/login'); toast.success('Logout berhasil'); };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Owner Portal</h1>
              <p className="text-xs text-muted-foreground">Selamat datang, {user?.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Toko Anda</h2>
            <p className="text-muted-foreground text-sm">Pilih toko untuk masuk, atau kelola daftar toko.</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Tambah Toko
          </Button>
        </div>

        {/* Store Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {storeList.map((store) => (
            <div key={store.id} className="group relative rounded-2xl border border-border bg-card hover:shadow-lg transition-all duration-200 overflow-hidden">
              {/* Store header accent */}
              <div className="h-1.5 bg-primary" />

              <div className="p-5 space-y-4">
                {/* Store info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Store className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-base">{store.name}</h3>
                      <p className="text-xs text-muted-foreground">ID: #{store.id}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(store)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(store)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {store.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{store.address}</span>
                    </div>
                  )}
                  {store.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{store.phone}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => enterStore(store.id, 'pos')}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 font-medium text-sm transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" /> Kasir
                  </button>
                  <button
                    onClick={() => enterStore(store.id, 'backoffice')}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent/80 font-medium text-sm transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" /> Back Office
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Create / Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editStore ? 'Edit Toko' : 'Tambah Toko Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Toko *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nama toko" />
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="Alamat toko" />
            </div>
            <div className="space-y-2">
              <Label>Telepon</Label>
              <Input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="No. telepon" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
            <Button onClick={handleSave}>
              {editStore ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Toko?</AlertDialogTitle>
            <AlertDialogDescription>
              Toko <strong>"{deleteTarget?.name}"</strong> akan dihapus. Data ini tidak bisa dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
