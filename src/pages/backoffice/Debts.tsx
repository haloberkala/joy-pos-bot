import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSalesByStore, Sale } from "@/services/salesService";
import { getCustomersByStore, Customer } from "@/services/customersService";
import {
  createDebtPayment,
  getDebtPaymentsBySale,
  getTotalPaidForSale,
  DebtPayment,
} from "@/services/debtPaymentsService";
import { formatCurrency, formatDate } from "@/lib/format";
import { DateFilter, DateFilterType, DateRange, getDateRangeFromFilter } from "@/components/backoffice/DateFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Check,
  Clock,
  DollarSign,
  Eye,
  Search,
  User,
} from "lucide-react";
import { toast } from "sonner";

export default function Debts() {
  const { activeStoreId } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "unpaid" | "paid">(
    "unpaid",
  );
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>("all");
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromFilter("all"));
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Data state
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedDebtPayments, setSelectedDebtPayments] = useState<DebtPayment[]>([]);
  const [debtTotals, setDebtTotals] = useState<Map<number, { paid: number; remaining: number }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [salesData, customersData] = await Promise.all([
          getSalesByStore(activeStoreId),
          getCustomersByStore(activeStoreId),
        ]);

        setSales(salesData);
        setCustomers(customersData);

        // Calculate debt totals for all debt/paid sales
        const allDebtSales = salesData.filter(
          (s) => s.payment_status === "debt" || s.payment_status === "paid"
        );
        const totalsMap = new Map();

        for (const sale of allDebtSales) {
          const paid = await getTotalPaidForSale(sale.id);
          const remaining = Math.max(0, sale.grand_total - paid);
          totalsMap.set(sale.id, { paid, remaining });
        }

        setDebtTotals(totalsMap);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Gagal memuat data utang");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [activeStoreId, refreshKey]);

  // Load debt payments when sale is selected
  useEffect(() => {
    if (selectedSale) {
      loadDebtPayments(selectedSale.id);
    }
  }, [selectedSale, refreshKey]);

  const loadDebtPayments = async (saleId: number) => {
    try {
      const payments = await getDebtPaymentsBySale(saleId);
      setSelectedDebtPayments(payments);
    } catch (error) {
      console.error("Error loading debt payments:", error);
    }
  };

  const handleDateFilterChange = (type: DateFilterType, range: DateRange) => {
    setDateFilterType(type);
    setDateRange(range);
  };

  // Filter and calculate debt sales
  const debtSales = useMemo(() => {
    // Get only sales that are debt transactions
    // (payment_method === 'debt' OR has debt payment history)
    let filtered = sales.filter((s) => {
      const hasDebtPaymentHistory = (debtTotals.get(s.id)?.paid || 0) > 0;
      return s.payment_method === "debt" || hasDebtPaymentHistory;
    });

    // Apply date filter
    if (dateRange.from) {
      filtered = filtered.filter(
        (s) => new Date(s.sale_date) >= dateRange.from!,
      );
    }
    if (dateRange.to) {
      filtered = filtered.filter(
        (s) => new Date(s.sale_date) <= dateRange.to!,
      );
    }

    // Apply status filter
    if (filterStatus === "unpaid") {
      // Show only unpaid debts (remaining debt > 0)
      filtered = filtered.filter((s) => {
        const debtInfo = debtTotals.get(s.id);
        return debtInfo && debtInfo.remaining > 0;
      });
    } else if (filterStatus === "paid") {
      // Show only paid debts (remaining debt = 0, but has payment history)
      filtered = filtered.filter((s) => {
        const debtInfo = debtTotals.get(s.id);
        return debtInfo && debtInfo.remaining === 0 && debtInfo.paid > 0;
      });
    }
    // For "all", show all filtered results without additional status filtering

    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((s) => {
        const customer = customers.find((c) => c.id === s.customer_id);
        return (
          s.invoice_number.toLowerCase().includes(q) ||
          customer?.name.toLowerCase().includes(q)
        );
      });
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime(),
    );
  }, [sales, filterStatus, searchQuery, debtTotals, customers, dateRange]);

  const totalUnpaid = useMemo(
    () =>
      sales
        .filter((s) => s.payment_status === "debt")
        .reduce((sum, s) => {
          const debtInfo = debtTotals.get(s.id);
          return sum + (debtInfo?.remaining || s.grand_total);
        }, 0),
    [sales, debtTotals],
  );

  const unpaidCount = sales.filter((s) => s.payment_status === "debt").length;

  const getCustomerName = (customerId: number | null) => {
    if (!customerId) return "Umum";
    return customers.find((c) => c.id === customerId)?.name || "-";
  };

  const getRemainingDebtForSale = (sale: Sale): number => {
    const debtInfo = debtTotals.get(sale.id);
    return debtInfo?.remaining || sale.grand_total;
  };

  const handlePay = async () => {
    if (!selectedSale || !payAmount) {
      toast.error("Masukkan jumlah bayar");
      return;
    }
    const amount = parseFloat(payAmount);
    const remaining = getRemainingDebtForSale(selectedSale);

    if (amount <= 0 || amount > remaining) {
      toast.error(
        `Jumlah tidak valid. Sisa utang: ${formatCurrency(remaining)}`,
      );
      return;
    }

    try {
      setIsSaving(true);

      await createDebtPayment({
        sale_id: selectedSale.id,
        amount,
        payment_date: new Date(),
        note: payNote || undefined,
      });

      setPayAmount("");
      setPayNote("");
      setRefreshKey((k) => k + 1);

      toast.success(`Pembayaran ${formatCurrency(amount)} berhasil dicatat`);

      if (amount >= remaining) {
        setSelectedSale(null);
        toast.success("Utang telah LUNAS!");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Gagal memproses pembayaran");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daftar Utang</h1>
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  const nearestDueDate = sales
    .filter((s) => s.payment_status === "debt" && s.due_date)
    .sort((a, b) => {
      const dateA = new Date(a.due_date || 0);
      const dateB = new Date(b.due_date || 0);
      return dateA.getTime() - dateB.getTime();
    })[0];

  const debtCustomersCount = new Set(
    sales
      .filter((s) => s.payment_status === "debt")
      .map((s) => s.customer_id),
  ).size;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daftar Utang</h1>
          <p className="text-muted-foreground">
            Kelola utang pelanggan dan riwayat pembayaran
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Piutang</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(totalUnpaid)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {unpaidCount} transaksi belum lunas
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-100 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Jatuh Tempo Terdekat
              </p>
              {nearestDueDate ? (
                <>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {formatDate(new Date(nearestDueDate.due_date!))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getCustomerName(nearestDueDate.customer_id)}
                  </p>
                </>
              ) : (
                <p className="text-lg font-bold text-foreground mt-1">-</p>
              )}
            </div>
            <div className="p-3 rounded-lg bg-red-100 text-red-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Total Pelanggan Utang
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {debtCustomersCount}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari invoice atau pelanggan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as "all" | "unpaid" | "paid")}
        >
          <TabsList>
            <TabsTrigger value="unpaid" className="gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Belum Lunas
            </TabsTrigger>
            <TabsTrigger value="paid" className="gap-1">
              <Check className="w-3.5 h-3.5" />
              Lunas
            </TabsTrigger>
            <TabsTrigger value="all">Semua</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Terbayar</TableHead>
                <TableHead className="text-right">Sisa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debtSales.map((sale) => {
                const debtInfo = debtTotals.get(sale.id) || { paid: 0, remaining: sale.grand_total };
                const isOverdue =
                  sale.due_date &&
                  new Date() > new Date(sale.due_date) &&
                  sale.payment_status === "debt";
                return (
                  <TableRow
                    key={sale.id}
                    className={isOverdue ? "bg-red-50/50" : ""}
                  >
                    <TableCell className="font-mono font-medium">
                      {sale.invoice_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">
                          {getCustomerName(sale.customer_id)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(new Date(sale.sale_date))}
                    </TableCell>
                    <TableCell>
                      {sale.due_date ? (
                        <span
                          className={
                            isOverdue
                              ? "text-red-600 font-bold"
                              : "text-muted-foreground"
                          }
                        >
                          {formatDate(new Date(sale.due_date))}
                          {isOverdue && " ⚠️"}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(sale.grand_total)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(debtInfo.paid)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-orange-600">
                      {formatCurrency(debtInfo.remaining)}
                    </TableCell>
                    <TableCell>
                      {sale.payment_status === "paid" ? (
                        <Badge
                          variant="default"
                          className="bg-green-100 text-green-700"
                        >
                          Lunas
                        </Badge>
                      ) : isOverdue ? (
                        <Badge variant="destructive">Jatuh Tempo</Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-orange-100 text-orange-700"
                        >
                          Belum Lunas
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedSale(sale);
                          setPayAmount("");
                          setPayNote("");
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {debtSales.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-12 text-muted-foreground"
                  >
                    Tidak ada data utang
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail & Payment Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Detail Utang - {selectedSale?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Pelanggan</span>
                  <p className="font-bold">
                    {getCustomerName(selectedSale.customer_id)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tanggal</span>
                  <p className="font-medium">
                    {formatDate(new Date(selectedSale.sale_date))}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Utang</span>
                  <p className="font-bold text-lg">
                    {formatCurrency(selectedSale.grand_total)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Sisa</span>
                  <p className="font-bold text-lg text-orange-600">
                    {formatCurrency(getRemainingDebtForSale(selectedSale))}
                  </p>
                </div>
              </div>

              {/* Payment History */}
              <div>
                <h4 className="font-semibold mb-2">Riwayat Pembayaran</h4>
                {selectedDebtPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Belum ada pembayaran
                  </p>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedDebtPayments.map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center bg-muted/50 rounded-lg px-3 py-2 text-sm"
                      >
                        <div>
                          <span className="font-medium text-green-600">
                            +{formatCurrency(p.amount)}
                          </span>
                          {p.note && (
                            <span className="text-muted-foreground ml-2">
                              • {p.note}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(new Date(p.payment_date))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Paid info */}
              {selectedSale.payment_status === "paid" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-green-700">✓ Sudah Lunas</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pembayaran telah lunas untuk transaksi ini.
                  </p>
                </div>
              )}

              {/* Pay form */}
              {selectedSale.payment_status === "debt" && (
                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-semibold">Catat Pembayaran</h4>
                  <div className="space-y-2">
                    <Label>Jumlah Bayar (Rp)</Label>
                    <Input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="0"
                      className="text-lg font-bold"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPayAmount(
                          String(getRemainingDebtForSale(selectedSale)),
                        )
                      }
                    >
                      Bayar Lunas
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Catatan (opsional)</Label>
                    <Input
                      value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                      placeholder="Catatan pembayaran"
                    />
                  </div>
                  <Button
                    onClick={handlePay}
                    className="w-full gap-2"
                    disabled={isSaving}
                  >
                    <DollarSign className="w-4 h-4" />{" "}
                    {isSaving ? "Memproses..." : "Konfirmasi Pembayaran"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
