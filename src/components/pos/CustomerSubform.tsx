import { useMemo, useState } from 'react';
import { Customer } from '@/types/pos';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Search, User, UserPlus, Edit2, X, Check } from 'lucide-react';
import { addCustomer, updateCustomer, findCustomerByPhone, getCustomersForStore } from '@/data/sampleData';
import { toast } from 'sonner';

type View = 'select' | 'add' | 'edit';

interface Props {
  storeId: number;
  selectedCustomer: Customer | null;
  onCustomerChange: (c: Customer | null) => void;
  required?: boolean;
}

/**
 * Shared customer picker subform used inside PaymentModal & DebtModal.
 * Keeps look-and-feel consistent across all flows.
 */
export function CustomerSubform({ storeId, selectedCustomer, onCustomerChange, required }: Props) {
  const [view, setView] = useState<View>('select');
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [editing, setEditing] = useState<Customer | null>(null);

  const list = useMemo(() => getCustomersForStore(storeId), [storeId]);
  const filtered = useMemo(() => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(c => c.phone.includes(search) || c.name.toLowerCase().includes(q));
  }, [list, search]);

  const reset = () => { setName(''); setPhone(''); setAddress(''); setEditing(null); };

  const handleAdd = () => {
    if (!name.trim() || !phone.trim()) { toast.error('Nama dan telepon wajib diisi'); return; }
    if (findCustomerByPhone(phone, storeId)) { toast.error('Nomor telepon sudah terdaftar'); return; }
    const c: Customer = { id: Date.now(), store_id: storeId, name: name.trim(), phone: phone.trim(), address: address.trim() || undefined, created_at: new Date(), updated_at: new Date() };
    addCustomer(c);
    onCustomerChange(c);
    toast.success(`Pelanggan ${c.name} ditambahkan`);
    reset(); setView('select');
  };

  const handleEdit = () => {
    if (!editing || !name.trim() || !phone.trim()) { toast.error('Nama dan telepon wajib diisi'); return; }
    updateCustomer(editing.id, { name: name.trim(), phone: phone.trim(), address: address.trim() || undefined });
    const upd = { ...editing, name: name.trim(), phone: phone.trim(), address: address.trim() || undefined };
    if (selectedCustomer?.id === editing.id) onCustomerChange(upd);
    toast.success('Data pelanggan diperbarui');
    reset(); setView('select');
  };

  const startEdit = (c: Customer) => { setEditing(c); setName(c.name); setPhone(c.phone); setAddress(c.address || ''); setView('edit'); };
  const startAdd = () => { reset(); if (search && /^\d+$/.test(search)) setPhone(search); setView('add'); };

  return (
    <div className="border border-border rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-caption">PELANGGAN {required && <span className="text-destructive">*</span>}</span>
        {view !== 'select' && (
          <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => { reset(); setView('select'); }}>← Kembali</Button>
        )}
      </div>

      {view === 'select' && (
        <>
          {selectedCustomer && (
            <div className="flex items-center justify-between bg-primary-light rounded-lg p-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-3 h-3 text-primary" /></div>
                <div><p className="font-medium text-[12px]">{selectedCustomer.name}</p><p className="text-[10px] text-muted-foreground">{selectedCustomer.phone}</p></div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onCustomerChange(null)} className="h-6 text-[10px] px-2"><X className="w-3 h-3" /></Button>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Cari nama / telepon..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-[12px] rounded-lg" />
          </div>
          <div className="max-h-28 overflow-y-auto space-y-0.5">
            {filtered.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface group">
                <button onClick={() => { onCustomerChange(c); setSearch(''); }} className="flex items-center gap-2 flex-1 text-left">
                  <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center"><User className="w-3 h-3 text-muted-foreground" /></div>
                  <div><p className="font-medium text-[12px]">{c.name}</p><p className="text-[10px] text-muted-foreground">{c.phone}</p></div>
                </button>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); startEdit(c); }}>
                  <Edit2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {!required && !selectedCustomer && (
              <span className="text-[11px] text-muted-foreground self-center flex-1">Lewati jika umum</span>
            )}
            <Button variant="outline" size="sm" onClick={startAdd} className="h-7 text-[11px] gap-1 ml-auto"><UserPlus className="w-3 h-3" /> Tambah</Button>
          </div>
        </>
      )}

      {(view === 'add' || view === 'edit') && (
        <div className="space-y-2">
          <div><Label className="text-[11px]">Nama *</Label><Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-[12px] rounded-lg" /></div>
          <div><Label className="text-[11px]">Telepon *</Label><Input value={phone} onChange={e => setPhone(e.target.value)} className="h-8 text-[12px] rounded-lg" /></div>
          <div><Label className="text-[11px]">Alamat</Label><Textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} className="text-[12px] rounded-lg resize-none" /></div>
          <Button size="sm" onClick={view === 'add' ? handleAdd : handleEdit} className="w-full h-7 text-[11px] gap-1">
            <Check className="w-3 h-3" /> {view === 'add' ? 'Tambah Pelanggan' : 'Simpan'}
          </Button>
        </div>
      )}
    </div>
  );
}
