import { supabase } from '@/lib/supabase';

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Expense {
  id: number;
  store_id: number;
  category_id: number;
  title: string;
  amount: number;
  expense_date: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseInput {
  store_id: number;
  category_id: number;
  title: string;
  amount: number;
  expense_date?: Date | string;
  note?: string;
}

/**
 * Get all expense categories
 */
export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    throw error;
  }
}

/**
 * Get expenses by store
 */
export async function getExpensesByStore(storeId: number): Promise<Expense[]> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('store_id', storeId)
      .order('expense_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }
}

/**
 * Create new expense
 */
export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        store_id: input.store_id,
        category_id: input.category_id,
        title: input.title,
        amount: input.amount,
        expense_date: input.expense_date || new Date().toISOString().split('T')[0],
        note: input.note || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating expense:', error);
    throw error;
  }
}

/**
 * Delete expense
 */
export async function deleteExpense(id: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
}

/**
 * Create new expense category
 */
export async function createExpenseCategory(name: string, description?: string): Promise<ExpenseCategory> {
  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({
        name,
        description: description || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating expense category:', error);
    throw error;
  }
}

/**
 * Update expense category
 */
export async function updateExpenseCategory(id: number, name: string, description?: string): Promise<ExpenseCategory> {
  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .update({
        name,
        description: description || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating expense category:', error);
    throw error;
  }
}

/**
 * Delete expense category
 */
export async function deleteExpenseCategory(id: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting expense category:', error);
    throw error;
  }
}
