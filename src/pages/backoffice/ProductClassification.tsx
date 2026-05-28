import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  Category,
} from '@/services/categoriesService';
import {
  getAllBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  Brand,
} from '@/services/brandsService';
import {
  getAllUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  Unit,
} from '@/services/unitsService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Tag, Package, Ruler, Search } from 'lucide-react';

export default function ProductClassification() {
  const { activeStoreId } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);

  // Search states
  const [categorySearch, setCategorySearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');

  // Category form state
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<Category | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Brand form state
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState('');
  const [brandDescription, setBrandDescription] = useState('');
  const [deleteBrandTarget, setDeleteBrandTarget] = useState<Brand | null>(null);
  const [isSavingBrand, setIsSavingBrand] = useState(false);

  // Unit form state
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitName, setUnitName] = useState('');
  const [unitDescription, setUnitDescription] = useState('');
  const [deleteUnitTarget, setDeleteUnitTarget] = useState<Unit | null>(null);
  const [isSavingUnit, setIsSavingUnit] = useState(false);

  useEffect(() => {
    if (activeStoreId && typeof activeStoreId === 'number') {
      loadCategories();
      loadBrands();
      loadUnits();
    }
  }, [activeStoreId]);

  const loadCategories = async () => {
    if (!activeStoreId || typeof activeStoreId !== 'number') {
      toast.error('Store ID tidak valid');
      return;
    }
    
    try {
      setIsLoadingCategories(true);
      const data = await getAllCategories(activeStoreId);
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Gagal memuat kategori');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const loadBrands = async () => {
    if (!activeStoreId || typeof activeStoreId !== 'number') {
      toast.error('Store ID tidak valid');
      return;
    }
    
    try {
      setIsLoadingBrands(true);
      const data = await getAllBrands(activeStoreId);
      setBrands(data);
    } catch (error) {
      console.error('Error loading brands:', error);
      toast.error('Gagal memuat brand');
    } finally {
      setIsLoadingBrands(false);
    }
  };

  const loadUnits = async () => {
    if (!activeStoreId || typeof activeStoreId !== 'number') {
      toast.error('Store ID tidak valid');
      return;
    }
    
    try {
      setIsLoadingUnits(true);
      const data = await getAllUnits(activeStoreId);
      setUnits(data);
    } catch (error) {
      console.error('Error loading units:', error);
      toast.error('Gagal memuat satuan');
    } finally {
      setIsLoadingUnits(false);
    }
  };

  // Filtered data
  const filteredCategories = useMemo(() => {
    if (!categorySearch) return categories;
    return categories.filter(c => 
      c.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categories, categorySearch]);

  const filteredBrands = useMemo(() => {
    if (!brandSearch) return brands;
    return brands.filter(b => 
      b.name.toLowerCase().includes(brandSearch.toLowerCase())
    );
  }, [brands, brandSearch]);

  const filteredUnits = useMemo(() => {
    if (!unitSearch) return units;
    return units.filter(u => 
      u.name.toLowerCase().includes(unitSearch.toLowerCase())
    );
  }, [units, unitSearch]);

  // Category handlers
  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
    setShowCategoryForm(true);
  };

  const openEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setShowCategoryForm(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast.error('Nama kategori wajib diisi');
      return;
    }

    setIsSavingCategory(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: categoryName,
          description: categoryDescription || undefined,
        });
        toast.success('Kategori berhasil diperbarui');
      } else {
        await createCategory({
          store_id: activeStoreId,
          name: categoryName,
          description: categoryDescription || undefined,
        });
        toast.success('Kategori berhasil ditambahkan');
      }
      setShowCategoryForm(false);
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Gagal menyimpan kategori');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryTarget) return;

    try {
      await deleteCategory(deleteCategoryTarget.id);
      toast.success('Kategori berhasil dihapus');
      setDeleteCategoryTarget(null);
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Gagal menghapus kategori');
    }
  };

  // Brand handlers
  const openAddBrand = () => {
    setEditingBrand(null);
    setBrandName('');
    setBrandDescription('');
    setShowBrandForm(true);
  };

  const openEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    setBrandName(brand.name);
    setBrandDescription(brand.description || '');
    setShowBrandForm(true);
  };

  const handleSaveBrand = async () => {
    if (!brandName.trim()) {
      toast.error('Nama brand wajib diisi');
      return;
    }

    setIsSavingBrand(true);
    try {
      if (editingBrand) {
        await updateBrand(editingBrand.id, {
          name: brandName,
          description: brandDescription || undefined,
        });
        toast.success('Brand berhasil diperbarui');
      } else {
        await createBrand({
          store_id: activeStoreId,
          name: brandName,
          description: brandDescription || undefined,
        });
        toast.success('Brand berhasil ditambahkan');
      }
      setShowBrandForm(false);
      loadBrands();
    } catch (error: any) {
      console.error('Error saving brand:', error);
      if (error.message?.includes('duplicate') || error.code === '23505') {
        toast.error('Nama brand sudah digunakan');
      } else {
        toast.error('Gagal menyimpan brand');
      }
    } finally {
      setIsSavingBrand(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!deleteBrandTarget) return;

    try {
      await deleteBrand(deleteBrandTarget.id);
      toast.success('Brand berhasil dihapus');
      setDeleteBrandTarget(null);
      loadBrands();
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast.error('Gagal menghapus brand');
    }
  };

  // Unit handlers
  const openAddUnit = () => {
    setEditingUnit(null);
    setUnitName('');
    setUnitDescription('');
    setShowUnitForm(true);
  };

  const openEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitName(unit.name);
    setUnitDescription(unit.description || '');
    setShowUnitForm(true);
  };

  const handleSaveUnit = async () => {
    if (!unitName.trim()) {
      toast.error('Nama satuan wajib diisi');
      return;
    }

    setIsSavingUnit(true);
    try {
      if (editingUnit) {
        await updateUnit(editingUnit.id, {
          name: unitName,
          description: unitDescription || undefined,
        });
        toast.success('Satuan berhasil diperbarui');
      } else {
        await createUnit({
          store_id: activeStoreId,
          name: unitName,
          description: unitDescription || undefined,
        });
        toast.success('Satuan berhasil ditambahkan');
      }
      setShowUnitForm(false);
      loadUnits();
    } catch (error: any) {
      console.error('Error saving unit:', error);
      if (error.message?.includes('duplicate') || error.code === '23505') {
        toast.error('Nama satuan sudah digunakan');
      } else {
        toast.error('Gagal menyimpan satuan');
      }
    } finally {
      setIsSavingUnit(false);
    }
  };

  const handleDeleteUnit = async () => {
    if (!deleteUnitTarget) return;

    try {
      await deleteUnit(deleteUnitTarget.id);
      toast.success('Satuan berhasil dihapus');
      setDeleteUnitTarget(null);
      loadUnits();
    } catch (error) {
      console.error('Error deleting unit:', error);
      toast.error('Gagal menghapus satuan. Mungkin masih digunakan oleh produk.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Klasifikasi Produk</h1>
        <p className="text-muted-foreground mt-1">
          Kelola kategori, brand, dan satuan produk
        </p>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="w-4 h-4" />
            Kategori
          </TabsTrigger>
          <TabsTrigger value="brands" className="gap-2">
            <Package className="w-4 h-4" />
            Brand
          </TabsTrigger>
          <TabsTrigger value="units" className="gap-2">
            <Ruler className="w-4 h-4" />
            Satuan
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: KATEGORI */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari kategori..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={openAddCategory} className="gap-2">
              <Plus className="w-4 h-4" />
              Tambah Kategori
            </Button>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Kategori</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingCategories ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Memuat kategori...
                    </TableCell>
                  </TableRow>
                ) : filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      {categorySearch ? 'Kategori tidak ditemukan' : 'Belum ada kategori'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {category.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditCategory(category)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteCategoryTarget(category)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 2: BRAND */}
        <TabsContent value="brands" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari brand..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={openAddBrand} className="gap-2">
              <Plus className="w-4 h-4" />
              Tambah Brand
            </Button>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Brand</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingBrands ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Memuat brand...
                    </TableCell>
                  </TableRow>
                ) : filteredBrands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      {brandSearch ? 'Brand tidak ditemukan' : 'Belum ada brand'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBrands.map((brand) => (
                    <TableRow key={brand.id}>
                      <TableCell className="font-medium">{brand.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {brand.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditBrand(brand)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteBrandTarget(brand)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 3: SATUAN */}
        <TabsContent value="units" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari satuan..."
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={openAddUnit} className="gap-2">
              <Plus className="w-4 h-4" />
              Tambah Satuan
            </Button>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Satuan</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingUnits ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Memuat satuan...
                    </TableCell>
                  </TableRow>
                ) : filteredUnits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      {unitSearch ? 'Satuan tidak ditemukan' : 'Belum ada satuan'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUnits.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {unit.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditUnit(unit)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteUnitTarget(unit)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Category Form Dialog */}
      <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Nama Kategori <span className="text-destructive">*</span>
              </Label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Contoh: Elektronik"
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="Deskripsi kategori"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={isSavingCategory}>
                Batal
              </Button>
            </DialogClose>
            <Button onClick={handleSaveCategory} disabled={isSavingCategory}>
              {isSavingCategory
                ? 'Menyimpan...'
                : editingCategory
                ? 'Simpan'
                : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Brand Form Dialog */}
      <Dialog open={showBrandForm} onOpenChange={setShowBrandForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBrand ? 'Edit Brand' : 'Tambah Brand Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Nama Brand <span className="text-destructive">*</span>
              </Label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Contoh: Samsung"
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea
                value={brandDescription}
                onChange={(e) => setBrandDescription(e.target.value)}
                placeholder="Deskripsi brand"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={isSavingBrand}>
                Batal
              </Button>
            </DialogClose>
            <Button onClick={handleSaveBrand} disabled={isSavingBrand}>
              {isSavingBrand ? 'Menyimpan...' : editingBrand ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit Form Dialog */}
      <Dialog open={showUnitForm} onOpenChange={setShowUnitForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Edit Satuan' : 'Tambah Satuan Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Nama Satuan <span className="text-destructive">*</span>
              </Label>
              <Input
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="Contoh: Pcs, Kg, Liter"
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea
                value={unitDescription}
                onChange={(e) => setUnitDescription(e.target.value)}
                placeholder="Contoh: Pieces / Satuan"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={isSavingUnit}>
                Batal
              </Button>
            </DialogClose>
            <Button onClick={handleSaveUnit} disabled={isSavingUnit}>
              {isSavingUnit ? 'Menyimpan...' : editingUnit ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <AlertDialog
        open={!!deleteCategoryTarget}
        onOpenChange={(o) => !o && setDeleteCategoryTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori?</AlertDialogTitle>
            <AlertDialogDescription>
              Kategori <strong>"{deleteCategoryTarget?.name}"</strong> akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Brand Confirmation */}
      <AlertDialog
        open={!!deleteBrandTarget}
        onOpenChange={(o) => !o && setDeleteBrandTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Brand?</AlertDialogTitle>
            <AlertDialogDescription>
              Brand <strong>"{deleteBrandTarget?.name}"</strong> akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBrand}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Unit Confirmation */}
      <AlertDialog
        open={!!deleteUnitTarget}
        onOpenChange={(o) => !o && setDeleteUnitTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Satuan?</AlertDialogTitle>
            <AlertDialogDescription>
              Satuan <strong>"{deleteUnitTarget?.name}"</strong> akan dihapus. Produk yang
              menggunakan satuan ini akan kehilangan relasinya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUnit}
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
