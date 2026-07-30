import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/services/categoriesService';
import {
  getAllBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from '@/services/brandsService';
import {
  getAllUnits,
  createUnit,
  updateUnit,
  deleteUnit,
} from '@/services/unitsService';
import {
  getMainProducts,
  getOrCreateMainProduct,
  getVariants,
  getOrCreateVariant,
  getSpecifications,
  getOrCreateSpecification,
  getSizes,
  getOrCreateSize,
  updateMasterData,
  deleteMasterData,
} from '@/services/productMasterService';
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
import { Plus, Pencil, Trash2, Tag, Package, Ruler, Search, Box, Layers, Settings2, Maximize } from 'lucide-react';

interface Entity {
  id: number;
  name: string;
  short_name?: string | null;
  description?: string | null;
  store_id: number;
}

type EntityType = 'category' | 'brand' | 'main_product' | 'variant' | 'specification' | 'size' | 'unit';

export default function ProductClassification() {
  const { activeStoreId } = useAuth();
  
  const [activeTab, setActiveTab] = useState<EntityType>('category');
  
  // Data State
  const [data, setData] = useState<Record<EntityType, Entity[]>>({
    category: [], brand: [], main_product: [], variant: [], specification: [], size: [], unit: []
  });
  const [isLoading, setIsLoading] = useState<Record<EntityType, boolean>>({
    category: true, brand: true, main_product: true, variant: true, specification: true, size: true, unit: true
  });
  
  // Search State
  const [search, setSearch] = useState<Record<EntityType, string>>({
    category: '', brand: '', main_product: '', variant: '', specification: '', size: '', unit: ''
  });

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Entity | null>(null);
  const [formName, setFormName] = useState('');
  const [formShortName, setFormShortName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Entity | null>(null);

  const CONFIG: Record<EntityType, {
    label: string;
    hasDescription: boolean;
    icon: any;
    get: (storeId: number) => Promise<any[]>;
    create: (data: any, storeId: number) => Promise<any>;
    update: (id: number, data: any) => Promise<any>;
    delete: (id: number) => Promise<any>;
  }> = useMemo(() => ({
    category: {
      label: 'Kategori', hasDescription: true, icon: Tag,
      get: getAllCategories,
      create: (d, storeId) => createCategory({ store_id: storeId, name: d.name, description: d.description }),
      update: (id, d) => updateCategory(id, { name: d.name, short_name: d.short_name, description: d.description }),
      delete: deleteCategory
    },
    brand: {
      label: 'Brand', hasDescription: true, icon: Package,
      get: getAllBrands,
      create: (d, storeId) => createBrand({ store_id: storeId, name: d.name, description: d.description }),
      update: (id, d) => updateBrand(id, { name: d.name, short_name: d.short_name, description: d.description }),
      delete: deleteBrand
    },
    main_product: {
      label: 'Produk Utama', hasDescription: false, icon: Box,
      get: getMainProducts,
      create: (d, storeId) => getOrCreateMainProduct(d.name, storeId),
      update: (id, d) => updateMasterData('main_products', id, d.name, d.short_name),
      delete: (id) => deleteMasterData('main_products', id)
    },
    variant: {
      label: 'Varian', hasDescription: false, icon: Layers,
      get: getVariants,
      create: (d, storeId) => getOrCreateVariant(d.name, storeId),
      update: (id, d) => updateMasterData('variants', id, d.name, d.short_name),
      delete: (id) => deleteMasterData('variants', id)
    },
    specification: {
      label: 'Spesifikasi', hasDescription: false, icon: Settings2,
      get: getSpecifications,
      create: (d, storeId) => getOrCreateSpecification(d.name, storeId),
      update: (id, d) => updateMasterData('specifications', id, d.name, d.short_name),
      delete: (id) => deleteMasterData('specifications', id)
    },
    size: {
      label: 'Ukuran/Isi', hasDescription: false, icon: Maximize,
      get: getSizes,
      create: (d, storeId) => getOrCreateSize(d.name, storeId),
      update: (id, d) => updateMasterData('sizes', id, d.name, d.short_name),
      delete: (id) => deleteMasterData('sizes', id)
    },
    unit: {
      label: 'Satuan', hasDescription: true, icon: Ruler,
      get: getAllUnits,
      create: (d, storeId) => createUnit({ store_id: storeId, name: d.name, description: d.description }),
      update: (id, d) => updateUnit(id, { name: d.name, short_name: d.short_name, description: d.description }),
      delete: deleteUnit
    }
  }), []);

  const loadData = async (type: EntityType) => {
    if (!activeStoreId) return;
    setIsLoading(prev => ({ ...prev, [type]: true }));
    try {
      const res = await CONFIG[type].get(activeStoreId);
      setData(prev => ({ ...prev, [type]: res }));
    } catch (error) {
      console.error(`Error loading ${type}:`, error);
      toast.error(`Gagal memuat ${CONFIG[type].label}`);
    } finally {
      setIsLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  useEffect(() => {
    if (activeStoreId) {
      (Object.keys(CONFIG) as EntityType[]).forEach(type => {
        loadData(type);
      });
    }
  }, [activeStoreId]);

  const openAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormShortName('');
    setFormDescription('');
    setShowForm(true);
  };

  const openEdit = (item: Entity) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormShortName(item.short_name || '');
    setFormDescription(item.description || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error(`Nama ${CONFIG[activeTab].label} wajib diisi`);
      return;
    }
    
    if (editingItem && !formShortName.trim()) {
      toast.error(`Short Name wajib diisi`);
      return;
    }
    
    setIsSaving(true);
    try {
      const dataToSave: any = { 
        name: formName,
        description: formDescription || null 
      };
      
      if (editingItem) {
        dataToSave.short_name = formShortName || null;
      }
      
      if (editingItem) {
        await CONFIG[activeTab].update(editingItem.id, dataToSave);
        toast.success(`${CONFIG[activeTab].label} berhasil diperbarui`);
      } else {
        await CONFIG[activeTab].create(dataToSave, activeStoreId!);
        toast.success(`${CONFIG[activeTab].label} berhasil ditambahkan`);
      }
      setShowForm(false);
      loadData(activeTab);
    } catch (error: any) {
      console.error('Error saving:', error);
      if (error.message?.includes('duplicate') || error.code === '23505') {
        toast.error(`Nama ${CONFIG[activeTab].label} sudah digunakan`);
      } else {
        toast.error(`Gagal menyimpan ${CONFIG[activeTab].label}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CONFIG[activeTab].delete(deleteTarget.id);
      toast.success(`${CONFIG[activeTab].label} berhasil dihapus`);
      setDeleteTarget(null);
      loadData(activeTab);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error(`Gagal menghapus ${CONFIG[activeTab].label}. Mungkin masih digunakan.`);
    }
  };

  const currentData = data[activeTab] || [];
  const currentSearch = search[activeTab] || '';
  const filteredData = currentData.filter(item => item.name.toLowerCase().includes(currentSearch.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Klasifikasi Produk</h1>
        <p className="text-muted-foreground mt-1">
          Kelola kategori, brand, atribut, dan satuan produk
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as EntityType)} className="space-y-4">
        <div className="overflow-x-auto pb-2">
          <TabsList className="flex w-max min-w-full justify-start space-x-1 p-1">
            {(Object.entries(CONFIG) as [EntityType, typeof CONFIG[EntityType]][]).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <TabsTrigger key={key} value={key} className="gap-2 shrink-0">
                  <Icon className="w-4 h-4" />
                  {config.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="space-y-4 mt-0">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={`Cari ${CONFIG[activeTab].label.toLowerCase()}...`}
                value={search[activeTab]}
                onChange={(e) => setSearch(prev => ({ ...prev, [activeTab]: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Button onClick={openAdd} className="gap-2">
              <Plus className="w-4 h-4" />
              Tambah {CONFIG[activeTab].label}
            </Button>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama {CONFIG[activeTab].label}</TableHead>
                  <TableHead>Short Name</TableHead>
                  {CONFIG[activeTab].hasDescription && <TableHead>Deskripsi</TableHead>}
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading[activeTab] ? (
                  <TableRow>
                    <TableCell colSpan={CONFIG[activeTab].hasDescription ? 4 : 3} className="text-center py-8 text-muted-foreground">
                      Memuat {CONFIG[activeTab].label.toLowerCase()}...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={CONFIG[activeTab].hasDescription ? 4 : 3} className="text-center py-8 text-muted-foreground">
                      {search[activeTab] ? `${CONFIG[activeTab].label} tidak ditemukan` : `Belum ada ${CONFIG[activeTab].label.toLowerCase()}`}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        {item.short_name ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                            {item.short_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      {CONFIG[activeTab].hasDescription && (
                        <TableCell className="text-muted-foreground">
                          {item.description || '-'}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteTarget(item)}
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? `Edit ${CONFIG[activeTab].label}` : `Tambah ${CONFIG[activeTab].label} Baru`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Nama {CONFIG[activeTab].label} <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={`Contoh: ${CONFIG[activeTab].label === 'Kategori' ? 'Elektronik' : CONFIG[activeTab].label === 'Brand' ? 'Samsung' : 'Isi nama'}`}
              />
            </div>
            {editingItem && (
              <div className="space-y-2">
                <Label>
                  Short Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formShortName}
                  onChange={(e) => setFormShortName(e.target.value)}
                  placeholder="Short name"
                />
              </div>
            )}
            {CONFIG[activeTab].hasDescription && (
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={`Deskripsi ${CONFIG[activeTab].label.toLowerCase()}`}
                  rows={3}
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
              {isSaving
                ? 'Menyimpan...'
                : editingItem
                ? 'Simpan'
                : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {CONFIG[activeTab].label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {CONFIG[activeTab].label} <strong>"{deleteTarget?.name}"</strong> akan dihapus.
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
