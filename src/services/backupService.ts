import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// xlsx max cell text = 32767 chars
const XLSX_MAX = 32767;

function sanitizeRows(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.map(row => {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === 'string' && v.length > XLSX_MAX) {
        clean[k] = v.slice(0, XLSX_MAX - 3) + '...';
      } else {
        clean[k] = v;
      }
    }
    return clean;
  });
}

function autoFit(ws: XLSX.WorkSheet, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  ws['!cols'] = keys.map(k => ({
    wch: Math.min(60, Math.max(k.length + 2, ...rows.map(r => String(r[k] ?? '').length))),
  }));
}

function toSheet(rows: Record<string, any>[]): XLSX.WorkSheet {
  const safe = sanitizeRows(rows.length ? rows : [{}]);
  const ws = XLSX.utils.json_to_sheet(safe);
  autoFit(ws, safe);
  return ws;
}

async function fetchAll(table: string, storeId?: number, extraFilter?: (q: any) => any) {
  let q = supabase.from(table).select('*');
  if (storeId) q = q.eq('store_id', storeId);
  if (extraFilter) q = extraFilter(q);
  const { data, error } = await q;
  if (error) throw new Error(`Gagal fetch ${table}: ${error.message}`);
  return data || [];
}

// Remove sensitive columns before export
function stripSensitive(rows: any[], keys: string[]): any[] {
  return rows.map(r => {
    const copy = { ...r };
    keys.forEach(k => delete copy[k]);
    return copy;
  });
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export async function exportFullDatabase(storeId: number, storeName: string): Promise<void> {
  const wb = XLSX.utils.book_new();

  const append = (name: string, rows: any[]) => {
    XLSX.utils.book_append_sheet(wb, toSheet(rows), name);
  };

  // ── Step 1: Store & Settings ──────────────────────────────────────────────
  const [stores, attendanceSettings] = await Promise.all([
    fetchAll('stores'),
    fetchAll('attendance_settings', storeId),
  ]);
  append('stores', stores);
  append('attendance_settings', attendanceSettings);

  // ── Step 2: Master Reference Tables ───────────────────────────────────────
  const [categories, brands, units, expenseCategories,
         mainProducts, variants, specifications, sizes] = await Promise.all([
    fetchAll('categories', storeId),
    fetchAll('brands', storeId),
    fetchAll('units', storeId),
    fetchAll('expense_categories'),
    fetchAll('main_products', storeId),
    fetchAll('variants', storeId),
    fetchAll('specifications', storeId),
    fetchAll('sizes', storeId),
  ]);
  append('categories', categories);
  append('brands', brands);
  append('units', units);
  append('expense_categories', expenseCategories);
  append('main_products', mainProducts);
  append('variants', variants);
  append('specifications', specifications);
  append('sizes', sizes);

  // ── Step 3: Entities (Employees sans password, Customers, Suppliers) ──────
  const [employees, customers, suppliers] = await Promise.all([
    fetchAll('employees', storeId),
    fetchAll('customers', storeId),
    fetchAll('suppliers', storeId),
  ]);
  append('employees', stripSensitive(employees, ['password_hash']));
  append('customers', customers);
  append('suppliers', suppliers);

  // ── Step 4: Products ──────────────────────────────────────────────────────
  const products = await fetchAll('products', storeId);
  append('products', products);

  // ── Step 5: Transaction Headers ───────────────────────────────────────────
  const [sales, purchases, stockOpnames] = await Promise.all([
    fetchAll('sales', storeId),
    fetchAll('purchases', storeId),
    fetchAll('stock_opnames', storeId),
  ]);
  append('sales', sales);
  append('purchases', purchases);
  append('stock_opnames', stockOpnames);
  append('expenses', await fetchAll('expenses', storeId));

  // ── Step 6: Transaction Details ───────────────────────────────────────────
  // sale_items: filter via join
  const saleIds = sales.map((s: any) => s.id);
  const purchaseIds = purchases.map((p: any) => p.id);
  const opnameIds = stockOpnames.map((o: any) => o.id);

  const [saleItems, debtPayments, shipments,
         purchaseItems, supplierPayments, opnameItems] = await Promise.all([
    saleIds.length
      ? supabase.from('sale_items').select('*').in('sale_id', saleIds).then(r => r.data || [])
      : Promise.resolve([]),
    saleIds.length
      ? supabase.from('debt_payments').select('*').in('sale_id', saleIds).then(r => r.data || [])
      : Promise.resolve([]),
    fetchAll('shipments', storeId),
    purchaseIds.length
      ? supabase.from('purchase_items').select('*').in('purchase_id', purchaseIds).then(r => r.data || [])
      : Promise.resolve([]),
    fetchAll('supplier_payments', storeId),
    opnameIds.length
      ? supabase.from('stock_opname_items').select('*').in('opname_id', opnameIds).then(r => r.data || [])
      : Promise.resolve([]),
  ]);
  append('sale_items', saleItems);
  append('debt_payments', debtPayments);
  append('shipments', shipments);
  append('purchase_items', purchaseItems);
  append('supplier_payments', supplierPayments);
  append('stock_opname_items', opnameItems);

  // ── Step 7: HR Data ───────────────────────────────────────────────────────
  const [attendances, payrolls] = await Promise.all([
    fetchAll('attendances', storeId),
    fetchAll('payrolls', storeId),
  ]);
  append('attendances', attendances);
  append('payrolls', payrolls);

  // ── Write file ────────────────────────────────────────────────────────────
  const now = new Date();
  const d = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
  const safe = storeName.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `FullBackup_${safe}_${d}.xlsx`);
}
