import { supabase } from '@/lib/supabase';

export interface SalesReportItem {
  product_id: number;
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
 */
export async function getSalesReport(storeId: number, dateFrom?: Date, dateTo?: Date): Promise<SalesReportItem[]> {
  try {
    let query = supabase
      .from('sale_items')
      .select(`
        product_id,
        product_name,
        quantity,
        total_price,
        cost_at_sale,
        sale:sales!inner(store_id, sale_date, payment_status)
      `)
      .eq('sale.store_id', storeId)
      .neq('sale.payment_status', 'refunded');

    if (dateFrom) {
      query = query.gte('sale.sale_date', dateFrom.toISOString().split('T')[0]);
    }
    if (dateTo) {
      query = query.lte('sale.sale_date', dateTo.toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Aggregate by product
    const productMap = new Map<number, SalesReportItem>();
    
    data?.forEach((item: any) => {
      const productId = item.product_id;
      const existing = productMap.get(productId);
      
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.total_price;
        existing.cost += item.cost_at_sale * item.quantity;
        existing.profit = existing.revenue - existing.cost;
      } else {
        productMap.set(productId, {
          product_id: productId,
          product_name: item.product_name || `Product #${productId}`,
          quantity: item.quantity,
          revenue: item.total_price,
          cost: item.cost_at_sale * item.quantity,
          profit: item.total_price - (item.cost_at_sale * item.quantity),
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
 * Get stock report for a store
 */
export async function getStockReport(storeId: number): Promise<StockReportItem[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(p => {
      const stockValue = p.quantity * p.cost_price;
      let status: 'Habis' | 'Menipis' | 'Tersedia' = 'Tersedia';
      
      if (p.quantity === 0) {
        status = 'Habis';
      } else if (p.quantity < p.min_stock_alert) {
        status = 'Menipis';
      }

      return {
        id: p.id,
        name: p.name,
        code: p.code,
        category: p.category || '-',
        stock: p.quantity,
        min_stock: p.min_stock_alert,
        cost_price: p.cost_price,
        selling_price: p.selling_price,
        stock_value: stockValue,
        status,
      };
    });
  } catch (error) {
    console.error('Error fetching stock report:', error);
    throw error;
  }
}

/**
 * Get refund report for a store
 */
export async function getRefundReport(storeId: number, dateFrom?: Date, dateTo?: Date): Promise<RefundReportItem[]> {
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
        customers(name)
      `)
      .eq('store_id', storeId)
      .eq('payment_status', 'refunded')
      .order('sale_date', { ascending: false });

    if (dateFrom) {
      query = query.gte('sale_date', dateFrom.toISOString().split('T')[0]);
    }
    if (dateTo) {
      query = query.lte('sale_date', dateTo.toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((sale: any) => ({
      id: sale.id,
      sale_id: sale.id,
      invoice_number: sale.invoice_number,
      customer_name: sale.customers?.name || 'Umum',
      reason: sale.note || 'Tidak ada keterangan',
      refund_amount: sale.grand_total,
      refunded_at: sale.sale_date,
    }));
  } catch (error) {
    console.error('Error fetching refund report:', error);
    throw error;
  }
}

/**
 * Calculate total COGS (Cost of Goods Sold) from sale items
 */
export async function getTotalCOGS(storeId: number, dateFrom?: Date, dateTo?: Date): Promise<number> {
  try {
    let query = supabase
      .from('sale_items')
      .select(`
        quantity,
        cost_at_sale,
        sale:sales!inner(store_id, sale_date, payment_status)
      `)
      .eq('sale.store_id', storeId)
      .neq('sale.payment_status', 'refunded');

    if (dateFrom) {
      query = query.gte('sale.sale_date', dateFrom.toISOString().split('T')[0]);
    }
    if (dateTo) {
      query = query.lte('sale.sale_date', dateTo.toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).reduce((sum: number, item: any) => {
      return sum + (item.cost_at_sale * item.quantity);
    }, 0);
  } catch (error) {
    console.error('Error calculating COGS:', error);
    return 0;
  }
}
