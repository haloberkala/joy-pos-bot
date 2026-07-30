import { supabase } from '@/lib/supabase';

export interface SalesReportItem {
  product_id: number | null;
  product_name: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface StockReportItem {
  id: number;
  name: string;
  code: string;
  category: string;
  brand: string;
  stock: number;
  min_stock: number;
  cost_price: number;
  selling_price: number;
  stock_value: number;
  status: 'Habis' | 'Menipis' | 'Tersedia';
}

export interface RefundReportItem {
  id: number;
  sale_id: number;
  invoice_number: string;
  customer_name: string;
  reason: string;
  refund_amount: number;
  refunded_at: string;
}

/**
 * Get sales report by product for a store
 * Uses JOIN to products table to get latest product name
 */
export async function getSalesReport(
  storeId: number,
  dateFrom?: Date,
  dateTo?: Date
): Promise<SalesReportItem[]> {
  try {
    let query = supabase
      .from('sale_items')
      .select(`
        product_id,
        product_name,
        quantity,
        total_price,
        cost_per_unit,
        product:products(id, name),
        sale:sales!inner(store_id, sale_date, payment_status)
      `)
      .eq('sale.store_id', storeId)
      .neq('sale.payment_status', 'refunded');

    if (dateFrom) query = query.gte('sale.sale_date', dateFrom.toISOString().split('T')[0]);
    if (dateTo) query = query.lte('sale.sale_date', dateTo.toISOString().split('T')[0]);

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate by product_id (or product_name for services)
    const productMap = new Map<string, SalesReportItem>();

    data?.forEach((item: any) => {
      const key = item.product_id ? String(item.product_id) : item.product_name;
      const existing = productMap.get(key);
      const itemCost = (item.cost_per_unit || 0) * item.quantity;
      
      // Use product.name from JOIN if available, fallback to product_name
      const displayName = item.product?.name ?? item.product_name ?? `Produk #${item.product_id}`;

      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.total_price;
        existing.cost += itemCost;
        existing.profit = existing.revenue - existing.cost;
      } else {
        productMap.set(key, {
          product_id: item.product_id,
          product_name: displayName,
          quantity: item.quantity,
          revenue: item.total_price,
          cost: itemCost,
          profit: item.total_price - itemCost,
        });
      }
    });

    return Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
  } catch (error) {
    console.error('Error fetching sales report:', error);
    throw error;
  }
}

/**
 * Get stock report with category names (via join)
 */
export async function getStockReport(storeId: number): Promise<StockReportItem[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, code, quantity, min_stock_alert, cost_price,
        selling_price_retail,
        category:categories(name),
        brand:brands(name)
      `)
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map((p: any) => {
      let status: 'Habis' | 'Menipis' | 'Tersedia' = 'Tersedia';
      if (p.quantity === 0) status = 'Habis';
      else if (p.quantity < p.min_stock_alert) status = 'Menipis';

      return {
        id: p.id,
        name: p.name,
        code: p.code,
        category: p.category?.name || '-',
        brand: p.brand?.name || '-',
        stock: p.quantity,
        min_stock: p.min_stock_alert,
        cost_price: p.cost_price,
        selling_price: p.selling_price_retail,
        stock_value: p.quantity * p.cost_price,
        status,
      };
    });
  } catch (error) {
    console.error('Error fetching stock report:', error);
    throw error;
  }
}

/**
 * Get refund report — sales with payment_status = 'refunded'
 */
export async function getRefundReport(
  storeId: number,
  dateFrom?: Date,
  dateTo?: Date
): Promise<RefundReportItem[]> {
  try {
    let query = supabase
      .from('sales')
      .select(`
        id,
        invoice_number,
        customer_id,
        grand_total,
        note,
        sale_date,
        updated_at,
        customers(name)
      `)
      .eq('store_id', storeId)
      .eq('payment_status', 'refunded')
      .order('updated_at', { ascending: false });

    if (dateFrom) query = query.gte('sale_date', dateFrom.toISOString().split('T')[0]);
    if (dateTo) query = query.lte('sale_date', dateTo.toISOString().split('T')[0]);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((sale: any) => ({
      id: sale.id,
      sale_id: sale.id,
      invoice_number: sale.invoice_number,
      customer_name: (sale.customers as any)?.name || 'Umum',
      reason: sale.note?.replace(/^REFUND:\s*/, '') || 'Tidak ada keterangan',
      refund_amount: sale.grand_total,
      refunded_at: sale.updated_at || sale.sale_date,
    }));
  } catch (error) {
    console.error('Error fetching refund report:', error);
    throw error;
  }
}

/**
 * Calculate total COGS — uses cost_per_unit (correct column)
 */
export async function getTotalCOGS(
  storeId: number,
  dateFrom?: Date,
  dateTo?: Date
): Promise<number> {
  try {
    let query = supabase
      .from('sale_items')
      .select(`
        quantity,
        cost_per_unit,
        sale:sales!inner(store_id, sale_date, payment_status)
      `)
      .eq('sale.store_id', storeId)
      .neq('sale.payment_status', 'refunded');

    if (dateFrom) query = query.gte('sale.sale_date', dateFrom.toISOString().split('T')[0]);
    if (dateTo) query = query.lte('sale.sale_date', dateTo.toISOString().split('T')[0]);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).reduce((sum: number, item: any) => {
      return sum + (item.cost_per_unit || 0) * item.quantity;
    }, 0);
  } catch (error) {
    console.error('Error calculating COGS:', error);
    return 0;
  }
}
