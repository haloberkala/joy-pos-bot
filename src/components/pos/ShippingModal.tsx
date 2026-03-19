import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomersForStore } from '@/data/sampleData';
import { addShipment, handleCustomerSelectForShipping } from '@/data/shippingStore';
import { CartItem, Customer } from '@/types/pos';
import { formatCurrency } from '@/lib/format';
import { X, Truck, User, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
    if (info) {
      setRecipientName(info.name);
      setRecipientPhone(info.phone);
      setRecipientAddress(info.address);
    }
  };

  const handleSubmit = () => {
    if (!recipientName || !recipientPhone || !recipientAddress) {
      toast.error('Nama, telepon, dan alamat penerima wajib diisi');
      return;
    }

    const itemsDesc = items.map(i => `${i.product.name} x${i.quantity}`).join(', ');

    addShipment({
      id: Date.now(),
      store_id: activeStoreId,
      sale_id: saleId || null,
      invoice_number: invoiceNumber || `SHP-${Date.now().toString().slice(-6)}`,
      customer_id: Number(customerId) || 0,
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      recipient_address: recipientAddress,
      items_description: itemsDesc,
      note: note || undefined,
      shipping_cost: parseFloat(shippingCost) || 0,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    });

    toast.success('Pengiriman berhasil dibuat!');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[hsl(var(--pos-card))] rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--pos-border))]">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[hsl(var(--pos-accent))]" />
            <h2 className="text-lg font-bold text-[hsl(var(--pos-foreground))]">Buat Pengiriman</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[hsl(var(--pos-muted))]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Items summary */}
          <div className="bg-[hsl(var(--pos-muted))] rounded-xl p-3">
            <p className="text-xs font-medium text-[hsl(var(--pos-muted-foreground))] mb-1">Barang dikirim:</p>
            <div className="space-y-0.5">
              {items.map(item => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-[hsl(var(--pos-foreground))]">{item.product.name} x{item.quantity}</span>
                  <span className="font-medium">{formatCurrency(item.price_per_unit * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[hsl(var(--pos-border))] mt-2 pt-2 flex justify-between font-bold text-[hsl(var(--pos-foreground))]">
              <span>Total Barang</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Customer select */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--pos-foreground))] mb-1">
              <User className="w-3.5 h-3.5 inline mr-1" />Pilih Pelanggan
            </label>
            <select
              value={customerId}
              onChange={e => handleCustomerChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-background))] text-[hsl(var(--pos-foreground))] text-sm focus:border-[hsl(var(--pos-accent))] focus:outline-none"
            >
              <option value="">-- Pilih pelanggan --</option>
              {storeCustomers.map(c => (
                <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
              ))}
            </select>
          </div>

          {/* Recipient fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--pos-foreground))] mb-1">Nama Penerima *</label>
              <input
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-background))] text-[hsl(var(--pos-foreground))] text-sm focus:border-[hsl(var(--pos-accent))] focus:outline-none"
                placeholder="Nama penerima"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--pos-foreground))] mb-1">
                <Phone className="w-3.5 h-3.5 inline mr-1" />Telepon *
              </label>
              <input
                value={recipientPhone}
                onChange={e => setRecipientPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-background))] text-[hsl(var(--pos-foreground))] text-sm focus:border-[hsl(var(--pos-accent))] focus:outline-none"
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--pos-foreground))] mb-1">
              <MapPin className="w-3.5 h-3.5 inline mr-1" />Alamat Pengiriman *
            </label>
            <textarea
              value={recipientAddress}
              onChange={e => setRecipientAddress(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-background))] text-[hsl(var(--pos-foreground))] text-sm focus:border-[hsl(var(--pos-accent))] focus:outline-none resize-none"
              placeholder="Alamat lengkap tujuan"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--pos-foreground))] mb-1">Ongkir (Rp)</label>
              <input
                type="number"
                value={shippingCost}
                onChange={e => setShippingCost(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-background))] text-[hsl(var(--pos-foreground))] text-sm focus:border-[hsl(var(--pos-accent))] focus:outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--pos-foreground))] mb-1">Catatan</label>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-background))] text-[hsl(var(--pos-foreground))] text-sm focus:border-[hsl(var(--pos-accent))] focus:outline-none"
                placeholder="Catatan opsional"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[hsl(var(--pos-border))] text-[hsl(var(--pos-foreground))] font-semibold hover:bg-[hsl(var(--pos-muted))] transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-2.5 rounded-xl bg-[hsl(var(--pos-accent))] text-[hsl(var(--pos-accent-foreground))] font-bold hover:bg-[hsl(var(--pos-accent-hover))] transition-colors flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4" />
              Buat Pengiriman
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
