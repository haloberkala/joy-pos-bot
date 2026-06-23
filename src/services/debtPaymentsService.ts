import { supabase } from '@/lib/supabase';

export interface DebtPayment {
  id: number;
  sale_id: number;
  amount: number;
  payment_date: string;
  note: string | null;
  created_at: string;
}

export interface CreateDebtPaymentInput {
  sale_id: number;
  amount: number;
  payment_date?: Date;
  note?: string;
}

/**
 * Create debt payment (cicilan)
 * Automatically updates sale payment_status to 'paid' when fully paid
 */
export async function createDebtPayment(input: CreateDebtPaymentInput): Promise<DebtPayment> {
  try {
    // Insert payment
    const { data, error } = await supabase
      .from('debt_payments')
      .insert({
        sale_id: input.sale_id,
        amount: input.amount,
        payment_date: input.payment_date ? input.payment_date.toISOString() : new Date().toISOString(),
        note: input.note || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Check if debt is now fully paid
    const totalPaid = await getTotalPaidForSale(input.sale_id);
    
    // Get sale grand_total
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('grand_total')
      .eq('id', input.sale_id)
      .single();

    if (!saleError && sale) {
      const remaining = sale.grand_total - totalPaid;
      
      // If fully paid, update payment_status to 'paid'
      if (remaining <= 0) {
        await supabase
          .from('sales')
          .update({ payment_status: 'paid' })
          .eq('id', input.sale_id);
      }
    }

    return data;
  } catch (error) {
    console.error('Error creating debt payment:', error);
    throw error;
  }
}

/**
 * Get debt payments for a sale
 */
export async function getDebtPaymentsBySale(saleId: number): Promise<DebtPayment[]> {
  try {
    const { data, error } = await supabase
      .from('debt_payments')
      .select('*')
      .eq('sale_id', saleId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching debt payments:', error);
    throw error;
  }
}

/**
 * Get total paid for a sale
 */
export async function getTotalPaidForSale(saleId: number): Promise<number> {
  try {
    const payments = await getDebtPaymentsBySale(saleId);
    return payments.reduce((sum, p) => sum + p.amount, 0);
  } catch (error) {
    console.error('Error calculating total paid:', error);
    return 0;
  }
}

/**
 * Calculate remaining debt for a sale
 */
export async function getRemainingDebt(saleId: number, grandTotal: number): Promise<number> {
  try {
    const totalPaid = await getTotalPaidForSale(saleId);
    return Math.max(0, grandTotal - totalPaid);
  } catch (error) {
    console.error('Error calculating remaining debt:', error);
    return grandTotal;
  }
}
