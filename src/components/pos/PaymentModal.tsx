import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaymentMethod, CartItem, Customer } from '@/types/pos';
import { formatCurrency } from '@/lib/format';
import { Check, Wallet, CreditCard, QrCode, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomerSubform } from './CustomerSubform';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  onConfirm: (amountPaid: number) => void;
  storeId: number;
  selectedCustomer: Customer | null;
  onCustomerChange: (customer: Customer | null) => void;
  requireCustomer?: boolean;
}

const quickAmounts = [50000, 100000, 150000, 200000];

type CustomerView = 'select' | 'add' | 'edit';

export function PaymentModal({ isOpen, onClose, items, total, paymentMethod, onConfirm, storeId, selectedCustomer, onCustomerChange, requireCustomer = false }: PaymentModalProps) {
  const [amountPaid, setAmountPaid] = useState<string>(total.toString());
  const change = Math.max(0, Number(amountPaid) - total);

  // Customer state
  const [customerView, setCustomerView] = useState<CustomerView>('select');
  const [searchPhone, setSearchPhone] = useState('');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const storeCustomers = useMemo(() => getCustomersForStore(storeId), [storeId]);
  const filteredCustomers = useMemo(() => {
    if (!searchPhone) return storeCustomers;
    return storeCustomers.filter(c => c.phone.includes(searchPhone) || c.name.toLowerCase().includes(searchPhone.toLowerCase()));
  }, [storeCustomers, searchPhone]);

  const resetForm = () => { setFormName(''); setFormPhone(''); setFormAddress(''); setEditingCustomer(null); };

  const handleAddCustomer = () => {
    if (!formName.trim() || !formPhone.trim()) { toast.error('Nama dan nomor telepon wajib diisi'); return; }
    const existing = findCustomerByPhone(formPhone, storeId);
    if (existing) { toast.error('Nomor telepon sudah terdaftar'); return; }
    const newCustomer: Customer = { id: Date.now(), store_id: storeId, name: formName.trim(), phone: formPhone.trim(), address: formAddress.trim() || undefined, created_at: new Date(), updated_at: new Date() };
    addCustomer(newCustomer);
    onCustomerChange(newCustomer);
    toast.success(`Pelanggan ${newCustomer.name} ditambahkan`);
    resetForm();
    setCustomerView('select');
  };

  const handleEditCustomer = () => {
    if (!editingCustomer || !formName.trim() || !formPhone.trim()) { toast.error('Nama dan nomor telepon wajib diisi'); return; }
    updateCustomer(editingCustomer.id, { name: formName.trim(), phone: formPhone.trim(), address: formAddress.trim() || undefined });
    const updated = { ...editingCustomer, name: formName.trim(), phone: formPhone.trim(), address: formAddress.trim() || undefined };
    if (selectedCustomer?.id === editingCustomer.id) onCustomerChange(updated);
    toast.success('Data pelanggan diperbarui');
    resetForm();
    setCustomerView('select');
  };

  const startEdit = (customer: Customer) => { setEditingCustomer(customer); setFormName(customer.name); setFormPhone(customer.phone); setFormAddress(customer.address || ''); setCustomerView('edit'); };
  const startAdd = () => { resetForm(); if (searchPhone && /^\d+$/.test(searchPhone)) setFormPhone(searchPhone); setCustomerView('add'); };

  const paymentIcon = { cash: <Wallet className="w-4 h-4" />, transfer: <CreditCard className="w-4 h-4" />, qris: <QrCode className="w-4 h-4" /> };
  const paymentLabel = { cash: 'Tunai', transfer: 'Transfer', qris: 'QRIS' };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {paymentIcon[paymentMethod]} Pembayaran {paymentLabel[paymentMethod]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* ===== Customer Section ===== */}
          <div className="border border-border rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-caption">PELANGGAN {requireCustomer && <span className="text-destructive">*</span>}</span>
              {customerView !== 'select' && (
                <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => { resetForm(); setCustomerView('select'); }}>← Kembali</Button>
              )}
            </div>

            {customerView === 'select' && (
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
                  <Input placeholder="Cari nama / telepon..." value={searchPhone} onChange={e => setSearchPhone(e.target.value)} className="pl-8 h-8 text-[12px] rounded-lg" />
                </div>
                <div className="max-h-28 overflow-y-auto space-y-0.5">
                  {filteredCustomers.slice(0, 5).map(customer => (
                    <div key={customer.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface transition-colors group">
                      <button onClick={() => { onCustomerChange(customer); setSearchPhone(''); }} className="flex items-center gap-2 flex-1 text-left">
                        <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center flex-shrink-0"><User className="w-3 h-3 text-muted-foreground" /></div>
                        <div><p className="font-medium text-[12px]">{customer.name}</p><p className="text-[10px] text-muted-foreground">{customer.phone}</p></div>
                      </button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); startEdit(customer); }}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  {!requireCustomer && !selectedCustomer && (
                    <span className="text-[11px] text-muted-foreground self-center flex-1">Lewati jika umum</span>
                  )}
                  <Button variant="outline" size="sm" onClick={startAdd} className="h-7 text-[11px] gap-1 ml-auto"><UserPlus className="w-3 h-3" /> Tambah</Button>
                </div>
              </>
            )}

            {(customerView === 'add' || customerView === 'edit') && (
              <div className="space-y-2">
                <div>
                  <Label className="text-[11px]">Nama *</Label>
                  <Input placeholder="Nama lengkap" value={formName} onChange={e => setFormName(e.target.value)} className="h-8 text-[12px] rounded-lg" />
                </div>
                <div>
                  <Label className="text-[11px]">Telepon *</Label>
                  <Input placeholder="08xxxxxxxxxx" value={formPhone} onChange={e => setFormPhone(e.target.value)} className="h-8 text-[12px] rounded-lg" />
                </div>
                <div>
                  <Label className="text-[11px]">Alamat</Label>
                  <Textarea placeholder="Alamat (opsional)" value={formAddress} onChange={e => setFormAddress(e.target.value)} className="text-[12px] rounded-lg resize-none" rows={2} />
                </div>
                <Button size="sm" onClick={customerView === 'add' ? handleAddCustomer : handleEditCustomer} className="w-full h-7 text-[11px] gap-1">
                  <Check className="w-3 h-3" /> {customerView === 'add' ? 'Tambah Pelanggan' : 'Simpan'}
                </Button>
              </div>
            )}
          </div>

          {/* ===== Items Summary ===== */}
          <div className="bg-surface rounded-xl p-3 space-y-2 max-h-32 overflow-y-auto">
            {items.map((item) => (
              <div key={item.product.id} className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">{item.product.name} x{item.quantity}</span>
                <span className="font-medium text-foreground">{formatCurrency(item.price_per_unit * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center py-2 border-t border-border">
            <span className="text-[13px] font-medium text-foreground">Total</span>
            <span className="text-[18px] font-medium text-primary tabular-nums" style={{ letterSpacing: '-0.3px' }}>{formatCurrency(total)}</span>
          </div>

          {/* ===== Payment Details ===== */}
          {paymentMethod === 'cash' && (
            <>
              <div>
                <label className="text-caption mb-2 block">Jumlah Dibayar</label>
                <div className="relative">
                  <Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)}
                    className="text-right text-[15px] font-medium rounded-lg pr-10" />
                  {amountPaid && amountPaid !== '0' && (
                    <button
                      onClick={() => setAmountPaid('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="Hapus nominal"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amount) => (
                  <Button key={amount} variant="outline" onClick={() => setAmountPaid(amount.toString())}
                    className={cn('text-[11px] rounded-lg', Number(amountPaid) === amount && 'bg-primary text-primary-foreground border-primary')}>
                    {formatCurrency(amount)}
                  </Button>
                ))}
              </div>
              <Button variant="outline" onClick={() => setAmountPaid(total.toString())} className="w-full rounded-lg text-[13px]">Uang Pas</Button>
              <div className="flex justify-between items-center py-3 bg-[hsl(160,72%,27%)]/10 rounded-xl px-4">
                <span className="font-medium text-[hsl(160,72%,27%)] text-[13px]">Kembalian</span>
                <span className="text-[18px] font-medium text-[hsl(160,72%,27%)] tabular-nums">{formatCurrency(change)}</span>
              </div>
            </>
          )}

          {paymentMethod !== 'cash' && (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-[13px]">{paymentMethod === 'qris' ? 'Scan QRIS atau proses pembayaran' : 'Proses pembayaran transfer'}</p>
            </div>
          )}

          <Button onClick={() => onConfirm(Number(amountPaid))}
            disabled={paymentMethod === 'cash' && Number(amountPaid) < total}
            className="w-full h-10 rounded-lg font-medium">
            <Check className="w-4 h-4 mr-2" /> Konfirmasi Pembayaran
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
