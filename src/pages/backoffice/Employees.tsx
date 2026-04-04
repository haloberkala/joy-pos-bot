import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { employees, addEmployee, updateEmployee } from '@/data/sdmData';
import { Employee, EmployeeRole, EmployeeStatus } from '@/types/pos';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatRupiah } from '@/lib/format';
import { Plus, Pencil, UserX, UserCheck } from 'lucide-react';
import { format } from 'date-fns';

const ROLE_LABELS: Record<EmployeeRole, string> = { owner: 'Owner', admin: 'Admin', cashier: 'Kasir', employee: 'Karyawan' };

export default function Employees() {
  const { activeStoreId, user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [, setTick] = useState(0);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSalary, setFormSalary] = useState('');
  const [formRole, setFormRole] = useState<EmployeeRole>('employee');
  const [formStartDate, setFormStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const canManage = user?.role === 'owner' || user?.role === 'admin';

  const storeEmployees = useMemo(() =>
    employees.filter(e => e.store_id === activeStoreId && (filterStatus === 'all' || e.status === filterStatus)),
    [activeStoreId, filterStatus, showForm, editId]
  );

  const resetForm = () => {
    setFormName(''); setFormPosition(''); setFormPhone(''); setFormSalary(''); setFormRole('employee');
    setFormStartDate(format(new Date(), 'yyyy-MM-dd'));
    setEditId(null);
  };

  const openAdd = () => { resetForm(); setShowForm(true); };

  const openEdit = (emp: Employee) => {
    setEditId(emp.id);
    setFormName(emp.name); setFormPosition(emp.position); setFormPhone(emp.phone);
    setFormSalary(String(emp.daily_salary)); setFormRole(emp.role);
    setFormStartDate(format(emp.start_date, 'yyyy-MM-dd'));
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formName.trim() || !formPosition.trim() || !formSalary) {
      toast.error('Nama, jabatan, dan gaji harian wajib diisi');
      return;
    }
    if (editId) {
      updateEmployee(editId, {
        name: formName.trim(), position: formPosition.trim(), phone: formPhone.trim(),
        daily_salary: Number(formSalary), role: formRole, start_date: new Date(formStartDate),
      });
      toast.success('Data karyawan diperbarui');
    } else {
      addEmployee({
        store_id: activeStoreId, name: formName.trim(), position: formPosition.trim(),
        phone: formPhone.trim(), daily_salary: Number(formSalary), role: formRole,
        start_date: new Date(formStartDate), status: 'active',
      });
      toast.success('Karyawan baru ditambahkan');
    }
    setShowForm(false); resetForm(); setTick(t => t + 1);
  };

  const toggleStatus = (emp: Employee) => {
    const newStatus: EmployeeStatus = emp.status === 'active' ? 'inactive' : 'active';
    updateEmployee(emp.id, { status: newStatus });
    toast.success(newStatus === 'active' ? 'Karyawan diaktifkan kembali' : 'Karyawan dinonaktifkan');
    setTick(t => t + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Manajemen Karyawan</h1>
        {canManage && <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Tambah Karyawan</Button>}
      </div>

      <div className="flex gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
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
              <TableHead>Nama</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>No. HP</TableHead>
              <TableHead className="text-right">Gaji/Hari</TableHead>
              <TableHead>Mulai Kerja</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {storeEmployees.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Tidak ada karyawan</TableCell></TableRow>
            )}
            {storeEmployees.map(emp => (
              <TableRow key={emp.id}>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell>{emp.position}</TableCell>
                <TableCell><Badge variant="outline">{ROLE_LABELS[emp.role]}</Badge></TableCell>
                <TableCell>{emp.phone}</TableCell>
                <TableCell className="text-right">{formatRupiah(emp.daily_salary)}</TableCell>
                <TableCell>{format(emp.start_date, 'dd/MM/yyyy')}</TableCell>
                <TableCell>
                  {emp.status === 'active'
                    ? <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                    : <Badge variant="outline" className="text-red-600 border-red-300">Nonaktif</Badge>
                  }
                </TableCell>
                {canManage && (
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleStatus(emp)}>
                      {emp.status === 'active' ? <UserX className="w-4 h-4 text-destructive" /> : <UserCheck className="w-4 h-4 text-green-600" />}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit Karyawan' : 'Tambah Karyawan'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nama <span className="text-destructive">*</span></label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Jabatan <span className="text-destructive">*</span></label>
              <Input value={formPosition} onChange={e => setFormPosition(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">No. HP</label>
              <Input value={formPhone} onChange={e => setFormPhone(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Gaji Harian <span className="text-destructive">*</span></label>
              <Input type="number" value={formSalary} onChange={e => setFormSalary(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={formRole} onValueChange={v => setFormRole(v as EmployeeRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Tanggal Mulai Kerja</label>
              <Input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Batal</Button>
            <Button onClick={handleSave}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
