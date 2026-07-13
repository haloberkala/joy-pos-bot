import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getEmployeesByStore,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  Employee,
  EmployeeInput,
} from '@/services/employeesService';
import { getAllStores, Store } from '@/services/storesService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';

const ROLE_LABELS: Record<'admin' | 'cashier', string> = {
  admin: 'Admin',
  cashier: 'Kasir',
};

export default function Employees() {
  const { activeStoreId, user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formStoreId, setFormStoreId] = useState<number>(activeStoreId);
  const [formUsername, setFormUsername] = useState('');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'cashier'>('cashier');
  const [formPosition, setFormPosition] = useState('');
  const [formDailySalary, setFormDailySalary] = useState('');
  const [formFingerprintId, setFormFingerprintId] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const canManage = user?.role === 'owner'; // Only owner can manage employees
  const isOwner = user?.role === 'owner';

  useEffect(() => {
    loadData();
  }, [activeStoreId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const employeesData = await getEmployeesByStore(activeStoreId);
      setEmployees(employeesData);

      if (isOwner) {
        const storesData = await getAllStores();
        setStores(storesData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data karyawan');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    if (filterStatus === 'active') return emp.is_active;
    if (filterStatus === 'inactive') return !emp.is_active;
    return true;
  });

  const resetForm = () => {
    setFormStoreId(activeStoreId);
    setFormUsername('');
    setFormName('');
    setFormPhone('');
    setFormRole('cashier');
    setFormPosition('');
    setFormDailySalary('');
    setFormFingerprintId('');
    setFormPassword('');
    setFormIsActive(true);
    setShowPassword(false);
    setEditEmployee(null);
  };

  const openAdd = () => {
    resetForm();
    setShowPassword(false);
    setShowForm(true);
  };

  const openEdit = (emp: Employee) => {
    setEditEmployee(emp);
    setFormStoreId(emp.store_id);
    setFormUsername(emp.username);
    setFormName(emp.name);
    setFormPhone(emp.phone || '');
    setFormRole(emp.role);
    setFormPosition(emp.position || '');
    setFormDailySalary(emp.daily_salary ? String(emp.daily_salary) : '');
    setFormFingerprintId(emp.fingerprint_id || '');
    setFormPassword(''); // Empty for edit
    setFormIsActive(emp.is_active);
    setShowPassword(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formUsername.trim() || !formName.trim()) {
      toast.error('Username dan nama wajib diisi');
      return;
    }

    // Username validation
    if (!/^[a-z0-9_]+$/.test(formUsername)) {
      toast.error('Username hanya boleh huruf kecil, angka, dan underscore');
      return;
    }

    // Password validation for new employee
    if (!editEmployee && !formPassword.trim()) {
      toast.error('Password wajib diisi untuk karyawan baru');
      return;
    }

    // Password length validation
    if (formPassword && formPassword.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    setIsSaving(true);
    try {
      if (editEmployee) {
        // Update existing employee
        const updateData: any = {
          store_id: formStoreId,
          username: formUsername.trim(),
          name: formName.trim(),
          phone: formPhone.trim() || undefined,
          role: formRole,
          position: formPosition.trim() || undefined,
          daily_salary: formDailySalary ? Number(formDailySalary) : 0,
          fingerprint_id: formFingerprintId.trim() || undefined,
          is_active: formIsActive,
        };
        
        // Only include password if it's filled
        if (formPassword.trim()) {
          updateData.password = formPassword.trim();
        }

        await updateEmployee(editEmployee.id, updateData);
        toast.success('Data karyawan berhasil diperbarui');
      } else {
        // Create new employee
        await createEmployee({
          store_id: formStoreId,
          username: formUsername.trim(),
          name: formName.trim(),
          phone: formPhone.trim() || undefined,
          role: formRole,
          position: formPosition.trim() || undefined,
          daily_salary: formDailySalary ? Number(formDailySalary) : 0,
          fingerprint_id: formFingerprintId.trim() || undefined,
          password: formPassword.trim(),
          // is_active is always true for new employees (set in backend)
        });
        toast.success('Karyawan baru berhasil ditambahkan');
      }

      setShowForm(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving employee:', error);
      if (error.message?.includes('duplicate key') || error.code === '23505') {
        if (error.message?.includes('fingerprint')) {
          toast.error('ID Fingerprint sudah terdaftar untuk karyawan lain');
        } else {
          toast.error('Username sudah digunakan');
        }
      } else if (error.message?.includes('Password')) {
        toast.error(error.message);
      } else {
        toast.error('Gagal menyimpan data karyawan');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleScanFingerprint = async () => {
    setIsScanning(true);
    try {
      // TODO: Integrate with actual fingerprint device
      // For now, simulate scan with a random ID
      toast.info('Menghubungkan ke perangkat fingerprint...');
      
      // Simulate device communication delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate mock fingerprint ID (replace with actual device response)
      const mockFingerprintId = `FP${Date.now().toString().slice(-8)}`;
      setFormFingerprintId(mockFingerprintId);
      
      toast.success('Sidik jari berhasil dipindai!');
    } catch (error) {
      console.error('Fingerprint scan error:', error);
      toast.error('Gagal memindai sidik jari. Pastikan perangkat terhubung.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteEmployee(deleteTarget.id);
      toast.success(`Karyawan "${deleteTarget.name}" berhasil dihapus`);
      setDeleteTarget(null);
      loadData();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Gagal menghapus karyawan');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Karyawan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola admin dan kasir toko ini
          </p>
        </div>
        {canManage && (
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Karyawan
          </Button>
        )}
      </div>

      <div className="flex gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>No. HP</TableHead>
              <TableHead className="text-right">Gaji/Hari</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Memuat data karyawan...
                </TableCell>
              </TableRow>
            ) : filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Tidak ada karyawan
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-mono text-sm">{emp.username}</TableCell>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{emp.position || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ROLE_LABELS[emp.role]}</Badge>
                  </TableCell>
                  <TableCell>{emp.phone || '-'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {emp.daily_salary ? `Rp ${emp.daily_salary.toLocaleString('id-ID')}` : '-'}
                  </TableCell>
                  <TableCell>
                    {emp.is_active ? (
                      <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-600 border-red-300">
                        Nonaktif
                      </Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(emp)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editEmployee ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {/* Store Selection (Full Width for Owner) */}
            {isOwner && (
              <div className="space-y-2 mb-4">
                <Label>
                  Toko <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={String(formStoreId)}
                  onValueChange={(v) => setFormStoreId(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={String(store.id)}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Grid Layout (2 Columns, row-based alignment) */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 items-start">
              {/* Row 1 */}
              <div className="space-y-2">
                <Label>
                  Username <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value.toLowerCase())}
                  placeholder="Contoh: kasir1"
                />
                <p className="text-xs text-muted-foreground">
                  Huruf kecil, angka, dan underscore saja
                </p>
              </div>

              <div className="space-y-2">
                <Label>Jabatan</Label>
                <Input
                  value={formPosition}
                  onChange={(e) => setFormPosition(e.target.value)}
                  placeholder="Contoh: Kasir, Staff Gudang"
                />
              </div>

              {/* Row 2 */}
              <div className="space-y-2">
                <Label>
                  Password {editEmployee ? '(Opsional)' : <span className="text-destructive">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editEmployee ? 'Kosongkan jika tidak ingin mengubah' : 'Minimal 6 karakter'}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {editEmployee ? (
                  <p className="text-xs text-muted-foreground">
                    Kosongkan jika tidak ingin mengubah password
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Password untuk login karyawan (minimal 6 karakter)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>No. HP</Label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="08xx-xxxx-xxxx"
                />
              </div>

              {/* Row 3 */}
              <div className="space-y-2">
                <Label>
                  Nama Lengkap <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nama lengkap karyawan"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Role <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formRole}
                  onValueChange={(v) => setFormRole(v as 'admin' | 'cashier')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="cashier">Kasir</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Row 4 */}
              <div className="space-y-2">
                <Label>ID Fingerprint</Label>
                <div className="flex gap-2">
                  <Input
                    value={formFingerprintId}
                    onChange={(e) => setFormFingerprintId(e.target.value)}
                    placeholder="Scan atau input manual"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleScanFingerprint}
                    disabled={isScanning}
                    className="shrink-0"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      'Scan'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Untuk integrasi absensi fingerprint
                </p>
              </div>

              <div className="space-y-2">
                <Label>Gaji Harian (Rp)</Label>
                <Input
                  type="number"
                  value={formDailySalary}
                  onChange={(e) => setFormDailySalary(e.target.value)}
                  placeholder="Contoh: 100000"
                  min="0"
                />
                <p className="text-xs text-muted-foreground">
                  Untuk perhitungan penggajian bulanan
                </p>
              </div>
            </div>

            {/* Status Toggle (Full Width for Edit Mode) */}
            {editEmployee && (
              <div className="flex items-center justify-between space-x-2 pt-4 mt-4 border-t">
                <div className="space-y-0.5">
                  <Label>Status Akun</Label>
                  <p className="text-xs text-muted-foreground">
                    {formIsActive ? 'Akun aktif, bisa login' : 'Akun nonaktif, tidak bisa login'}
                  </p>
                </div>
                <Switch
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={isSaving}>
                Batal
              </Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Menyimpan...' : editEmployee ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Karyawan?</AlertDialogTitle>
            <AlertDialogDescription>
              Karyawan <strong>"{deleteTarget?.name}"</strong> akan dihapus permanen.
              Data ini tidak bisa dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
