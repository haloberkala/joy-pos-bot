import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Save, X, Loader2, ChevronDown } from "lucide-react";
import { bulkCreateProducts, CreateProductInput } from "@/services/productsService";
import { getAllCategories, getOrCreateCategory } from "@/services/categoriesService";
import { getAllBrands, getOrCreateBrand } from "@/services/brandsService";
import { getAllUnits, getOrCreateUnit } from "@/services/unitsService";

interface MasterItem { id: number; name: string; }

interface RowData {
  id: string;
  category_id: number | null;
  brand_id: number | null;
  unit_id: number | null;
  name: string;
  code: string;
  quantity: string;
  min_stock_alert: string;
  cost_price: string;
  selling_price_special: string;
  selling_price_wholesale: string;
  selling_price_retail: string;
  wholesale_min_qty: string;
  special_min_qty: string;
}

interface RowErrors {
  name?: boolean;
  cost_price?: boolean;
  selling_price_retail?: boolean;
}

interface BulkProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: number;
  onProductsAdded?: () => void;
}

// ─── QuickAdd: rendered via portal to escape Dialog focus trap ───────────────
function QuickAddModal({
  type, onClose, onSaved, storeId,
}: {
  type: "category" | "brand" | "unit";
  onClose: () => void;
  onSaved: (item: MasterItem) => void;
  storeId: number;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const labels: Record<string, string> = { category: "Kategori", brand: "Brand", unit: "Satuan" };

  useEffect(() => {
    // Use rAF to ensure portal is mounted before focusing
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleSave = async () => {
    if (!name.trim()) { toast.error(`Nama ${labels[type]} tidak boleh kosong`); return; }
    setSaving(true);
    try {
      let item: MasterItem;
      if (type === "category") item = await getOrCreateCategory(name.trim(), storeId);
      else if (type === "brand") item = await getOrCreateBrand(name.trim(), storeId);
      else item = await getOrCreateUnit(name.trim(), storeId);
      toast.success(`${labels[type]} "${item.name}" berhasil ditambahkan`);
      onSaved(item);
      onClose();
    } catch (e: any) {
      toast.error(e.message || `Gagal menambahkan ${labels[type]}`);
    } finally { setSaving(false); }
  };

  const content = (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 9999 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white border border-border rounded-xl shadow-2xl p-5 w-80"
        style={{ zIndex: 10000 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-foreground">Tambah {labels[type]} Baru</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Nama ${labels[type]}...`}
          className="mb-3 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); handleSave(); }
            if (e.key === "Escape") onClose();
          }}
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={onClose} disabled={saving}>Batal</Button>
          <Button size="sm" className="flex-1 text-xs" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Simpan"}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ─── MasterDropdown ──────────────────────────────────────────────────────────
function MasterDropdown({
  items, value, onChange, placeholder, onRequestAdd,
}: {
  items: MasterItem[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder: string;
  onRequestAdd: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = items.find((i) => i.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        className="w-full flex items-center justify-between px-2 py-1 text-xs bg-transparent border-0 rounded hover:bg-muted/50 transition-colors min-h-[28px] gap-1"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? "text-foreground truncate" : "text-muted-foreground truncate"}>
          {selected?.name || placeholder}
        </span>
        <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-44 bg-popover border border-border rounded-lg shadow-xl overflow-hidden" style={{ zIndex: 200 }}>
          <div className="max-h-44 overflow-y-auto">
            <button
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 text-muted-foreground italic"
              onClick={() => { onChange(null); setOpen(false); }}
            >
              — Kosong —
            </button>
            {items.map((item) => (
              <button
                key={item.id}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-primary/10 transition-colors ${value === item.id ? "bg-primary/10 text-primary font-medium" : "text-foreground"}`}
                onClick={() => { onChange(item.id); setOpen(false); }}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className="border-t border-border">
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-primary hover:bg-primary/10 flex items-center gap-1 font-medium transition-colors"
              onClick={() => { setOpen(false); onRequestAdd(); }}
            >
              <Plus className="w-3 h-3" /> Tambah Baru
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CellInput with barcode scanner support ──────────────────────────────────
function CellInput({
  value, onChange, placeholder, type = "text", hasError, className = "",
  onScanComplete, // called when barcode scanner sends Enter/Tab
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hasError?: boolean;
  className?: string;
  onScanComplete?: () => void;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={(e) => {
        if (onScanComplete && (e.key === "Enter" || e.key === "Tab") && value.trim()) {
          e.preventDefault();
          onScanComplete();
        }
      }}
      className={`w-full px-2 py-1 text-xs bg-transparent border-0 rounded outline-none focus:ring-1 min-h-[28px] placeholder:text-muted-foreground/50 transition-all ${
        hasError
          ? "ring-1 ring-destructive bg-red-50/50 focus:ring-destructive"
          : "hover:bg-muted/40 focus:ring-primary/40 focus:bg-white"
      } ${className}`}
    />
  );
}

const createRow = (): RowData => ({
  id: crypto.randomUUID(),
  category_id: null, brand_id: null, unit_id: null,
  name: "", code: "", quantity: "", min_stock_alert: "",
  cost_price: "", selling_price_special: "", selling_price_wholesale: "", selling_price_retail: "",
  wholesale_min_qty: "0", special_min_qty: "0",
});

// ─── Main ────────────────────────────────────────────────────────────────────
export function BulkProductModal({ isOpen, onClose, storeId, onProductsAdded }: BulkProductModalProps) {
  const [rows, setRows] = useState<RowData[]>([createRow(), createRow(), createRow()]);
  const [errors, setErrors] = useState<Record<string, RowErrors>>({});
  const [categories, setCategories] = useState<MasterItem[]>([]);
  const [brands, setBrands] = useState<MasterItem[]>([]);
  const [units, setUnits] = useState<MasterItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [quickAdd, setQuickAdd] = useState<{
    type: "category" | "brand" | "unit";
    rowId: string;
    field: "category_id" | "brand_id" | "unit_id";
  } | null>(null);

  // refs to name inputs per row for barcode scanner focus jump
  const nameInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadMaster = useCallback(async () => {
    try {
      const [cats, brs, uns] = await Promise.all([
        getAllCategories(storeId),
        getAllBrands(storeId),
        getAllUnits(storeId),
      ]);
      setCategories(cats); setBrands(brs); setUnits(uns);
    } catch (e) { console.error("Error loading master data:", e); }
  }, [storeId]);

  useEffect(() => {
    if (isOpen) { loadMaster(); setRows([createRow(), createRow(), createRow()]); setErrors({}); }
  }, [isOpen, loadMaster]);

  const updateRow = (rowId: string, field: keyof RowData, value: any) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)));
    if (field === "name" || field === "cost_price" || field === "selling_price_retail") {
      setErrors((prev) => {
        const rowErr = { ...(prev[rowId] || {}) };
        delete rowErr[field as keyof RowErrors];
        return { ...prev, [rowId]: rowErr };
      });
    }
  };

  const addRow = () => setRows((prev) => [...prev, createRow()]);

  const removeRow = (rowId: string) => {
    if (rows.length <= 1) { toast.error("Minimal harus ada 1 baris"); return; }
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    setErrors((prev) => { const next = { ...prev }; delete next[rowId]; return next; });
  };

  const handleSaveAll = async () => {
    const filledRows = rows.filter((r) => r.name.trim() || r.code.trim() || r.cost_price || r.selling_price_retail);
    if (filledRows.length === 0) { toast.error("Tidak ada data produk yang diisi"); return; }

    const newErrors: Record<string, RowErrors> = {};
    let hasError = false;
    for (const row of filledRows) {
      const rowErr: RowErrors = {};
      if (!row.name.trim()) { rowErr.name = true; hasError = true; }
      const cost = parseFloat(row.cost_price);
      if (!row.cost_price || isNaN(cost) || cost <= 0) { rowErr.cost_price = true; hasError = true; }
      const retail = parseFloat(row.selling_price_retail);
      if (!row.selling_price_retail || isNaN(retail) || retail <= 0) { rowErr.selling_price_retail = true; hasError = true; }
      if (Object.keys(rowErr).length > 0) newErrors[row.id] = rowErr;
    }
    if (hasError) { setErrors(newErrors); toast.error("Perbaiki data yang ditandai merah terlebih dahulu"); return; }

    setIsSaving(true);
    try {
      const products: CreateProductInput[] = filledRows.map((r) => {
        const cost = parseFloat(r.cost_price) || 0;
        const retail = parseFloat(r.selling_price_retail) || 0;
        return {
          store_id: storeId,
          code: r.code.trim() || `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: r.name.trim(),
          category_id: r.category_id || undefined,
          brand_id: r.brand_id || undefined,
          unit_id: r.unit_id || undefined,
          quantity: parseInt(r.quantity) || 0,
          min_stock_alert: parseInt(r.min_stock_alert) || 5,
          cost_price: cost,
          selling_price_retail: retail,
          selling_price_wholesale: parseFloat(r.selling_price_wholesale) || retail,
          wholesale_min_qty: parseInt(r.wholesale_min_qty) || 0,
          selling_price_special: parseFloat(r.selling_price_special) || retail,
          special_min_qty: parseInt(r.special_min_qty) || 0,
        };
      });

      const result = await bulkCreateProducts(products);
      if (result.success > 0) { toast.success(`${result.success} produk berhasil disimpan`); onProductsAdded?.(); }
      if (result.errors.length > 0) toast.error(`${result.errors.length} produk gagal: ${result.errors[0]}`);
      if (result.success > 0 && result.errors.length === 0) onClose();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan produk");
    } finally { setIsSaving(false); }
  };

  const filledCount = rows.filter((r) => r.name.trim()).length;

  const COLS = [
    { label: "Kategori", width: "w-[110px] min-w-[110px]" },
    { label: "Brand", width: "w-[100px] min-w-[100px]" },
    { label: "Nama Produk", width: "w-[150px] min-w-[150px]" },
    { label: "SKU/Barcode", width: "w-[120px] min-w-[120px]" },
    { label: "Satuan", width: "w-[90px] min-w-[90px]" },
    { label: "Stok Awal", width: "w-[80px] min-w-[80px]" },
    { label: "Stok Min", width: "w-[80px] min-w-[80px]" },
    { label: "Harga Modal", width: "w-[110px] min-w-[110px]" },
    { label: "Harga Eceran", width: "w-[110px] min-w-[110px]" },
    { label: "Harga Grosir", width: "w-[110px] min-w-[110px]" },
    { label: "Min Qty Grosir", width: "w-[100px] min-w-[100px]" },
    { label: "Harga Spesial", width: "w-[110px] min-w-[110px]" },
    { label: "Min Qty Spesial", width: "w-[100px] min-w-[100px]" },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Custom modal — no Radix focus trap, so QuickAdd portal is fully interactive */}
      {createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 50 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            style={{ zIndex: 50 }}
          />
          {/* Modal panel */}
          <div
            className="relative bg-card flex flex-col rounded-xl shadow-2xl overflow-hidden"
            style={{ zIndex: 51, width: '98vw', maxWidth: '1400px', height: '92vh' }}
          >
            <div className="px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-primary" />
                    </div>
                    Tambah Produk Massal
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Isi data produk langsung di tabel. Scan barcode di kolom SKU → kursor otomatis pindah ke Nama Produk.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {filledCount > 0 && (
                    <span className="text-xs text-muted-foreground bg-muted rounded-full px-3 py-1">
                      {filledCount} produk siap disimpan
                    </span>
                  )}
                  <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving} className="text-xs gap-1.5">
                    <X className="w-3.5 h-3.5" /> Batal
                  </Button>
                  <Button size="sm" onClick={handleSaveAll} disabled={isSaving} className="text-xs gap-1.5 px-4">
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {isSaving ? "Menyimpan..." : "Simpan Semua"}
                  </Button>
                </div>
              </div>
            </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse table-fixed" style={{ minWidth: "1200px" }}>
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                <tr>
                  <th className="w-8 border-b border-r border-border" />
                  {COLS.map((col, i) => (
                    <th key={i} className={`${col.width} px-2 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-r border-border`}>
                      {col.label}
                    </th>
                  ))}
                  <th className="w-10 border-b border-border" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const rowErr = errors[row.id] || {};
                  const isEmpty = !row.name.trim() && !row.code.trim() && !row.cost_price && !row.selling_price_retail;
                  return (
                    <tr
                      key={row.id}
                      className={`group border-b border-border/60 transition-colors ${isEmpty ? "bg-transparent hover:bg-muted/20" : "bg-white hover:bg-blue-50/30"}`}
                    >
                      <td className="w-8 text-center text-[10px] text-muted-foreground/50 border-r border-border/40 py-1 select-none">{idx + 1}</td>

                      {/* Kategori */}
                      <td className="border-r border-border/40 py-0.5 px-0.5">
                        <MasterDropdown items={categories} value={row.category_id}
                          onChange={(id) => updateRow(row.id, "category_id", id)} placeholder="Pilih..."
                          onRequestAdd={() => setQuickAdd({ type: "category", rowId: row.id, field: "category_id" })} />
                      </td>

                      {/* Brand */}
                      <td className="border-r border-border/40 py-0.5 px-0.5">
                        <MasterDropdown items={brands} value={row.brand_id}
                          onChange={(id) => updateRow(row.id, "brand_id", id)} placeholder="Pilih..."
                          onRequestAdd={() => setQuickAdd({ type: "brand", rowId: row.id, field: "brand_id" })} />
                      </td>

                      {/* Nama Produk */}
                      <td className="border-r border-border/40 py-0.5 px-0.5">
                        <input
                          ref={(el) => { nameInputRefs.current[row.id] = el; }}
                          type="text"
                          value={row.name}
                          onChange={(e) => updateRow(row.id, "name", e.target.value)}
                          placeholder="Nama produk..."
                          className={`w-full px-2 py-1 text-xs bg-transparent border-0 rounded outline-none focus:ring-1 min-h-[28px] placeholder:text-muted-foreground/50 transition-all ${rowErr.name ? "ring-1 ring-destructive bg-red-50/50 focus:ring-destructive" : "hover:bg-muted/40 focus:ring-primary/40 focus:bg-white"}`}
                        />
                      </td>

                      {/* SKU/Barcode — barcode scanner aware */}
                      <td className="border-r border-border/40 py-0.5 px-0.5">
                        <CellInput
                          value={row.code}
                          onChange={(v) => updateRow(row.id, "code", v)}
                          placeholder="Scan / ketik..."
                          onScanComplete={() => {
                            // Move focus to Nama Produk of same row
                            nameInputRefs.current[row.id]?.focus();
                          }}
                        />
                      </td>

                      {/* Satuan */}
                      <td className="border-r border-border/40 py-0.5 px-0.5">
                        <MasterDropdown items={units} value={row.unit_id}
                          onChange={(id) => updateRow(row.id, "unit_id", id)} placeholder="Pilih..."
                          onRequestAdd={() => setQuickAdd({ type: "unit", rowId: row.id, field: "unit_id" })} />
                      </td>

                      {/* Stok Awal */}
                      <td className="border-r border-border/40 py-0.5 px-0.5">
                        <CellInput value={row.quantity} onChange={(v) => updateRow(row.id, "quantity", v)} placeholder="0" type="number" />
                      </td>

                      {/* Stok Min */}
                      <td className="border-r border-border/40 py-0.5 px-0.5">
                        <CellInput value={row.min_stock_alert} onChange={(v) => updateRow(row.id, "min_stock_alert", v)} placeholder="5" type="number" />
                      </td>

                      {/* Harga Modal */}
                      <td className="border-r border-border/40 py-0.5 px-0.5">
                        <CellInput value={row.cost_price} onChange={(v) => updateRow(row.id, "cost_price", v)} placeholder="0" type="number" hasError={!!rowErr.cost_price} />
                      </td>

                      {/* Harga Eceran */}
                      <td className="border-r border-border/40 py-0.5 px-0.5">
                        <CellInput value={row.selling_price_retail} onChange={(v) => updateRow(row.id, "selling_price_retail", v)} placeholder="0" type="number" hasError={!!rowErr.selling_price_retail} />
                      </td>

                      {/* Harga Grosir */}
                      <td className="border-r border-border/40 py-0.5 px-0.5">
                        <CellInput value={row.selling_price_wholesale} onChange={(v) => updateRow(row.id, "selling_price_wholesale", v)} placeholder="0" type="number" />
                      </td>

                      {/* Min Qty Grosir */}
                      <td className="border-r border-border/40 py-0.5 px-0.5">
                        <CellInput value={row.wholesale_min_qty} onChange={(v) => updateRow(row.id, "wholesale_min_qty", v)} placeholder="0" type="number" />
                      </td>

                      {/* Harga Spesial */}
                      <td className="border-r border-border/40 py-0.5 px-0.5">
                        <CellInput value={row.selling_price_special} onChange={(v) => updateRow(row.id, "selling_price_special", v)} placeholder="0" type="number" />
                      </td>

                      {/* Min Qty Spesial */}
                      <td className="border-r border-border/40 py-0.5 px-0.5">
                        <CellInput value={row.special_min_qty} onChange={(v) => updateRow(row.id, "special_min_qty", v)} placeholder="0" type="number" />
                      </td>

                      {/* Delete */}
                      <td className="w-10 py-0.5 text-center">
                        <button
                          onClick={() => removeRow(row.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                <tr>
                  <td colSpan={15} className="px-4 py-3">
                    <button
                      onClick={addRow}
                      className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors group"
                    >
                      <span className="w-5 h-5 rounded border-2 border-primary/40 group-hover:border-primary flex items-center justify-center transition-colors">
                        <Plus className="w-3 h-3" />
                      </span>
                      Tambah Baris
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 border-t border-border bg-muted/30 flex-shrink-0">
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-destructive bg-red-50 inline-block" />
                Kolom wajib: Nama Produk, Harga Modal, Harga Eceran
              </span>
              <span>• Kolom lain opsional</span>
              <span>• SKU kosong → auto-generate</span>
              <span>• Scan barcode → Enter/Tab untuk lanjut ke Nama Produk</span>
            </div>
          </div>
          </div>
        </div>,
        document.body
      )}

      {/* QuickAdd rendered via portal — escapes Dialog focus trap */}
      {quickAdd && (
        <QuickAddModal
          type={quickAdd.type}
          storeId={storeId}
          onClose={() => setQuickAdd(null)}
          onSaved={(item) => {
            if (quickAdd.type === "category") setCategories((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
            else if (quickAdd.type === "brand") setBrands((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
            else setUnits((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
            updateRow(quickAdd.rowId, quickAdd.field, item.id);
          }}
        />
      )}
    </>
  );
}
