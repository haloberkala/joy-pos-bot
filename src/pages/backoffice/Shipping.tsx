import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomersForStore, stores } from '@/data/sampleData';
import {
  getShipmentsForStore, addShipment, handleCustomerSelectForShipping,
  subscribeShipments,
  type Shipment,
} from '@/data/shippingStore';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Search, Eye, MapPin, Phone, User, Package, Clock, CheckCircle, Printer,
} from 'lucide-react';

export default function Shipping() {
  const { activeStoreId } = useAuth();
  const [, setTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewShipment, setViewShipment] = useState<Shipment | null>(null);

  // Form state
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formRecipientName, setFormRecipientName] = useState('');
  const [formRecipientPhone, setFormRecipientPhone] = useState('');
  const [formRecipientAddress, setFormRecipientAddress] = useState('');
  const [formShippingCost, setFormShippingCost] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formInvoice, setFormInvoice] = useState('');

  // Subscribe to shared shipment store
  useEffect(() => {
    return subscribeShipments(() => setTick(t => t + 1));
  }, []);

  const storeCustomers = useMemo(() => getCustomersForStore(activeStoreId), [activeStoreId]);

  const storeShipments = useMemo(() => {
    let filtered = getShipmentsForStore(activeStoreId);
    if (filterStatus !== 'all') filtered = filtered.filter(s => s.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.invoice_number.toLowerCase().includes(q) ||
        s.recipient_name.toLowerCase().includes(q) ||
        s.recipient_phone.includes(q)
      );
    }
    return filtered.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStoreId, filterStatus, searchQuery, setTick]);

  const stats = useMemo(() => {
    const all = getShipmentsForStore(activeStoreId);
    return {
      total: all.length,
      pending: all.filter(s => s.status === 'pending').length,
      shipped: all.filter(s => s.status === 'shipped').length,
      delivered: all.filter(s => s.status === 'delivered').length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStoreId, setTick]);

  const handleCustomerSelect = (customerId: string) => {
    setFormCustomerId(customerId);
    const info = handleCustomerSelectForShipping(Number(customerId));
    if (info) {
      setFormRecipientName(info.name);
      setFormRecipientPhone(info.phone);
      setFormRecipientAddress(info.address);
    }
  };

  const handleAddShipment = () => {
    if (!formRecipientName || !formRecipientPhone || !formRecipientAddress) {
      toast.error('Nama, telepon, dan alamat penerima wajib diisi');
      return;
    }
    addShipment({
      id: Date.now(),
      store_id: activeStoreId,
      sale_id: null,
      invoice_number: formInvoice || `SHP-${Date.now().toString().slice(-6)}`,
      customer_id: Number(formCustomerId) || 0,
      recipient_name: formRecipientName,
      recipient_phone: formRecipientPhone,
      recipient_address: formRecipientAddress,
      note: formNote || undefined,
      shipping_cost: parseFloat(formShippingCost) || 0,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    });
    setIsAddOpen(false);
    resetForm();
    toast.success('Pengiriman berhasil ditambahkan');
  };

  const resetForm = () => {
    setFormCustomerId('');
    setFormRecipientName('');
    setFormRecipientPhone('');
    setFormRecipientAddress('');
    setFormShippingCost('');
    setFormNote('');
    setFormInvoice('');
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pengiriman Barang</h1>
          <p className="text-muted-foreground">Kelola pengiriman barang ke pelanggan</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />Tambah Pengiriman</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Tambah Pengiriman Baru</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Pilih Pelanggan (opsional)</Label>
                <Select value={formCustomerId} onValueChange={handleCustomerSelect}>
                  <SelectTrigger><SelectValue placeholder="Pilih pelanggan..." /></SelectTrigger>
                  <SelectContent>
                    {storeCustomers.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} - {c.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>No. Invoice / Referensi</Label>
                <Input value={formInvoice} onChange={e => setFormInvoice(e.target.value)} placeholder="INV-XXXXXX (opsional)" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Penerima *</Label>
                  <Input value={formRecipientName} onChange={e => setFormRecipientName(e.target.value)} placeholder="Nama penerima" />
                </div>
                <div className="space-y-2">
                  <Label>Telepon Penerima *</Label>
                  <Input value={formRecipientPhone} onChange={e => setFormRecipientPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Alamat Pengiriman *</Label>
                <Textarea value={formRecipientAddress} onChange={e => setFormRecipientAddress(e.target.value)} placeholder="Alamat lengkap tujuan pengiriman" />
              </div>

              <div className="space-y-2">
                <Label>Biaya Pengiriman (Rp)</Label>
                <Input type="number" value={formShippingCost} onChange={e => setFormShippingCost(e.target.value)} placeholder="0" />
              </div>

              <div className="space-y-2">
                <Label>Catatan (opsional)</Label>
                <Input value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Catatan pengiriman" />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>Batal</Button>
                <Button onClick={handleAddShipment}>Simpan Pengiriman</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Package className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-sm text-muted-foreground">Total</p><p className="text-xl font-bold">{stats.total}</p></div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center"><Clock className="w-5 h-5 text-yellow-600" /></div>
            <div><p className="text-sm text-muted-foreground">Menunggu</p><p className="text-xl font-bold">{stats.pending}</p></div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Truck className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-sm text-muted-foreground">Dikirim</p><p className="text-xl font-bold">{stats.shipped}</p></div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-sm text-muted-foreground">Sampai</p><p className="text-xl font-bold">{stats.delivered}</p></div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari invoice atau penerima..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Penerima</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead>Barang</TableHead>
              <TableHead className="text-right">Ongkir</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {storeShipments.map(shipment => {
              return (
                <TableRow key={shipment.id}>
                  <TableCell className="font-mono font-medium">{shipment.invoice_number}</TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{shipment.recipient_name}</span>
                      <div className="text-xs text-muted-foreground">{shipment.recipient_phone}</div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{shipment.recipient_address}</TableCell>
                  <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">{shipment.items_description || '-'}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(shipment.shipping_cost)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(shipment.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewShipment(shipment)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {storeShipments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Tidak ada data pengiriman</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!viewShipment} onOpenChange={() => setViewShipment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detail Pengiriman</DialogTitle></DialogHeader>
          {viewShipment && (() => {
            return (
              <div className="space-y-4">
                <span className="font-mono text-muted-foreground">{viewShipment.invoice_number}</span>

                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{viewShipment.recipient_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{viewShipment.recipient_phone}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span>{viewShipment.recipient_address}</span>
                  </div>
                </div>

                {viewShipment.items_description && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Barang:</span>
                    <p className="font-medium">{viewShipment.items_description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Biaya Pengiriman</span>
                    <p className="font-bold text-lg">{formatCurrency(viewShipment.shipping_cost)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tanggal</span>
                    <p className="font-medium">{formatDate(viewShipment.created_at)}</p>
                  </div>
                </div>

                {viewShipment.note && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Catatan:</span>
                    <p className="font-medium">{viewShipment.note}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="border-t pt-4">
                  <Button variant="outline" className="w-full gap-2" onClick={() => {
                    const store = stores.find(s => s.id === activeStoreId);
                    if (store) printSuratJalan({ shipment: viewShipment, store });
                  }}>
                    <Printer className="w-4 h-4" /> Cetak Surat Jalan
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
