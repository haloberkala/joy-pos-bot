import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DateRange, DateFilterType, getDateRangeFromFilter } from '@/components/backoffice/DateFilter';
import { getSalesByStore } from '@/services/salesService';
import { getExpensesByStore, getExpenseCategories } from '@/services/expensesService';
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
  isLoading: boolean;
  error: string | null;
  // Computed
  totalRevenue: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
}

export function useReportData(dateRange: DateRange, dateFilterType: DateFilterType) {
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
      ] = await Promise.all([
        getSalesByStore(activeStoreId),
        getExpensesByStore(activeStoreId),
        getExpenseCategories(),
        getSalesReport(activeStoreId, dateFrom, dateTo),
        getStockReport(activeStoreId),
        getRefundReport(activeStoreId, dateFrom, dateTo),
        getTotalCOGS(activeStoreId, dateFrom, dateTo),
      ]);

      // Filter sales by date (exclude refunded)
      let filteredSales = salesData.filter((s) => s.payment_status !== 'refunded');
      if (dateFrom) filteredSales = filteredSales.filter((s) => new Date(s.sale_date) >= dateFrom);
      if (dateTo) filteredSales = filteredSales.filter((s) => new Date(s.sale_date) <= dateTo);

      // Filter expenses by date
      let filteredExpenses = expensesData;
      if (dateFrom) filteredExpenses = filteredExpenses.filter((e) => new Date(e.expense_date) >= dateFrom);
      if (dateTo) filteredExpenses = filteredExpenses.filter((e) => new Date(e.expense_date) <= dateTo);

      setSales(filteredSales);
      setExpenses(filteredExpenses);
      setExpenseCategories(categoriesData);
      setSalesByProduct(salesReportData);
      setStockReport(stockReportData);
      setRefundReport(refundReportData);
      setTotalCOGS(cogsData);
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
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  return {
    sales,
    expenses,
    expenseCategories,
    salesByProduct,
    stockReport,
    refundReport,
    totalCOGS,
    isLoading,
    error,
    reload: loadData,
    // Computed
    totalRevenue,
    grossProfit,
    totalExpenses,
    netProfit,
  };
}
