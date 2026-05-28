import { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Pencil, Trash2, Tag, Package } from 'lucide-react';

export default function CategoriesBrands() {
  const { activeStoreId, user } = useAuth();
  
  console.log('CategoriesBrands - activeStoreId:', activeStoreId);
  console.log('CategoriesBrands - user:', user);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);

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

  useEffect(() => {
    if (activeStoreId && typeof activeStoreId === 'number') {
      loadCategories();
      loadBrands();
    } else {
      console.warn('activeStoreId is not valid:', activeStoreId);
    }
  }, [activeStoreId]); // Reload when activeStoreId changes

  const loadCategories = async () => {
    if (!activeStoreId || typeof activeStoreId !== 'number') {
      console.error('Invalid activeStoreId:', activeStoreId);
      toast.error('Store ID tidak valid');
      return;
    }
    
    try {
      setIsLoadingCategories(true);
      console.log('Loading categories for store:', activeStoreId);
      const data = await getAllCategories(activeStoreId);
      console.log('Categories loaded:', data);
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
      console.error('Invalid activeStoreId:', activeStoreId);
      toast.error('Store ID tidak valid');
      return;
    }
    
    try {
      setIsLoadingBrands(true);
      console.log('Loading brands for store:', activeStoreId);
      const data = await getAllBrands(activeStoreId);
      console.log('Brands loaded:', data);
      setBrands(data);
    } catch (error) {
      console.error('Error loading brands:', error);
      toast.error('Gagal memuat brand');
    } finally {
      setIsLoadingBrands(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Master Kategori & Brand</h1>
        <p className="text-muted-foreground mt-1">
          Kelola kategori produk dan brand secara independen
        </p>
      </div>

      {/* Split View: Categories (Left) and Brands (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Categories */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Kategori</h2>
            </div>
            <Button onClick={openAddCategory} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategori</TableHead>
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
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Belum ada kategori
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow
                      key={category.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{category.name}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {category.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditCategory(category);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteCategoryTarget(category);
                            }}
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
        </div>

        {/* RIGHT: Brands */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Brand</h2>
            </div>
            <Button onClick={openAddBrand} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
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
                ) : brands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Belum ada brand
                    </TableCell>
                  </TableRow>
                ) : (
                  brands.map((brand) => (
                    <TableRow key={brand.id}>
                      <TableCell>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{brand.name}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
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
        </div>
      </div>

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
              Brand <strong>"{deleteBrandTarget?.name}"</strong> akan dihapus. Produk yang
              menggunakan brand ini akan kehilangan relasinya.
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
    </div>
  );
}
