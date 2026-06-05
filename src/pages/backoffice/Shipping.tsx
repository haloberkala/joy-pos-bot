import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomersByStore } from '@/services/customersService';
import { getStoreById } from '@/services/storesService';
import {
  getShipmentsByStore,
  Shipment,
} from '@/services/shipmentsService';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye, MapPin, User, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function Shipping() {
  const { activeStoreId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [viewShipment, setViewShipment] = useState<Shipment | null>(null);

  // Supabase data
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [currentStore, setCurrentStore] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, [activeStoreId, refreshKey]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [shipmentsData, customersData, storeData] = await Promise.all([
        getShipmentsByStore(activeStoreId),
        getCustomersByStore(activeStoreId),
        getStoreById(activeStoreId),
      ]);
      
      setShipments(shipmentsData);
      setCustomers(customersData);
      setCurrentStore(storeData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data pengiriman');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredShipments = useMemo(() => {
    let filtered = shipments;
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        (s.invoice_number && s.invoice_number.toLowerCase().includes(q)) ||
        s.recipient_name.toLowerCase().includes(q) ||
        s.recipient_phone.includes(q)
      );
    }
    
    return filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [shipments, searchQuery]);

  const totalShipments = shipments.length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pengiriman Barang</h1>
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pengiriman Barang</h1>
        <p className="text-muted-foreground">Data pengiriman barang ke pelanggan</p>
      </div>

      {/* Stats */}
      <div className="bg-card rounded-xl border border-border p-4 w-fit">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Pengiriman</p>
            <p className="text-xl font-bold">{totalShipments}</p>
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
            {filteredShipments.map(shipment => {
              return (
                <TableRow key={shipment.id}>
                  <TableCell className="font-mono font-medium">{shipment.invoice_number || '-'}</TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{shipment.recipient_name}</span>
                      <div className="text-xs text-muted-foreground">{shipment.recipient_phone}</div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{shipment.recipient_address}</TableCell>
                  <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">{shipment.items_description || '-'}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(shipment.shipping_cost)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(new Date(shipment.created_at))}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewShipment(shipment)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredShipments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Tidak ada data pengiriman</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!viewShipment} onOpenChange={() => setViewShipment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Detail Pengiriman
            </DialogTitle>
          </DialogHeader>
          {viewShipment && (() => {
            const customer = customers.find(c => c.id === viewShipment.customer_id);
            
            return (
              <div className="space-y-5">
                {/* Invoice Number */}
                <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">No. Invoice</p>
                  <p className="font-mono font-bold text-lg text-primary">{viewShipment.invoice_number || '-'}</p>
                </div>

                {/* Data Pelanggan */}
                {customer && (
                  <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-600" />
                      Data Pelanggan
                    </h3>
                    <div className="space-y-2">
                      <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                        <span className="text-purple-700">Nama</span>
                        <span className="font-medium text-purple-900">{customer.name}</span>
                      </div>
                      <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                        <span className="text-purple-700">No. Telepon</span>
                        <span className="font-medium text-purple-900">{customer.phone}</span>
                      </div>
                      {customer.address && (
                        <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                          <span className="text-purple-700">Alamat</span>
                          <span className="font-medium text-purple-900">{customer.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Informasi Penerima */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Informasi Penerima
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                      <span className="text-muted-foreground">Nama</span>
                      <span className="font-medium">{viewShipment.recipient_name}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                      <span className="text-muted-foreground">No. Telepon</span>
                      <span className="font-medium">{viewShipment.recipient_phone}</span>
                    </div>
                  </div>
                </div>

                {/* Alamat Lengkap */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Alamat Pengiriman
                  </h3>
                  <p className="text-sm leading-relaxed">{viewShipment.recipient_address}</p>
                </div>

                {/* Detail Barang */}
                {viewShipment.items_description && (
                  <div className="bg-card rounded-xl border border-border p-4">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      Barang yang Dikirim
                    </h3>
                    <p className="text-sm leading-relaxed">{viewShipment.items_description}</p>
                  </div>
                )}

                {/* Rincian Biaya & Tanggal */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-xl border border-green-200 p-4">
                    <p className="text-xs text-green-700 mb-1">Biaya Pengiriman</p>
                    <p className="font-bold text-2xl text-green-700">{formatCurrency(viewShipment.shipping_cost)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                    <p className="text-xs text-blue-700 mb-1">Tanggal Transaksi</p>
                    <p className="font-semibold text-sm text-blue-700">{formatDate(new Date(viewShipment.created_at))}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {new Date(viewShipment.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t pt-4">
                  <Button
                    className="w-full h-10 rounded-lg font-medium"
                    onClick={() => setViewShipment(null)}
                  >
                    Tutup
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
