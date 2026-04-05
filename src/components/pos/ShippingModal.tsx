import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomersForStore } from '@/data/sampleData';
import { addShipment, handleCustomerSelectForShipping } from '@/data/shippingStore';
import { CartItem, Customer } from '@/types/pos';
import { formatCurrency } from '@/lib/format';
import { X, Truck, User, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';

interface ShippingModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  invoiceNumber?: string;
  saleId?: number;
  customer?: Customer | null;
}

export function ShippingModal({ isOpen, onClose, items, total, invoiceNumber, saleId, customer }: ShippingModalProps) {
  const { activeStoreId } = useAuth();
  const storeCustomers = useMemo(() => getCustomersForStore(activeStoreId), [activeStoreId]);

  const [customerId, setCustomerId] = useState(customer ? String(customer.id) : '');
  const [recipientName, setRecipientName] = useState(customer?.name || '');
  const [recipientPhone, setRecipientPhone] = useState(customer?.phone || '');
  const [recipientAddress, setRecipientAddress] = useState(customer?.address || '');
  const [shippingCost, setShippingCost] = useState('');
  const [note, setNote] = useState('');

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const info = handleCustomerSelectForShipping(Number(id));
    if (info) { setRecipientName(info.name); setRecipientPhone(info.phone); setRecipientAddress(info.address); }
  };

  const handleSubmit = () => {
    if (!recipientName || !recipientPhone || !recipientAddress) { toast.error('Nama, telepon, dan alamat penerima wajib diisi'); return; }
    const itemsDesc = items.map(i => `${i.product.name} x${i.quantity}`).join(', ');
    addShipment({
      id: Date.now(), store_id: activeStoreId, sale_id: saleId || null,
      invoice_number: invoiceNumber || `SHP-${Date.now().toString().slice(-6)}`,
      customer_id: Number(customerId) || 0, recipient_name: recipientName, recipient_phone: recipientPhone,
      recipient_address: recipientAddress, items_description: itemsDesc, note: note || undefined,
      shipping_cost: parseFloat(shippingCost) || 0, status: 'pending', created_at: new Date(), updated_at: new Date(),
    });
    toast.success('Pengiriman berhasil dibuat!'); onClose();
  };

  if (!isOpen) return null;

  const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-[13px] focus:border-primary focus:outline-none";
  const labelCls = "block text-[13px] font-medium text-foreground mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(10, 37, 64, 0.35)' }}>
      <div className="bg-white rounded-[14px] border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            <h2 className="text-[15px] font-medium text-foreground">Buat Pengiriman</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-surface rounded-xl p-3">
            <p className="text-caption mb-1">Barang dikirim:</p>
            <div className="space-y-0.5">
              {items.map(item => (
                <div key={item.product.id} className="flex justify-between text-[13px]">
                  <span className="text-foreground">{item.product.name} x{item.quantity}</span>
                  <span className="font-medium">{formatCurrency(item.price_per_unit * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-2 pt-2 flex justify-between font-medium text-foreground text-[13px]">
              <span>Total Barang</span><span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div>
            <label className={labelCls}><User className="w-3.5 h-3.5 inline mr-1" />Pilih Pelanggan</label>
            <select value={customerId} onChange={e => handleCustomerChange(e.target.value)} className={inputCls}>
              <option value="">-- Pilih pelanggan --</option>
              {storeCustomers.map(c => (<option key={c.id} value={c.id}>{c.name} - {c.phone}</option>))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Nama Penerima *</label><input value={recipientName} onChange={e => setRecipientName(e.target.value)} className={inputCls} placeholder="Nama penerima" /></div>
            <div><label className={labelCls}><Phone className="w-3.5 h-3.5 inline mr-1" />Telepon *</label><input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} className={inputCls} placeholder="08xxxxxxxxxx" /></div>
          </div>

          <div>
            <label className={labelCls}><MapPin className="w-3.5 h-3.5 inline mr-1" />Alamat Pengiriman *</label>
            <textarea value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Alamat lengkap tujuan" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Ongkir (Rp)</label><input type="number" value={shippingCost} onChange={e => setShippingCost(e.target.value)} className={inputCls} placeholder="0" /></div>
            <div><label className={labelCls}>Catatan</label><input value={note} onChange={e => setNote(e.target.value)} className={inputCls} placeholder="Catatan opsional" /></div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-foreground font-medium text-[13px] hover:bg-accent transition-colors">Batal</button>
            <button onClick={handleSubmit} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-[13px] hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              <Truck className="w-3.5 h-3.5" /> Buat Pengiriman
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
