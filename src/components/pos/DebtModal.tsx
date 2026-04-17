import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomersForStore } from '@/data/sampleData';
import { addShipment } from '@/data/shippingStore';
import { CartItem, Customer, ServiceItem } from '@/types/pos';
import { formatCurrency } from '@/lib/format';
import { X, User, Truck, MapPin, Phone, Check } from 'lucide-react';
import { toast } from 'sonner';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  serviceItems: ServiceItem[];
  total: number;
  storeId: number;
  selectedCustomer: Customer | null;
  onCustomerChange: (c: Customer | null) => void;
  onConfirm: (opts: { shipping?: { recipient_name: string; recipient_phone: string; recipient_address: string; shipping_cost: number; note?: string } }) => void;
}

export function DebtModal({ isOpen, onClose, items, serviceItems, total, storeId, selectedCustomer, onCustomerChange, onConfirm }: DebtModalProps) {
  const { activeStoreId } = useAuth();
  const storeCustomers = useMemo(() => getCustomersForStore(storeId), [storeId]);

  const [customerId, setCustomerId] = useState(selectedCustomer ? String(selectedCustomer.id) : '');
  const [withShipping, setWithShipping] = useState(false);
  const [recipientName, setRecipientName] = useState(selectedCustomer?.name || '');
  const [recipientPhone, setRecipientPhone] = useState(selectedCustomer?.phone || '');
  const [recipientAddress, setRecipientAddress] = useState(selectedCustomer?.address || '');
  const [shippingCost, setShippingCost] = useState('');
  const [shipNote, setShipNote] = useState('');

  useEffect(() => {
    if (selectedCustomer) {
      setCustomerId(String(selectedCustomer.id));
      setRecipientName(selectedCustomer.name);
      setRecipientPhone(selectedCustomer.phone);
      setRecipientAddress(selectedCustomer.address || '');
    }
  }, [selectedCustomer]);

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const c = storeCustomers.find(x => x.id === Number(id)) || null;
    onCustomerChange(c);
    if (c) {
      setRecipientName(c.name);
      setRecipientPhone(c.phone);
      setRecipientAddress(c.address || '');
    }
  };

  const handleSubmit = () => {
    if (!customerId) { toast.error('Pelanggan wajib dipilih untuk transaksi utang'); return; }
    if (withShipping) {
      if (!recipientName || !recipientPhone || !recipientAddress) {
        toast.error('Lengkapi data pengiriman (nama, telepon, alamat)'); return;
      }
      const itemsDesc = items.map(i => `${i.product.name} x${i.quantity}`).join(', ');
      addShipment({
        id: Date.now(), store_id: activeStoreId, sale_id: null,
        invoice_number: `SHP-${Date.now().toString().slice(-6)}`,
        customer_id: Number(customerId), recipient_name: recipientName, recipient_phone: recipientPhone,
        recipient_address: recipientAddress, items_description: itemsDesc, note: shipNote || undefined,
        shipping_cost: parseFloat(shippingCost) || 0, status: 'pending',
        created_at: new Date(), updated_at: new Date(),
      });
      onConfirm({
        shipping: {
          recipient_name: recipientName, recipient_phone: recipientPhone,
          recipient_address: recipientAddress, shipping_cost: parseFloat(shippingCost) || 0,
          note: shipNote || undefined,
        },
      });
    } else {
      onConfirm({});
    }
  };

  if (!isOpen) return null;

  const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-[13px] focus:border-primary focus:outline-none";
  const labelCls = "block text-[13px] font-medium text-foreground mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(10, 37, 64, 0.35)' }}>
      <div className="bg-white rounded-[14px] border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-medium text-foreground">Simpan Utang</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Total summary */}
          <div className="bg-surface rounded-xl p-3 flex justify-between items-center">
            <span className="text-[13px] text-muted-foreground">Total Utang</span>
            <span className="text-[16px] font-medium text-foreground tabular-nums">{formatCurrency(total)}</span>
          </div>

          {/* Customer (required) */}
          <div>
            <label className={labelCls}>
              <User className="w-3.5 h-3.5 inline mr-1" />Pilih Pelanggan <span className="text-destructive">*</span>
            </label>
            <select value={customerId} onChange={e => handleCustomerChange(e.target.value)} className={inputCls}>
              <option value="">-- Pilih pelanggan --</option>
              {storeCustomers.map(c => (
                <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
              ))}
            </select>
            {!customerId && (
              <p className="text-[11px] text-muted-foreground mt-1">Transaksi utang wajib memilih pelanggan</p>
            )}
          </div>

          {/* Shipping toggle */}
          <div className="border border-border rounded-xl p-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={withShipping}
                onChange={e => setWithShipping(e.target.checked)}
                className="w-3.5 h-3.5 rounded border accent-primary"
              />
              <Truck className="w-3.5 h-3.5 text-primary" />
              <span className="text-[13px] font-medium text-foreground">Kirim barang ini</span>
              <span className="text-[11px] text-muted-foreground">(opsional)</span>
            </label>

            {withShipping && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nama Penerima *</label>
                    <input value={recipientName} onChange={e => setRecipientName(e.target.value)} className={inputCls} placeholder="Nama penerima" />
                  </div>
                  <div>
                    <label className={labelCls}><Phone className="w-3.5 h-3.5 inline mr-1" />Telepon *</label>
                    <input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} className={inputCls} placeholder="08xxxxxxxxxx" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}><MapPin className="w-3.5 h-3.5 inline mr-1" />Alamat Pengiriman *</label>
                  <textarea value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Alamat lengkap tujuan" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Ongkir (Rp)</label>
                    <input type="number" value={shippingCost} onChange={e => setShippingCost(e.target.value)} className={inputCls} placeholder="0" />
                  </div>
                  <div>
                    <label className={labelCls}>Catatan</label>
                    <input value={shipNote} onChange={e => setShipNote(e.target.value)} className={inputCls} placeholder="Catatan opsional" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-foreground font-medium text-[13px] hover:bg-accent transition-colors">
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={!customerId}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-[13px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check className="w-3.5 h-3.5" /> Konfirmasi Simpan Utang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
