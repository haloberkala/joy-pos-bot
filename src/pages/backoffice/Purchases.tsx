import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  samplePurchases, samplePurchaseDetails, suppliers, products,
  getProduct, getStoreName, getSuppliersForStore, getProductsForStore,
} from '@/data/sampleData';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Search, Eye, Truck, Package, ShoppingCart, ImagePlus, Trash2, Upload,
  Phone, Edit2, Wallet, DollarSign, AlertTriangle, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { Purchase, PurchaseDetail, Supplier } from '@/types/pos';

export default function Purchases() {
  const { activeStoreId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Local state for suppliers
  const [localSuppliers, setLocalSuppliers] = useState(suppliers);

  // Purchase form
  const [formSupplier, setFormSupplier] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formImageProof, setFormImageProof] = useState<string>('');
  const [formItems, setFormItems] = useState<{ product_id: string; quantity: string; cost_price: string }[]>([
    { product_id: '', quantity: '', cost_price: '' },
  ]);

  // Supplier form
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');

  const storeSuppliers = useMemo(() =>
    localSuppliers.filter(s => s.store_id === activeStoreId),
  [localSuppliers, activeStoreId]);

  const storeProducts = useMemo(() => getProductsForStore(activeStoreId), [activeStoreId]);

  const storePurchases = useMemo(() =>
    samplePurchases.filter(p => p.store_id === activeStoreId).sort((a, b) => b.date.getTime() - a.date.getTime()),
  [activeStoreId]);

  const filteredPurchases = storePurchases.filter(p =>
    p.reference_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.note?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPurchaseValue = storePurchases.reduce((sum, p) => sum + p.total_amount, 0);

  const getSupplierName = (supplierId: number | null) => {
    if (!supplierId) return 'Tanpa Supplier';
    return localSuppliers.find(s => s.id === supplierId)?.name || '-';
  };

  const addFormItem = () => {
    setFormItems(prev => [...prev, { product_id: '', quantity: '', cost_price: '' }]);
  };

  const removeFormItem = (index: number) => {
    setFormItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateFormItem = (index: number, field: string, value: string) => {
    setFormItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const formTotal = formItems.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity || '0') * parseFloat(item.cost_price || '0'));
  }, 0);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, this would upload to storage. For demo, use data URL
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormImageProof(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPurchase = () => {
    const validItems = formItems.filter(i => i.product_id && i.quantity && i.cost_price);
    if (validItems.length === 0) {
      toast.error('Tambahkan minimal 1 item');
      return;
    }
    if (!formImageProof) {
      toast.error('Upload bukti struk pembelian');
      return;
    }

    const now = new Date();
    const refNo = `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-3)}`;

    toast.success(`Pembelian ${refNo} berhasil dicatat`);
    setIsAddPurchaseOpen(false);
    setFormItems([{ product_id: '', quantity: '', cost_price: '' }]);
    setFormNote('');
    setFormSupplier('');
    setFormImageProof('');
  };

  const handleAddSupplier = () => {
    if (!supplierName.trim() || !supplierPhone.trim()) {
      toast.error('Nama dan telepon supplier wajib diisi');
      return;
    }
    const newSupplier: Supplier = {
      id: Date.now(),
      store_id: activeStoreId,
      name: supplierName.trim(),
      phone: supplierPhone.trim(),
      address: supplierAddress.trim() || undefined,
      created_at: new Date(),
      updated_at: new Date(),
    };
    setLocalSuppliers(prev => [...prev, newSupplier]);
    setIsAddSupplierOpen(false);
    setSupplierName('');
    setSupplierPhone('');
    setSupplierAddress('');
    toast.success(`Supplier ${newSupplier.name} berhasil ditambahkan`);
  };

  const handleEditSupplier = () => {
    if (!editingSupplier || !supplierName.trim() || !supplierPhone.trim()) {
      toast.error('Nama dan telepon wajib diisi');
      return;
    }
    setLocalSuppliers(prev => prev.map(s =>
      s.id === editingSupplier.id
        ? { ...s, name: supplierName.trim(), phone: supplierPhone.trim(), address: supplierAddress.trim() || undefined, updated_at: new Date() }
        : s
    ));
    setEditingSupplier(null);
    setSupplierName('');
    setSupplierPhone('');
    setSupplierAddress('');
    toast.success('Supplier berhasil diperbarui');
  };

  const handleDeleteSupplier = (id: number) => {
    setLocalSuppliers(prev => prev.filter(s => s.id !== id));
    toast.success('Supplier berhasil dihapus');
  };

  const startEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierName(supplier.name);
    setSupplierPhone(supplier.phone);
    setSupplierAddress(supplier.address || '');
  };

  const viewPurchaseDetails = useMemo(() => {
    if (!viewPurchase) return [];
    return samplePurchaseDetails
      .filter(d => d.purchase_id === viewPurchase.id)
      .map(d => ({ ...d, product: getProduct(d.product_id) }));
  }, [viewPurchase]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kulakan / Supply</h1>
          <p className="text-muted-foreground">Catat pembelian stok dari supplier & kelola utang supplier</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Pembelian</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalPurchaseValue)}</p>
              <p className="text-xs text-muted-foreground mt-1">{storePurchases.length} transaksi</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600"><ShoppingCart className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Supplier Aktif</p>
              <p className="text-2xl font-bold text-foreground mt-1">{storeSuppliers.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-100 text-green-600"><Truck className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total SKU</p>
              <p className="text-2xl font-bold text-foreground mt-1">{storeProducts.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-100 text-purple-600"><Package className="w-5 h-5" /></div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="purchases" className="space-y-4">
        <TabsList>
          <TabsTrigger value="purchases" className="gap-2"><ShoppingCart className="w-4 h-4" />Riwayat Kulakan</TabsTrigger>
          <TabsTrigger value="supplier-debt" className="gap-2"><Wallet className="w-4 h-4" />Utang Supplier</TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-2"><Truck className="w-4 h-4" />Daftar Supplier</TabsTrigger>
        </TabsList>

        {/* ========== PURCHASES TAB ========== */}
        <TabsContent value="purchases" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari referensi..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Dialog open={isAddPurchaseOpen} onOpenChange={setIsAddPurchaseOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" />Catat Pembelian</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Catat Pembelian Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Supplier</Label>
                      <Select value={formSupplier} onValueChange={setFormSupplier}>
                        <SelectTrigger><SelectValue placeholder="Pilih supplier (opsional)" /></SelectTrigger>
                        <SelectContent>
                          {storeSuppliers.map(s => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tanggal</Label>
                      <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                    </div>
                  </div>

                  {/* Image proof upload */}
                  <div className="space-y-2">
                    <Label>Bukti Struk Pembelian *</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-4">
                      {formImageProof ? (
                        <div className="relative">
                          <img src={formImageProof} alt="Bukti struk" className="max-h-40 rounded-lg mx-auto object-contain" />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => setFormImageProof('')}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center gap-2 cursor-pointer py-4">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Upload className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">Klik untuk upload foto struk</p>
                          <p className="text-xs text-muted-foreground">JPG, PNG max 5MB</p>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Item Pembelian</Label>
                      <Button variant="outline" size="sm" className="gap-1" onClick={addFormItem}>
                        <Plus className="w-3 h-3" /> Tambah Item
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {formItems.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-5">
                            {index === 0 && <Label className="text-xs">Produk</Label>}
                            <Select value={item.product_id} onValueChange={(v) => updateFormItem(index, 'product_id', v)}>
                              <SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                              <SelectContent>
                                {storeProducts.map(p => (
                                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            {index === 0 && <Label className="text-xs">Qty</Label>}
                            <Input type="number" placeholder="0" value={item.quantity} onChange={(e) => updateFormItem(index, 'quantity', e.target.value)} />
                          </div>
                          <div className="col-span-3">
                            {index === 0 && <Label className="text-xs">Harga Modal</Label>}
                            <Input type="number" placeholder="0" value={item.cost_price} onChange={(e) => updateFormItem(index, 'cost_price', e.target.value)} />
                          </div>
                          <div className="col-span-2 flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                              {formatCurrency(parseFloat(item.quantity || '0') * parseFloat(item.cost_price || '0'))}
                            </span>
                            {formItems.length > 1 && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFormItem(index)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end border-t pt-2">
                      <span className="font-semibold">Total: {formatCurrency(formTotal)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Catatan</Label>
                    <Textarea placeholder="Catatan pembelian..." value={formNote} onChange={(e) => setFormNote(e.target.value)} />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddPurchaseOpen(false)}>Batal</Button>
                    <Button onClick={handleAddPurchase}>Simpan Pembelian</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referensi</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Bukti</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-medium font-mono">{purchase.reference_no}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(purchase.date)}</TableCell>
                    <TableCell>{getSupplierName(purchase.supplier_id)}</TableCell>
                    <TableCell>
                      {purchase.image_proof ? (
                        <Badge variant="default" className="gap-1"><ImagePlus className="w-3 h-3" /> Ada</Badge>
                      ) : (
                        <Badge variant="secondary">Tidak ada</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(purchase.total_amount)}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[150px] truncate">{purchase.note || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewPurchase(purchase)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredPurchases.length === 0 && (
              <div className="text-center py-12 text-muted-foreground"><p>Belum ada pembelian tercatat</p></div>
            )}
          </div>
        </TabsContent>

        {/* ========== SUPPLIER DEBT TAB ========== */}
        <TabsContent value="supplier-debt" className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-orange-100 text-orange-600"><Wallet className="w-5 h-5" /></div>
              <div>
                <h3 className="font-bold text-foreground">Utang ke Supplier</h3>
                <p className="text-sm text-muted-foreground">Kelola hutang toko kepada supplier dari pembelian kulakan</p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-xl p-6 text-center">
              <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-foreground">Belum ada utang supplier</p>
              <p className="text-sm text-muted-foreground mt-1">
                Utang akan muncul otomatis saat mencatat pembelian dengan status "Belum Lunas"
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Fitur: Saat menambah pembelian baru, pilih status pembayaran "Utang" untuk mencatat hutang ke supplier.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ========== SUPPLIERS TAB ========== */}
        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex justify-between">
            <p className="text-muted-foreground">Kelola daftar supplier / pemasok</p>
            <Dialog open={isAddSupplierOpen} onOpenChange={(open) => { setIsAddSupplierOpen(open); if (!open) { setSupplierName(''); setSupplierPhone(''); setSupplierAddress(''); } }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" />Tambah Supplier</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Supplier Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nama Supplier *</Label>
                    <Input placeholder="Nama supplier" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telepon *</Label>
                    <Input placeholder="08xxxxxxxxxx" value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Alamat</Label>
                    <Textarea placeholder="Alamat supplier" value={supplierAddress} onChange={(e) => setSupplierAddress(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddSupplierOpen(false)}>Batal</Button>
                    <Button onClick={handleAddSupplier}>Simpan</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Supplier</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storeSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="w-3 h-3" /> {supplier.phone}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {supplier.address || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditSupplier(supplier)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteSupplier(supplier.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {storeSuppliers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground"><p>Belum ada supplier</p></div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* View Purchase Detail Dialog */}
      <Dialog open={!!viewPurchase} onOpenChange={() => setViewPurchase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Pembelian</DialogTitle>
          </DialogHeader>
          {viewPurchase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Referensi</p><p className="font-medium">{viewPurchase.reference_no}</p></div>
                <div><p className="text-muted-foreground">Tanggal</p><p className="font-medium">{formatDate(viewPurchase.date)}</p></div>
                <div><p className="text-muted-foreground">Supplier</p><p className="font-medium">{getSupplierName(viewPurchase.supplier_id)}</p></div>
                <div><p className="text-muted-foreground">Total</p><p className="font-bold text-primary">{formatCurrency(viewPurchase.total_amount)}</p></div>
              </div>
              {viewPurchase.note && (
                <div className="text-sm"><p className="text-muted-foreground">Catatan</p><p>{viewPurchase.note}</p></div>
              )}
              <div className="border-t pt-4">
                <p className="font-medium mb-2">Item</p>
                <div className="space-y-2">
                  {viewPurchaseDetails.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.product?.name || `#${item.product_id}`} x{item.quantity}</span>
                      <span className="font-medium">{formatCurrency(item.sub_total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog open={!!editingSupplier} onOpenChange={(open) => { if (!open) setEditingSupplier(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama *</Label>
              <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telepon *</Label>
              <Input value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Textarea value={supplierAddress} onChange={(e) => setSupplierAddress(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingSupplier(null)}>Batal</Button>
              <Button onClick={handleEditSupplier}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
