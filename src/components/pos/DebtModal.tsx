import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { addShipment } from '@/data/shippingStore';
import { CartItem, Customer, ServiceItem } from '@/types/pos';
import { formatCurrency } from '@/lib/format';
import { X, Truck, MapPin, Phone, Check } from 'lucide-react';
import { toast } from 'sonner';
import { CustomerSubform } from './CustomerSubform';

export interface DebtConfirmShipping {
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  shipping_cost: number;
  note?: string;
}

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  serviceItems: ServiceItem[];
  total: number;
  storeId: number;
  selectedCustomer: Customer | null;
  onCustomerChange: (c: Customer | null) => void;
  /** Called with optional shipping payload. POS handles sale creation. */
  onConfirm: (opts: { shipping?: DebtConfirmShipping }) => void;
}

export function DebtModal({ isOpen, onClose, items, total, storeId, selectedCustomer, onCustomerChange, onConfirm }: DebtModalProps) {
  const { activeStoreId } = useAuth();
  const [withShipping, setWithShipping] = useState(false);
  const [recipientName, setRecipientName] = useState(selectedCustomer?.name || '');
  const [recipientPhone, setRecipientPhone] = useState(selectedCustomer?.phone || '');
  const [recipientAddress, setRecipientAddress] = useState(selectedCustomer?.address || '');
  const [shippingCost, setShippingCost] = useState('');
  const [shipNote, setShipNote] = useState('');

  useEffect(() => {
    if (selectedCustomer) {
      setRecipientName(selectedCustomer.name);
      setRecipientPhone(selectedCustomer.phone);
      setRecipientAddress(selectedCustomer.address || '');
    }
  }, [selectedCustomer]);

  const handleSubmit = () => {
    if (!selectedCustomer) { toast.error('Pelanggan wajib dipilih untuk transaksi utang'); return; }
    if (withShipping) {
      if (!recipientName || !recipientPhone || !recipientAddress) {
        toast.error('Lengkapi data pengiriman'); return;
      }
      onConfirm({
        shipping: {
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          recipient_address: recipientAddress,
          shipping_cost: parseFloat(shippingCost) || 0,
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
          <div className="bg-surface rounded-xl p-3 flex justify-between items-center">
            <span className="text-[13px] text-muted-foreground">Total Utang</span>
            <span className="text-[16px] font-medium text-foreground tabular-nums">{formatCurrency(total)}</span>
          </div>

          {/* Shared customer subform — same as Transfer/QRIS */}
          <CustomerSubform storeId={storeId} selectedCustomer={selectedCustomer} onCustomerChange={onCustomerChange} required />

          {/* Shipping toggle */}
          <div className="border border-border rounded-xl p-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={withShipping} onChange={e => setWithShipping(e.target.checked)} className="w-3.5 h-3.5 rounded border accent-primary" />
              <Truck className="w-3.5 h-3.5 text-primary" />
              <span className="text-[13px] font-medium text-foreground">Kirim barang ini</span>
              <span className="text-[11px] text-muted-foreground">(opsional)</span>
            </label>

            {withShipping && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nama Penerima *</label>
                    <input value={recipientName} onChange={e => setRecipientName(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}><Phone className="w-3.5 h-3.5 inline mr-1" />Telepon *</label>
                    <input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}><MapPin className="w-3.5 h-3.5 inline mr-1" />Alamat Pengiriman *</label>
                  <textarea value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Ongkir (Rp)</label>
                    <input type="number" value={shippingCost} onChange={e => setShippingCost(e.target.value)} className={inputCls} placeholder="0" />
                  </div>
                  <div>
                    <label className={labelCls}>Catatan</label>
                    <input value={shipNote} onChange={e => setShipNote(e.target.value)} className={inputCls} placeholder="Opsional" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-foreground font-medium text-[13px] hover:bg-accent">Batal</button>
            <button onClick={handleSubmit} disabled={!selectedCustomer}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-[13px] hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <Check className="w-3.5 h-3.5" /> Konfirmasi Simpan Utang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
