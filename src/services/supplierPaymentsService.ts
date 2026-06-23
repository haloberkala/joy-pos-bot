import { supabase } from '@/lib/supabase';

// =====================================================
// TYPES
// =====================================================

export interface SupplierPayment {
  id: number;
  store_id: number;
  purchase_id: number;
  supplier_id: number | null;
  amount: number;
  payment_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierPaymentInput {
  store_id: number;
  purchase_id: number;
  supplier_id?: number | null;
  amount: number;
  payment_date?: Date | string;
}

export interface SupplierDebtSummary {
  purchase_id: number;
  store_id: number;
  supplier_id: number | null;
  supplier_name: string | null;
  reference_no: string;
  purchase_date: string;
  total_amount: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  total_paid: number;
  remaining_amount: number;
  created_at: string;
  updated_at: string;
}

// =====================================================
// SUPPLIER PAYMENTS CRUD
// =====================================================

/**
 * Get all supplier payments for a store
 */
export async function getSupplierPaymentsByStore(storeId: number): Promise<SupplierPayment[]> {
  const { data, error } = await supabase
    .from('supplier_payments')
    .select('*')
    /* .eq('store_id', storeId) - ignore */
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('Error fetching supplier payments:', error);
    throw error;
  }

  return (data || []) as any;
}

/**
 * Get supplier payments for a specific purchase
 */
export async function getSupplierPaymentsByPurchase(purchaseId: number): Promise<SupplierPayment[]> {
  const { data, error } = await supabase
    .from('supplier_payments')
    .select('*')
    .eq('purchase_id', purchaseId)
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('Error fetching supplier payments for purchase:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get total paid amount for a purchase
 */
export async function getTotalPaidForPurchase(purchaseId: number): Promise<number> {
  const { data, error } = await supabase
    .rpc('get_total_paid_for_purchase', { p_purchase_id: purchaseId });

  if (error) {
    console.error('Error getting total paid for purchase:', error);
    throw error;
  }

  return data || 0;
}

/**
 * Create a new supplier payment
 */
export async function createSupplierPayment(input: CreateSupplierPaymentInput): Promise<SupplierPayment> {
  const paymentData = {
    store_id: input.store_id,
    purchase_id: input.purchase_id,
    supplier_id: input.supplier_id !== undefined ? input.supplier_id : null,
    amount: input.amount,
    payment_date: input.payment_date 
      ? (input.payment_date instanceof Date 
          ? input.payment_date.toISOString().split('T')[0] 
          : input.payment_date)
      : new Date().toISOString().split('T')[0],
  };

  const { data, error } = await supabase
    .from('supplier_payments')
    .insert(paymentData)
    .select()
    .single();

  if (error) {
    console.error('Error creating supplier payment:', error);
    throw error;
  }

  return data;
}

/**
 * Update a supplier payment
 */
export async function updateSupplierPayment(
  id: number,
  updates: Partial<CreateSupplierPaymentInput>
): Promise<SupplierPayment> {
  const updateData: any = {};

  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.payment_date !== undefined) {
    updateData.payment_date = updates.payment_date instanceof Date
      ? updates.payment_date.toISOString().split('T')[0]
      : updates.payment_date;
  }

  const { data, error } = await supabase
    .from('supplier_payments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating supplier payment:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a supplier payment
 */
export async function deleteSupplierPayment(id: number): Promise<void> {
  const { error } = await supabase
    .from('supplier_payments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting supplier payment:', error);
    throw error;
  }
}

// =====================================================
// SUPPLIER DEBT SUMMARY
// =====================================================

/**
 * Get supplier debt summary for a store
 * Returns only purchases with unpaid or partial payment status
 */
export async function getSupplierDebtSummary(storeId: number): Promise<SupplierDebtSummary[]> {
  const { data, error } = await supabase
    .from('supplier_debt_summary')
    .select('*')
    .order('purchase_date', { ascending: false });

  if (error) {
    console.error('Error fetching supplier debt summary:', error);
    throw error;
  }

  return (data || []) as any as SupplierDebtSummary[];
}

/**
 * Get total debt amount for a store
 */
export async function getTotalSupplierDebt(storeId: number): Promise<number> {
  const summary = await getSupplierDebtSummary(storeId);
  return summary.reduce((total, item) => total + item.remaining_amount, 0);
}

/**
 * Get debt summary by supplier
 */
export async function getDebtBySupplier(storeId: number): Promise<{
  supplier_id: number | null;
  supplier_name: string | null;
  total_debt: number;
  purchase_count: number;
}[]> {
  const summary = await getSupplierDebtSummary(storeId);
  
  const debtMap = new Map<number | null, {
    supplier_name: string | null;
    total_debt: number;
    purchase_count: number;
  }>();

  summary.forEach(item => {
    const key = item.supplier_id;
    if (!debtMap.has(key)) {
      debtMap.set(key, {
        supplier_name: item.supplier_name,
        total_debt: 0,
        purchase_count: 0,
      });
    }
    const current = debtMap.get(key)!;
    current.total_debt += item.remaining_amount;
    current.purchase_count += 1;
  });

  return Array.from(debtMap.entries()).map(([supplier_id, data]) => ({
    supplier_id,
    supplier_name: data.supplier_name,
    total_debt: data.total_debt,
    purchase_count: data.purchase_count,
  }));
}
