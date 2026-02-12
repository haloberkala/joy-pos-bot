import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Customer } from '@/types/pos';
import { getCustomersForStore, addCustomer, updateCustomer, findCustomerByPhone } from '@/data/sampleData';
import { Search, UserPlus, Edit2, Check, Phone, User, MapPin, X } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: number;
  onSelectCustomer: (customer: Customer | null) => void;
  selectedCustomer: Customer | null;
}

type ModalView = 'search' | 'add' | 'edit';

export function CustomerModal({
  isOpen,
  onClose,
  storeId,
  onSelectCustomer,
  selectedCustomer,
}: CustomerModalProps) {
  const [view, setView] = useState<ModalView>('search');
  const [searchPhone, setSearchPhone] = useState('');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const storeCustomers = useMemo(() => getCustomersForStore(storeId), [storeId]);

  const filteredCustomers = useMemo(() => {
    if (!searchPhone) return storeCustomers;
    return storeCustomers.filter(
      c => c.phone.includes(searchPhone) || c.name.toLowerCase().includes(searchPhone.toLowerCase())
    );
  }, [storeCustomers, searchPhone]);

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormAddress('');
    setEditingCustomer(null);
  };

  const handleAdd = () => {
    if (!formName.trim() || !formPhone.trim()) {
      toast.error('Nama dan nomor telepon wajib diisi');
      return;
    }
    const existing = findCustomerByPhone(formPhone, storeId);
    if (existing) {
      toast.error('Nomor telepon sudah terdaftar');
      return;
    }
    const newCustomer: Customer = {
      id: Date.now(),
      store_id: storeId,
      name: formName.trim(),
      phone: formPhone.trim(),
      address: formAddress.trim() || undefined,
      created_at: new Date(),
      updated_at: new Date(),
    };
    addCustomer(newCustomer);
    onSelectCustomer(newCustomer);
    toast.success(`Pelanggan ${newCustomer.name} berhasil ditambahkan`);
    resetForm();
    setView('search');
  };

  const handleEdit = () => {
    if (!editingCustomer || !formName.trim() || !formPhone.trim()) {
      toast.error('Nama dan nomor telepon wajib diisi');
      return;
    }
    updateCustomer(editingCustomer.id, {
      name: formName.trim(),
      phone: formPhone.trim(),
      address: formAddress.trim() || undefined,
    });
    const updated = { ...editingCustomer, name: formName.trim(), phone: formPhone.trim(), address: formAddress.trim() || undefined };
    if (selectedCustomer?.id === editingCustomer.id) {
      onSelectCustomer(updated);
    }
    toast.success(`Data pelanggan berhasil diperbarui`);
    resetForm();
    setView('search');
  };

  const startEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormPhone(customer.phone);
    setFormAddress(customer.address || '');
    setView('edit');
  };

  const startAdd = () => {
    resetForm();
    // Pre-fill phone from search if it looks like a phone number
    if (searchPhone && /^\d+$/.test(searchPhone)) {
      setFormPhone(searchPhone);
    }
    setView('add');
  };

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer);
    onClose();
  };

  const handleSkip = () => {
    onSelectCustomer(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {view === 'search' ? 'Pilih Pelanggan' : view === 'add' ? 'Tambah Pelanggan Baru' : 'Edit Pelanggan'}
          </DialogTitle>
        </DialogHeader>

        {view === 'search' && (
          <div className="space-y-4">
            {/* Currently selected */}
            {selectedCustomer && (
              <div className="flex items-center justify-between bg-[hsl(var(--pos-accent))]/10 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[hsl(var(--pos-accent))]/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-[hsl(var(--pos-accent))]" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{selectedCustomer.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onSelectCustomer(null)} className="text-xs">
                  <X className="w-3 h-3 mr-1" /> Hapus
                </Button>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau nomor telepon..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>

            {/* Customer list */}
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <button
                    onClick={() => handleSelect(customer)}
                    className="flex items-center gap-2.5 flex-1 text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{customer.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {customer.phone}
                      </div>
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); startEdit(customer); }}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {filteredCustomers.length === 0 && searchPhone && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <p>Pelanggan tidak ditemukan</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSkip} className="flex-1 rounded-xl">
                Lewati (Tanpa Pelanggan)
              </Button>
              <Button onClick={startAdd} className="flex-1 rounded-xl gap-2 bg-[hsl(var(--pos-accent))] hover:bg-[hsl(var(--pos-accent-hover))] text-white">
                <UserPlus className="w-4 h-4" />
                Tambah Baru
              </Button>
            </div>
          </div>
        )}

        {(view === 'add' || view === 'edit') && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cust-name">Nama Pelanggan *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="cust-name"
                  placeholder="Nama lengkap"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-phone">Nomor Telepon *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="cust-phone"
                  placeholder="08xxxxxxxxxx"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-address">Alamat (opsional)</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Textarea
                  id="cust-address"
                  placeholder="Alamat pelanggan"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="pl-10 rounded-xl resize-none"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => { resetForm(); setView('search'); }} className="flex-1 rounded-xl">
                Kembali
              </Button>
              <Button
                onClick={view === 'add' ? handleAdd : handleEdit}
                className="flex-1 rounded-xl gap-2 bg-[hsl(var(--pos-accent))] hover:bg-[hsl(var(--pos-accent-hover))] text-white"
              >
                <Check className="w-4 h-4" />
                {view === 'add' ? 'Tambah Pelanggan' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
