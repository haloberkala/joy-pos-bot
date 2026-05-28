# CRUD Kategori Pengeluaran - SELESAI ✅

## Tanggal: 25 Mei 2026

## TASK 14: Tambah CRUD Kategori pada Form Pengeluaran

### Status: ✅ SELESAI

---

## Fitur yang Ditambahkan

### ✅ CRUD Kategori Pengeluaran

**Lokasi**: Form "Tambah Pengeluaran Baru"

**Fitur**:
1. ✅ **Tombol "+" di samping dropdown kategori**
   - Membuka modal "Kelola Kategori Pengeluaran"
   - Mudah diakses saat menambah pengeluaran

2. ✅ **Modal Kelola Kategori** dengan fitur:
   - **Create**: Tambah kategori baru
   - **Read**: Lihat daftar semua kategori
   - **Update**: Edit nama dan deskripsi kategori
   - **Delete**: Hapus kategori (dengan konfirmasi)

3. ✅ **Form Kategori**:
   - Nama kategori (wajib)
   - Deskripsi (opsional)
   - Validasi input

4. ✅ **Daftar Kategori**:
   - Tampilan list dengan scroll
   - Tombol Edit dan Delete per kategori
   - Hover effect untuk UX yang lebih baik

---

## Perubahan Detail

### 1. Service Layer - expensesService.ts

**Fungsi Baru yang Ditambahkan**:

```typescript
/**
 * Create new expense category
 */
export async function createExpenseCategory(
  name: string, 
  description?: string
): Promise<ExpenseCategory> {
  const { data, error } = await supabase
    .from('expense_categories')
    .insert({
      name,
      description: description || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update expense category
 */
export async function updateExpenseCategory(
  id: number, 
  name: string, 
  description?: string
): Promise<ExpenseCategory> {
  const { data, error } = await supabase
    .from('expense_categories')
    .update({
      name,
      description: description || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete expense category
 */
export async function deleteExpenseCategory(id: number): Promise<void> {
  const { error } = await supabase
    .from('expense_categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
```

---

### 2. UI Layer - Expenses.tsx

#### A. Import Tambahan

```typescript
import { 
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
} from '@/services/expensesService';
import { Edit, X } from 'lucide-react';
```

#### B. State Baru

```typescript
const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
const [categoryName, setCategoryName] = useState('');
const [categoryDescription, setCategoryDescription] = useState('');
const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
```

#### C. Handler Functions

```typescript
// Save (Create/Update) Category
const handleSaveCategory = async () => {
  if (!categoryName.trim()) {
    toast.error('Nama kategori wajib diisi');
    return;
  }

  try {
    setIsSaving(true);
    
    if (editingCategory) {
      await updateExpenseCategory(editingCategory.id, categoryName, categoryDescription || undefined);
      toast.success('Kategori berhasil diupdate');
    } else {
      await createExpenseCategory(categoryName, categoryDescription || undefined);
      toast.success('Kategori berhasil ditambahkan');
    }
    
    setIsCategoryModalOpen(false);
    setCategoryName('');
    setCategoryDescription('');
    setEditingCategory(null);
    await loadData();
  } catch (error) {
    console.error('Error saving category:', error);
    toast.error('Gagal menyimpan kategori');
  } finally {
    setIsSaving(false);
  }
};

// Edit Category
const handleEditCategory = (category: ExpenseCategory) => {
  setEditingCategory(category);
  setCategoryName(category.name);
  setCategoryDescription(category.description || '');
  setIsCategoryModalOpen(true);
};

// Delete Category
const handleDeleteCategory = async (id: number) => {
  if (!confirm('Yakin ingin menghapus kategori ini?')) {
    return;
  }

  try {
    await deleteExpenseCategory(id);
    await loadData();
    toast.success('Kategori berhasil dihapus');
  } catch (error) {
    console.error('Error deleting category:', error);
    toast.error('Gagal menghapus kategori. Mungkin masih ada pengeluaran yang menggunakan kategori ini.');
  }
};

// Open Modal
const openCategoryModal = () => {
  setEditingCategory(null);
  setCategoryName('');
  setCategoryDescription('');
  setIsCategoryModalOpen(true);
};
```

