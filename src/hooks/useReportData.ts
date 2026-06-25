import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DateRange, DateFilterType } from '@/components/backoffice/DateFilter';
import { supabase } from '@/lib/supabase';
import { getExpenseCategories } from '@/services/expensesService';
import { getSalesReport, getStockReport, getRefundReport, getTotalCOGS } from '@/services/reportsService';
import { toast } from 'sonner';

export interface ReportData {
  sales: any[];
  expenses: any[];
  expenseCategories: any[];
  salesByProduct: any[];
  stockReport: any[];
  refundReport: any[];
  totalCOGS: number;
  totalPayroll: number;
  isLoading: boolean;
  error: string | null;
  totalRevenue: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
}

/** Server-side filtered sales — no refunds, date range applied at DB */
async function getSalesByDateRange(storeId: number, dateFrom?: Date, dateTo?: Date) {
  let query = supabase
    .from('sales')
    .select('*')
    .eq('store_id', storeId)
    .neq('payment_status', 'refunded')
    .order('sale_date', { ascending: false });

  if (dateFrom) query = query.gte('sale_date', dateFrom.toISOString().split('T')[0]);
  if (dateTo) query = query.lte('sale_date', dateTo.toISOString().split('T')[0]);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/** Server-side filtered expenses — date range applied at DB */
async function getExpensesByDateRange(storeId: number, dateFrom?: Date, dateTo?: Date) {
  let query = supabase
    .from('expenses')
    .select('*')
    .eq('store_id', storeId)
    .order('expense_date', { ascending: false });

  if (dateFrom) query = query.gte('expense_date', dateFrom.toISOString().split('T')[0]);
  if (dateTo) query = query.lte('expense_date', dateTo.toISOString().split('T')[0]);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Fetch total payroll for months overlapping the date range.
 * payrolls uses integer month+year columns, so we convert the date range
 * to (yearMonth) pairs and include all payrolls whose month/year fall within.
 */
async function getTotalPayrollByDateRange(storeId: number, dateFrom?: Date, dateTo?: Date): Promise<number> {
  let query = supabase
    .from('payrolls')
    .select('total_salary, month, year')
    .eq('store_id', storeId);

  // Convert dates to year/month integers for filtering
  if (dateFrom) {
    const fromYear = dateFrom.getFullYear();
    const fromMonth = dateFrom.getMonth() + 1;
    // Filter: (year > fromYear) OR (year = fromYear AND month >= fromMonth)
    query = query.or(`year.gt.${fromYear},and(year.eq.${fromYear},month.gte.${fromMonth})`);
  }
  if (dateTo) {
    const toYear = dateTo.getFullYear();
    const toMonth = dateTo.getMonth() + 1;
    // Filter: (year < toYear) OR (year = toYear AND month <= toMonth)
    query = query.or(`year.lt.${toYear},and(year.eq.${toYear},month.lte.${toMonth})`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching payroll total:', error);
    return 0;
  }
  return (data || []).reduce((sum: number, p: any) => sum + (p.total_salary || 0), 0);
}

export function useReportData(dateRange: DateRange, _dateFilterType: DateFilterType) {
  const { activeStoreId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [salesByProduct, setSalesByProduct] = useState<any[]>([]);
  const [stockReport, setStockReport] = useState<any[]>([]);
  const [refundReport, setRefundReport] = useState<any[]>([]);
  const [totalCOGS, setTotalCOGS] = useState(0);
  const [totalPayroll, setTotalPayroll] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const dateFrom = dateRange.from || undefined;
      const dateTo = dateRange.to || undefined;

      const [
        salesData,
        expensesData,
        categoriesData,
        salesReportData,
        stockReportData,
        refundReportData,
        cogsData,
        payrollTotal,
      ] = await Promise.all([
        getSalesByDateRange(activeStoreId, dateFrom, dateTo),
        getExpensesByDateRange(activeStoreId, dateFrom, dateTo),
        getExpenseCategories(),
        getSalesReport(activeStoreId, dateFrom, dateTo),
        getStockReport(activeStoreId),
        getRefundReport(activeStoreId, dateFrom, dateTo),
        getTotalCOGS(activeStoreId, dateFrom, dateTo),
        getTotalPayrollByDateRange(activeStoreId, dateFrom, dateTo),
      ]);

      setSales(salesData);
      setExpenses(expensesData);
      setExpenseCategories(categoriesData);
      setSalesByProduct(salesReportData);
      setStockReport(stockReportData);
      setRefundReport(refundReportData);
      setTotalCOGS(cogsData);
      setTotalPayroll(payrollTotal);
    } catch (err) {
      console.error('Error loading report data:', err);
      setError('Gagal memuat data laporan');
      toast.error('Gagal memuat data laporan');
    } finally {
      setIsLoading(false);
    }
  }, [activeStoreId, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalRevenue = sales.reduce((sum, s) => sum + s.grand_total, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0) + totalPayroll;
  const netProfit = grossProfit - totalExpenses;

  return {
    sales,
    expenses,
    expenseCategories,
    salesByProduct,
    stockReport,
    refundReport,
    totalCOGS,
    totalPayroll,
    isLoading,
    error,
    reload: loadData,
    totalRevenue,
    grossProfit,
    totalExpenses,
    netProfit,
  };
}
