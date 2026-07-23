import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

// ─── Progress callback type ───────────────────────────────────────────────────
export type RestoreProgressCallback = (step: string, current: number, total: number) => void;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Read a named sheet from workbook → array of plain objects */
function readSheet(wb: XLSX.WorkBook, sheetName: string): Record<string, any>[] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null });
  return rows;
}

/** Clean a row: replace empty string with null, coerce numeric strings */
function cleanRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === '' || v === undefined) {
      out[k] = null;
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Upsert a batch of rows into a Supabase table.
 *  Uses onConflict: 'id' to merge by primary key.
 *  Chunked to avoid request-size limits. */
async function upsertTable(
  tableName: string,
  rows: Record<string, any>[],
  onConflict = 'id',
) {
  if (!rows.length) return;
  const cleaned = rows.map(cleanRow);
  const CHUNK = 200;
  for (let i = 0; i < cleaned.length; i += CHUNK) {
    const chunk = cleaned.slice(i, i + CHUNK);
    const { error } = await (supabase as any)
      .from(tableName)
      .upsert(chunk as any[], { onConflict, ignoreDuplicates: false });
    if (error) {
      throw new Error(`Gagal restore tabel '${tableName}': ${error.message} (detail: ${error.details ?? '-'})`);
    }
  }
}

// ─── Main Restore ─────────────────────────────────────────────────────────────

/**
 * Restores the full database from an Excel backup file.
 * UPSERT order strictly follows the FK hierarchy defined in the schema.
 *
 * ⚠️  Note on GENERATED ALWAYS AS IDENTITY tables (main_products, variants,
 *     specifications, sizes): PostgREST/Supabase may not allow overriding the
 *     identity column.  If that happens, these 4 tables are upserted by
 *     (store_id, name) instead and a warning is logged — product FKs to these
 *     tables will remain valid as long as the same store is restored.
 */
export async function importFullDatabase(
  file: File,
  onProgress?: RestoreProgressCallback,
): Promise<{ success: boolean; warnings: string[] }> {
  const warnings: string[] = [];

  // ── Parse Excel file ─────────────────────────────────────────────────────
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

  const TOTAL_STEPS = 16;
  let step = 0;
  const progress = (label: string) => {
    step++;
    onProgress?.(label, step, TOTAL_STEPS);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 1 — Stores & Settings (no FK dependencies)
  // ────────────────────────────────────────────────────────────────────────────
  progress('Restoring: stores');
  await upsertTable('stores', readSheet(wb, 'stores'));

  progress('Restoring: attendance_settings');
  await upsertTable('attendance_settings', readSheet(wb, 'attendance_settings'));

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 2 — Master Reference Tables (FK → stores only)
  // ────────────────────────────────────────────────────────────────────────────
  progress('Restoring: categories & brands');
  await upsertTable('categories', readSheet(wb, 'categories'));
  await upsertTable('brands',     readSheet(wb, 'brands'));

  progress('Restoring: units & expense_categories');
  await upsertTable('units',             readSheet(wb, 'units'));
  await upsertTable('expense_categories', readSheet(wb, 'expense_categories'));

  // GENERATED ALWAYS AS IDENTITY — try with id; fall back to name-based upsert
  progress('Restoring: main_products, variants, specifications, sizes');
  for (const tbl of ['main_products', 'variants', 'specifications', 'sizes'] as const) {
    const rows = readSheet(wb, tbl);
    if (!rows.length) continue;
    try {
      await upsertTable(tbl, rows);
    } catch {
      // Fallback: upsert by (store_id, name) — IDs won't be restored exactly
      warnings.push(
        `Tabel '${tbl}' menggunakan GENERATED ALWAYS AS IDENTITY. ` +
        `ID original tidak dapat dipulihkan. Data diupsert berdasarkan (store_id, name).`,
      );
      try {
        await upsertTable(tbl, rows.map(r => {
          const { id, ...rest } = r; // eslint-disable-line @typescript-eslint/no-unused-vars
          return rest;
        }), 'store_id,name');
      } catch (e2: any) {
        warnings.push(`Gagal fallback upsert '${tbl}': ${e2.message}`);
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 3 — Entities (FK → stores, employees also FK → stores)
  // ────────────────────────────────────────────────────────────────────────────
  progress('Restoring: employees');
  // employees export intentionally excludes password_hash — skip that col
  await upsertTable('employees', readSheet(wb, 'employees').map(r => {
    const { password_hash, ...rest } = r as any; // eslint-disable-line
    return rest;
  }));

  progress('Restoring: customers');
  await upsertTable('customers', readSheet(wb, 'customers'));

  progress('Restoring: suppliers');
  await upsertTable('suppliers', readSheet(wb, 'suppliers'));

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 4 — Products (FK → stores, categories, brands, units, master tables)
  // ────────────────────────────────────────────────────────────────────────────
  progress('Restoring: products');
  await upsertTable('products', readSheet(wb, 'products'));

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 5 — Transaction Headers (FK → stores, customers, suppliers, products)
  // ────────────────────────────────────────────────────────────────────────────
  progress('Restoring: sales');
  await upsertTable('sales', readSheet(wb, 'sales'), 'id');

  progress('Restoring: purchases & stock_opnames & expenses');
  await upsertTable('purchases',    readSheet(wb, 'purchases'));
  await upsertTable('stock_opnames', readSheet(wb, 'stock_opnames'));
  await upsertTable('expenses',     readSheet(wb, 'expenses'));

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 6 — Transaction Details (FK → headers)
  // ────────────────────────────────────────────────────────────────────────────
  progress('Restoring: sale_items & debt_payments & shipments');
  await upsertTable('sale_items',    readSheet(wb, 'sale_items'));
  await upsertTable('debt_payments', readSheet(wb, 'debt_payments'));
  await upsertTable('shipments',     readSheet(wb, 'shipments'));

  progress('Restoring: purchase_items & supplier_payments & stock_opname_items');
  await upsertTable('purchase_items',     readSheet(wb, 'purchase_items'));
  await upsertTable('supplier_payments',  readSheet(wb, 'supplier_payments'));
  await upsertTable('stock_opname_items', readSheet(wb, 'stock_opname_items'));

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 7 — HR Data (FK → employees, stores)
  // ────────────────────────────────────────────────────────────────────────────
  progress('Restoring: attendances & payrolls');
  await upsertTable('attendances', readSheet(wb, 'attendances'));
  await upsertTable('payrolls',    readSheet(wb, 'payrolls'));

  return { success: true, warnings };
}