#### D. UI Update - Tombol "+" di Form

**Sebelum**:
```typescript
<div className="space-y-2">
  <Label>Kategori</Label>
  <Select value={formCategory} onValueChange={setFormCategory}>
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>
      {expenseCategories.map((cat) => (
        <SelectItem key={cat.id} value={String(cat.id)}>
          {cat.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

**Sesudah**:
```typescript
<div className="space-y-2">
  <Label>Kategori</Label>
  <div className="flex gap-2">
    <Select value={formCategory} onValueChange={setFormCategory}>
      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
      <SelectContent>
        {expenseCategories.map((cat) => (
          <SelectItem key={cat.id} value={String(cat.id)}>
            {cat.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Button 
      type="button" 
      variant="outline" 
      size="icon" 
      onClick={openCategoryModal} 
      title="Kelola Kategori"
    >
      <Plus className="w-4 h-4" />
    </Button>
  </div>
</div>
```

#### E. Modal Kelola Kategori

```typescript
<Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>
        {editingCategory ? 'Edit Kategori' : 'Kelola Kategori Pengeluaran'}
      </DialogTitle>
    </DialogHeader>
    <div className="space-y-6 py-4">
      {/* Form Add/Edit Category */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-sm">
          {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
        </h3>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Nama Kategori *</Label>
            <Input 
              placeholder="Contoh: Gaji Karyawan, Listrik & Air" 
              value={categoryName} 
              onChange={(e) => setCategoryName(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Deskripsi (opsional)</Label>
            <Textarea 
              placeholder="Deskripsi kategori..." 
              value={categoryDescription} 
              onChange={(e) => setCategoryDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            {editingCategory && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryName('');
                  setCategoryDescription('');
                }}
              >
                Batal Edit
              </Button>
            )}
            <Button onClick={handleSaveCategory} disabled={isSaving}>
              {isSaving ? 'Menyimpan...' : editingCategory ? 'Update' : 'Tambah'}
            </Button>
          </div>
        </div>
      </div>

      {/* List of Categories */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Daftar Kategori</h3>
        <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
          {expenseCategories.map((cat) => (
            <div key={cat.id} className="p-3 flex items-start justify-between hover:bg-muted/50">
              <div className="flex-1">
                <p className="font-medium">{cat.name}</p>
                {cat.description && (
                  <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                )}
              </div>
              <div className="flex gap-1 ml-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => handleEditCategory(cat)}
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteCategory(cat.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
          Tutup
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

---

## Cara Penggunaan

### 1. Tambah Kategori Baru

```
1. Buka form "Tambah Pengeluaran Baru"
2. Klik tombol "+" di samping dropdown kategori
3. Modal "Kelola Kategori Pengeluaran" terbuka
4. Isi nama kategori (wajib)
5. Isi deskripsi (opsional)
6. Klik "Tambah"
7. Kategori baru muncul di dropdown
```

### 2. Edit Kategori

```
1. Buka modal "Kelola Kategori"
2. Klik tombol "Edit" (icon pensil) pada kategori yang ingin diedit
3. Form berubah menjadi mode edit
4. Ubah nama atau deskripsi
5. Klik "Update"
6. Kategori berhasil diupdate
```

### 3. Hapus Kategori

```
1. Buka modal "Kelola Kategori"
2. Klik tombol "Delete" (icon trash) pada kategori yang ingin dihapus
3. Konfirmasi penghapusan
4. Kategori berhasil dihapus
```

**Catatan**: Kategori yang masih digunakan oleh pengeluaran tidak bisa dihapus (foreign key constraint).

---

## UI/UX Improvements

### 1. Tombol "+" yang Intuitif
- ✅ Posisi di samping dropdown kategori
- ✅ Icon Plus yang jelas
- ✅ Tooltip "Kelola Kategori"
- ✅ Variant outline agar tidak terlalu mencolok

### 2. Modal yang Informatif
- ✅ Judul yang jelas (Tambah/Edit)
- ✅ Form di bagian atas dengan background berbeda
- ✅ Daftar kategori di bawah dengan scroll
- ✅ Tombol Edit dan Delete per item

### 3. Feedback yang Jelas
- ✅ Toast notification untuk setiap aksi
- ✅ Loading state saat menyimpan
- ✅ Konfirmasi sebelum delete
- ✅ Error handling dengan pesan yang jelas

### 4. Responsive Design
- ✅ Modal max-width 2xl
- ✅ List kategori dengan max-height dan scroll
- ✅ Hover effect pada list item
- ✅ Button sizing yang konsisten

---

## Testing Checklist

### Create (Tambah)
- [x] Klik tombol "+" membuka modal
- [x] Input nama kategori
- [x] Input deskripsi (opsional)
- [x] Klik "Tambah" → Kategori tersimpan
- [x] Kategori baru muncul di dropdown
- [x] Toast success muncul
- [x] Form ter-reset setelah save

### Read (Lihat)
- [x] Daftar kategori tampil di modal
- [x] Nama kategori tampil
- [x] Deskripsi tampil (jika ada)
- [x] Scroll berfungsi jika kategori banyak

### Update (Edit)
- [x] Klik tombol Edit
- [x] Form terisi dengan data kategori
- [x] Ubah nama/deskripsi
- [x] Klik "Update" → Kategori terupdate
- [x] Perubahan langsung terlihat di list
- [x] Toast success muncul

### Delete (Hapus)
- [x] Klik tombol Delete
- [x] Konfirmasi muncul
- [x] Klik OK → Kategori terhapus
- [x] Kategori hilang dari list
- [x] Toast success muncul
- [x] Error jika kategori masih digunakan

### Integration
- [x] Kategori baru langsung tersedia di dropdown
- [x] Kategori yang diedit langsung update di dropdown
- [x] Kategori yang dihapus hilang dari dropdown
- [x] Tidak ada error saat reload data

---

## Files Modified

1. **src/services/expensesService.ts**
   - Tambah `createExpenseCategory()`
   - Tambah `updateExpenseCategory()`
   - Tambah `deleteExpenseCategory()`

2. **src/pages/backoffice/Expenses.tsx**
   - Tambah state untuk category modal
   - Tambah handler functions (save, edit, delete)
   - Tambah tombol "+" di form
   - Tambah modal "Kelola Kategori"
   - Update imports

---

## Database Schema

**Tabel**: `expense_categories`

```sql
CREATE TABLE expense_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraint**:
- Kategori yang masih digunakan oleh `expenses` tidak bisa dihapus (foreign key constraint)

---

## Kesimpulan

✅ **TASK 14 SELESAI**

**Fitur yang Ditambahkan**:
- ✅ CRUD lengkap untuk kategori pengeluaran
- ✅ Tombol "+" yang mudah diakses
- ✅ Modal yang informatif dan user-friendly
- ✅ Validasi dan error handling
- ✅ Toast notification untuk feedback
- ✅ Integration dengan form pengeluaran

**Hasil**:
- User bisa menambah kategori baru tanpa keluar dari form
- User bisa mengedit kategori yang salah
- User bisa menghapus kategori yang tidak digunakan
- UX lebih baik dan efisien

---

**Created By**: AI Assistant (Claude Sonnet 4.5)  
**Date**: 25 Mei 2026  
**Status**: ✅ COMPLETE  

🎯 **CRUD KATEGORI PENGELUARAN SEKARANG TERSEDIA!** 🎯
