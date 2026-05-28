import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCustomersByStore,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  Customer,
} from "@/services/customersService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Edit2, Trash2, Users, Phone, MapPin, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function Customers() {
  const { activeStoreId } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");

  useEffect(() => {
    loadCustomers();
  }, [activeStoreId]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const data = await getCustomersByStore(activeStoreId);
      setCustomers(data);
    } catch (error) {
      console.error("Error loading customers:", error);
      toast.error("Gagal memuat data pelanggan");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingCustomer(null);
    setFormName("");
    setFormPhone("");
    setFormAddress("");
    setIsFormOpen(true);
  };

  const openEditForm = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormPhone(customer.phone);
    setFormAddress(customer.address || "");
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Nama pelanggan wajib diisi");
      return;
    }
    if (!formPhone.trim()) {
      toast.error("Nomor telepon wajib diisi");
      return;
    }

    try {
      setIsSaving(true);

      if (editingCustomer) {
        // Update existing customer
        await updateCustomer(editingCustomer.id, {
          store_id: activeStoreId,
          name: formName.trim(),
          phone: formPhone.trim(),
          address: formAddress.trim() || undefined,
        });
        toast.success("Pelanggan berhasil diperbarui");
      } else {
        // Create new customer
        await createCustomer({
          store_id: activeStoreId,
          name: formName.trim(),
          phone: formPhone.trim(),
          address: formAddress.trim() || undefined,
        });
        toast.success("Pelanggan berhasil ditambahkan");
      }

      setIsFormOpen(false);
      loadCustomers();
    } catch (error: any) {
      console.error("Error saving customer:", error);
      toast.error(error.message || "Gagal menyimpan data pelanggan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteCustomer(deleteTarget.id);
      toast.success(`Pelanggan "${deleteTarget.name}" berhasil dihapus`);
      setDeleteTarget(null);
      loadCustomers();
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      toast.error(error.message || "Gagal menghapus pelanggan");
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manajemen Pelanggan</h1>
        <p className="text-muted-foreground">Kelola data pelanggan toko Anda</p>
      </div>

      {/* Stats Card */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Pelanggan</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {customers.length}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari pelanggan (nama atau telepon)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openCreateForm} className="gap-2">
          <Plus className="w-4 h-4" />
          Tambah Pelanggan
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold px-6 py-4">Nama</TableHead>
              <TableHead className="font-semibold px-6 py-4">Telepon</TableHead>
              <TableHead className="font-semibold px-6 py-4">Alamat</TableHead>
              <TableHead className="font-semibold px-6 py-4 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "Tidak ada pelanggan yang cocok" : "Belum ada pelanggan"}
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id} className="hover:bg-gray-50">
                  <TableCell className="px-6 py-4 font-medium">{customer.name}</TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      {customer.phone}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {customer.address ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="line-clamp-1">{customer.address}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditForm(customer)}
                        className="gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(customer)}
                        className="gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Pelanggan *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nama lengkap"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Nomor Telepon *</Label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="08xx-xxxx-xxxx"
              />
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="Alamat lengkap (opsional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Menyimpan..." : editingCustomer ? "Perbarui" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              Hapus Pelanggan?
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              Anda akan menghapus pelanggan <strong>"{deleteTarget?.name}"</strong>.
              <br />
              <br />
              Data pelanggan akan dihapus permanen dan tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus Pelanggan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
