import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { RefundModal } from "@/components/pos/RefundModal";
import { DebtModal } from "@/components/pos/DebtModal";
import { getProductsByStore, getProductByCode, Product } from "@/services/productsService";
import { getCustomersByStore, Customer } from "@/services/customersService";
import { getAllStores, Store } from "@/services/storesService";
import { createSale, processRefund as processRefundService, Sale as DBSale, SaleItem as DBSaleItem } from "@/services/salesService";
import { createShipment } from "@/services/shipmentsService";
import { printerManager, PrinterError } from "@/lib/printer";
import type { PrinterTransaction } from "@/lib/printer";
import {
  PaymentMethod,
  Sale,
  SaleDetail,
  PriceMode,
  ServiceItem,
  CartItem,
} from "@/types/pos";
import {
  Settings,
  LogOut,
  User,
  ShieldCheck,
  UserCog,
  Building2,
  Trash2,
  Search,
  ChevronDown,
  Truck,
  Wrench,
  Plus,
  Crown,
  X,
  RotateCcw,
  FileText,
  Info,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { canAccessMenu } from "@/contexts/AuthContext";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ProductListPanel } from "@/components/pos/ProductListPanel";
import { ShippingModal } from "@/components/pos/ShippingModal";
import { TransportSelector } from "@/components/pos/TransportSelector";

// ========== OPEN BILL TYPES ==========
interface Bill {
  id: number;
  // label removed - will be rendered dynamically based on index
  customerName: string;
  items: CartItem[];
  serviceItems: ServiceItem[];
  selectedCustomer: Customer | null;
}

// Find the smallest available bill number starting from 1
function findNextBillNumber(bills: Bill[]): number {
  const usedNumbers = new Set(bills.map((b) => b.id));
  let num = 1;
  while (usedNumbers.has(num)) num++;
  return num;
}

function createBillWithNumber(num: number): Bill {
  return {
    id: num,
    // label removed - will be rendered dynamically
    customerName: "",
    items: [],
    serviceItems: [],
    selectedCustomer: null,
  };
}

const MAX_BILLS = 10;

// ========== CART QTY INPUT COMPONENT ==========
interface CartQtyInputProps {
  item: CartItem;
  updateQuantity: (productId: number, qty: number) => void;
  searchRef: React.RefObject<HTMLInputElement>;
}

function CartQtyInput({ item, updateQuantity, searchRef }: CartQtyInputProps) {
  const [inputValue, setInputValue] = useState<string>(item.quantity.toString());

  useEffect(() => {
    setInputValue(item.quantity.toString());
  }, [item.quantity]);

  const handleBlur = () => {
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed < 1) {
      setInputValue(item.quantity.toString());
    } else if (parsed !== item.quantity) {
      updateQuantity(item.product.id, parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const parsed = parseInt(inputValue, 10);
      if (isNaN(parsed) || parsed < 1) {
        setInputValue(item.quantity.toString());
      } else if (parsed !== item.quantity) {
        updateQuantity(item.product.id, parsed);
      }
      searchRef.current?.focus();
    }
  };

  return (
    <input
      type="number"
      min="1"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="w-14 text-center text-[13px] font-medium rounded-lg border border-border bg-white text-foreground py-1 focus:border-primary focus:outline-none mx-auto block"
    />
  );
}

export default function POS() {
  // ========== OPEN BILL STATE ==========
  const [bills, setBills] = useState<Bill[]>(() => [createBillWithNumber(1)]);
  const [activeBillId, setActiveBillId] = useState<number>(() => 1);
  const _activeBill = bills.find((b) => b.id === activeBillId) || bills[0];
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    setPriceMode,
    setItems,
  } = useCart();
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);

  const saveBillState = useCallback(() => {
    setBills((prev) =>
      prev.map((b) =>
        b.id === activeBillId
          ? {
              ...b,
              items: [...items],
              serviceItems: [...serviceItems],
              selectedCustomer: selectedCustomerRef.current,
            }
          : b,
      ),
    );
  }, [activeBillId, items, serviceItems]);

  const selectedCustomerRef = useRef<Customer | null>(null);

  const switchToBill = useCallback(
    (billId: number) => {
      if (billId === activeBillId) return;
      saveBillState();
      const target = bills.find((b) => b.id === billId);
      if (target) {
        setActiveBillId(billId);
        setItems(target.items);
        setServiceItems(target.serviceItems);
        setSelectedCustomer(target.selectedCustomer);
      }
    },
    [activeBillId, bills, saveBillState, setItems],
  );

  const addNewBill = useCallback(() => {
    if (bills.length >= MAX_BILLS) {
      toast.error(`Maksimal ${MAX_BILLS} bill terbuka`);
      return;
    }
    saveBillState();
    const num = findNextBillNumber(bills);
    const newBill = createBillWithNumber(num);
    setBills((prev) => [...prev, newBill]);
    setActiveBillId(newBill.id);
    clearCart();
    setServiceItems([]);
    setSelectedCustomer(null);
  }, [bills, saveBillState, clearCart]);

  const closeBill = useCallback(
    (billId: number) => {
      if (bills.length <= 1) {
        clearCart();
        setServiceItems([]);
        setSelectedCustomer(null);
        const fresh = createBillWithNumber(1);
        setBills([fresh]);
        setActiveBillId(fresh.id);
        return;
      }
      const remaining = bills.filter((b) => b.id !== billId);
      setBills(remaining);
      if (activeBillId === billId) {
        const next = remaining[0];
        setActiveBillId(next.id);
        setItems(next.items);
        setServiceItems(next.serviceItems);
        setSelectedCustomer(next.selectedCustomer);
      }
    },
    [bills, activeBillId, clearCart, setItems],
  );

  // ========== EXISTING STATE ==========
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [currentSaleDetails, setCurrentSaleDetails] = useState<
    (SaleDetail & { product?: Product })[]
  >([]);
  const [showReceipt, setShowReceipt] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDebt, setIsDebt] = useState(false);
  const [showShipping, setShowShipping] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [serviceDesc, setServiceDesc] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [showServiceInput, setShowServiceInput] = useState(false);
  const [isOwnerWithdrawal, setIsOwnerWithdrawal] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const {
    user,
    logout,
    activeStoreId,
    setActiveStoreId,
    canSwitchStore,
    accessibleStoreIds,
  } = useAuth();
  const navigate = useNavigate();

  // Fetch products and customers from Supabase
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const filteredStoreProducts = useMemo(() => {
    if (!searchQuery.trim()) return storeProducts;
    const q = searchQuery.toLowerCase();
    return storeProducts.filter(
      (p) => p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    );
  }, [storeProducts, searchQuery]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Load stores once on mount
  useEffect(() => {
    loadStores();
  }, []);

  // Load store-specific data when activeStoreId changes
  useEffect(() => {
    loadStoreData();
  }, [activeStoreId]);

  const loadStores = async () => {
    try {
      const storesData = await getAllStores();
      setStores(storesData);
    } catch (error) {
      console.error('Error loading stores:', error);
      toast.error('Gagal memuat daftar toko');
    }
  };

  const loadStoreData = async () => {
    try {
      setIsLoadingData(true);
      const [productsData, customersData] = await Promise.all([
        getProductsByStore(activeStoreId),
        getCustomersByStore(activeStoreId),
      ]);
      setStoreProducts(productsData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading store data:', error);
      toast.error('Gagal memuat data toko');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    selectedCustomerRef.current = selectedCustomer;
  }, [selectedCustomer]);

  const activeStore = stores.find((s) => s.id === activeStoreId);
  const serviceTotal = useMemo(
    () => serviceItems.reduce((sum, s) => sum + s.price, 0),
    [serviceItems],
  );
  const grandTotal = total + serviceTotal;

  useEffect(() => {
    searchRef.current?.focus();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika ada modifier key atau bukan satu karakter (huruf/angka)
      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return;
      
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (searchRef.current) {
        searchRef.current.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Touchscreen fix: --vh variable agar layout tidak geser saat virtual keyboard muncul
  useEffect(() => {
    const updateVh = () => {
      const vh = (window.visualViewport?.height ?? window.innerHeight) * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    updateVh();
    window.visualViewport?.addEventListener('resize', updateVh);
    window.addEventListener('resize', updateVh);
    return () => {
      window.visualViewport?.removeEventListener('resize', updateVh);
      window.removeEventListener('resize', updateVh);
    };
  }, []);
  // Note: Debt flow now handled via DebtModal — no auto-trigger.

  useBarcodeScanner({
    onScan: (barcode) => {
      const product = storeProducts.find((p) => p.code === barcode);
      if (product) {
        if (product.quantity > 0) {
          addItem(product);
          toast.success(`${product.short_name || product.name} ditambahkan`, { duration: 1500 });
        } else toast.error(`${product.short_name || product.name} stok habis`);
      } else toast.error(`Produk tidak ditemukan: ${barcode}`);
    },
    enabled: !paymentMethod && !showReceipt,
  });

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Jika event sudah dicegah (oleh barcode scanner hook), abaikan agar tidak dobel
      if (e.isDefaultPrevented()) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, filteredStoreProducts.length - 1)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filteredStoreProducts.length > 0) {
        e.preventDefault();
        const selected = filteredStoreProducts[selectedIndex];
        if (selected && selected.quantity > 0) {
          addItem(selected);
          setSearchQuery("");
          setSelectedIndex(0);
          toast.success(`${selected.short_name || selected.name} ditambahkan`, { duration: 1000 });
        } else if (selected) {
          toast.error(`${selected.short_name || selected.name} stok habis`);
        }
      }
    },
    [filteredStoreProducts, selectedIndex, addItem],
  );

  // handleQtyChange removed, handled by CartQtyInput

  const handleAddService = () => {
    if (!serviceDesc.trim() || !servicePrice.trim()) {
      toast.error("Isi deskripsi dan harga jasa");
      return;
    }
    const price = parseFloat(servicePrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Harga tidak valid");
      return;
    }
    setServiceItems((prev) => [
      ...prev,
      { id: Date.now(), description: serviceDesc.trim(), price },
    ]);
    setServiceDesc("");
    setServicePrice("");
    setShowServiceInput(false);
    toast.success("Jasa ditambahkan");
  };

  const removeService = (id: number) => {
    setServiceItems((prev) => prev.filter((s) => s.id !== id));
  };

  // Direct checkout — open combined payment modal
  const handleCheckout = (method: PaymentMethod) => {
    if (items.length === 0 && serviceItems.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }
    setPaymentMethod(method);
  };

  const handleOwnerWithdrawal = async () => {
    if (items.length === 0 && serviceItems.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }
    setIsOwnerWithdrawal(true);
    await processOwnerWithdrawal();
  };

  const processOwnerWithdrawal = async () => {
    const now = new Date();
    const invoiceNumber = `OWN-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-3)}`;
    
    try {
      // Prepare sale items
      const saleItems = [
        ...items.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          product_code: item.product.code,
          quantity: item.quantity,
          price_per_unit: item.price_per_unit,
          cost_per_unit: item.product.cost_price,
          total_price: item.price_per_unit * item.quantity,
          price_mode: item.price_mode,
          is_service: false,
        })),
        ...serviceItems.map(svc => ({
          product_id: null,
          product_name: `🔧 ${svc.description}`,
          product_code: null,
          quantity: 1,
          price_per_unit: svc.price,
          cost_per_unit: 0,
          total_price: svc.price,
          price_mode: 'retail' as const,
          is_service: true,
        })),
      ];

      // Create sale in Supabase with full discount (owner withdrawal)
      const sale = await createSale({
        store_id: activeStoreId,
        customer_id: selectedCustomer?.id || null,
        invoice_number: invoiceNumber,
        sale_date: now,
        sub_total: grandTotal,
        discount: grandTotal, // Full discount for owner withdrawal
        tax: 0,
        grand_total: 0, // Zero total after discount
        payment_method: 'cash',
        payment_status: 'paid',
        amount_received: 0,
        change_amount: 0,
        note: 'Pengambilan Owner',
        cashier_name: user?.name || 'Owner',
        items: saleItems,
      });

      // Convert to local Sale format for receipt
      const localSale: Sale = {
        id: sale.id,
        store_id: sale.store_id,
        user_id: 1,
        customer_id: sale.customer_id,
        invoice_number: sale.invoice_number,
        date: new Date(sale.sale_date),
        sub_total: sale.sub_total,
        discount: sale.discount,
        tax: sale.tax,
        grand_total: sale.grand_total,
        payment_method: sale.payment_method,
        payment_status: sale.payment_status,
        amount_received: sale.amount_received,
        change_amount: sale.change_amount,
        note: sale.note,
        created_at: new Date(sale.created_at),
        updated_at: new Date(sale.updated_at),
      };

      const localDetails: (SaleDetail & { product?: Product })[] = items.map(item => ({
        id: Date.now(),
        sale_id: sale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_sale: item.price_per_unit,
        cost_at_sale: item.product.cost_price,
        total_price: item.price_per_unit * item.quantity,
        price_mode: item.price_mode,
        product: item.product,
        created_at: now,
        updated_at: now,
      }));

      setCurrentSale(localSale);
      setCurrentSaleDetails(localDetails);
      clearCart();
      setServiceItems([]);
      setShowReceipt(true);
      setSelectedCustomer(null);
      setIsOwnerWithdrawal(false);
      closeBill(activeBillId);
      
      // Reload products to update stock
      loadStoreData();
      
      toast.success("Pengambilan Owner berhasil dicatat!");
    } catch (error) {
      console.error('Error saving owner withdrawal:', error);
      toast.error('Gagal menyimpan pengambilan owner');
      setIsOwnerWithdrawal(false);
    }
  };

  const handleCustomerChangeInPayment = (customer: Customer | null) => {
    setSelectedCustomer(customer);
  };

  const handleConfirmPayment = async (amountPaid: number) => {
    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-3)}`;
    
    try {
      // Prepare sale items
      const saleItems = [
        ...items.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          product_code: item.product.code,
          quantity: item.quantity,
          price_per_unit: item.price_per_unit,
          cost_per_unit: item.product.cost_price,
          total_price: item.price_per_unit * item.quantity,
          price_mode: item.price_mode,
          is_service: false,
        })),
        ...serviceItems.map(svc => ({
          product_id: null,
          product_name: `🔧 ${svc.description}`,
          product_code: null,
          quantity: 1,
          price_per_unit: svc.price,
          cost_per_unit: 0,
          total_price: svc.price,
          price_mode: 'retail' as const,
          is_service: true,
        })),
      ];

      // Create sale in Supabase
      const sale = await createSale({
        store_id: activeStoreId,
        customer_id: selectedCustomer?.id || null,
        invoice_number: invoiceNumber,
        sale_date: now,
        sub_total: grandTotal,
        discount: 0,
        tax: 0,
        grand_total: grandTotal,
        payment_method: paymentMethod!,
        payment_status: isDebt ? 'debt' : 'paid',
        amount_received: isDebt ? 0 : amountPaid,
        change_amount: isDebt ? 0 : Math.max(0, amountPaid - grandTotal),
        due_date: null, // dueDate dihandle via DebtModal, bukan handleConfirmPayment
        cashier_name: user?.name || 'Kasir',
        items: saleItems,
      });

      // Convert to local Sale format for receipt
      const localSale: Sale = {
        id: sale.id,
        store_id: sale.store_id,
        user_id: 1,
        customer_id: sale.customer_id,
        invoice_number: sale.invoice_number,
        date: new Date(sale.sale_date),
        sub_total: sale.sub_total,
        discount: sale.discount,
        tax: sale.tax,
        grand_total: sale.grand_total,
        payment_method: sale.payment_method,
        payment_status: sale.payment_status,
        amount_received: sale.amount_received,
        change_amount: sale.change_amount,
        due_date: sale.due_date ? new Date(sale.due_date) : null,
        created_at: new Date(sale.created_at),
        updated_at: new Date(sale.updated_at),
      };

      const localDetails: (SaleDetail & { product?: Product })[] = items.map(item => ({
        id: Date.now(),
        sale_id: sale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_sale: item.price_per_unit,
        cost_at_sale: item.product.cost_price,
        total_price: item.price_per_unit * item.quantity,
        price_mode: item.price_mode,
        product: item.product,
        created_at: now,
        updated_at: now,
      }));

      setCurrentSale(localSale);
      setCurrentSaleDetails(localDetails);
      setPaymentMethod(null);
      setShowReceipt(true);
      clearCart();
      setServiceItems([]);
      setSelectedCustomer(null);
      setIsDebt(false);
      closeBill(activeBillId);

      // ── Cetak struk + buka laci kasir (satu ESC/POS stream) ─────────────
      // Fire-and-forget: transaksi sudah tersimpan, printer tidak boleh block UX.
      if (!isDebt) {
        const tx: PrinterTransaction = {
          id: String(sale.id),
          invoiceNumber: sale.invoice_number,
          storeName: activeStore?.name ?? 'Toko',
          storeAddress: activeStore?.address,
          storePhone: activeStore?.phone,
          cashierName: user?.name ?? 'Kasir',
          customerName: selectedCustomer?.name,
          paymentMethod: sale.payment_method as PrinterTransaction['paymentMethod'],
          paymentStatus: sale.payment_status as PrinterTransaction['paymentStatus'],
          items: [
            ...items.map(item => ({
              name: item.product.short_name || item.product.name,
              quantity: item.quantity,
              unitPrice: item.price_per_unit,
              totalPrice: item.price_per_unit * item.quantity,
            })),
            ...serviceItems.map(svc => ({
              name: `🔧 ${svc.description}`,
              quantity: 1,
              unitPrice: svc.price,
              totalPrice: svc.price,
            })),
          ],
          subtotal: sale.sub_total,
          discount: sale.discount || undefined,
          grandTotal: sale.grand_total,
          amountReceived: sale.amount_received || undefined,
          change: sale.change_amount || undefined,
          createdAt: sale.created_at,
        };

        printerManager.printReceipt(tx).catch(err => {
          if (err instanceof PrinterError) {
            if (err.code === 'NO_PRINTER') {
              toast.warning('Struk tidak tercetak. Hubungkan printer di menu Pengaturan.');
            } else if (err.code === 'UNSUPPORTED_BROWSER') {
              // silent — browser tidak support, sudah diperingatkan di Settings
            } else {
              console.error('[POS] printReceipt:', err.code, err.message);
            }
          }
        });
      }

      // Reload products to update stock
      loadStoreData();

      toast.success(
        isDebt ? "Penjualan (Utang) berhasil dicatat!" : "Pembayaran berhasil!",
      );
    } catch (error) {
      console.error('Error saving sale:', error);
      toast.error('Gagal menyimpan transaksi');
    }
  };

  const handleConfirmDebt = async (
    opts: {
      dueDate: string;
      shipping?: {
        recipient_name: string;
        recipient_phone: string;
        recipient_address: string;
        shipping_cost: number;
        note?: string;
      };
    },
  ) => {
    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-3)}`;
    
    try {
      // Prepare sale items
      const saleItems = [
        ...items.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          product_code: item.product.code,
          quantity: item.quantity,
          price_per_unit: item.price_per_unit,
          cost_per_unit: item.product.cost_price,
          total_price: item.price_per_unit * item.quantity,
          price_mode: item.price_mode,
          is_service: false,
        })),
        ...serviceItems.map(svc => ({
          product_id: null,
          product_name: `🔧 ${svc.description}`,
          product_code: null,
          quantity: 1,
          price_per_unit: svc.price,
          cost_per_unit: 0,
          total_price: svc.price,
          price_mode: 'retail' as const,
          is_service: true,
        })),
      ];

      // Create sale in Supabase
      const sale = await createSale({
        store_id: activeStoreId,
        customer_id: selectedCustomer?.id || null,
        invoice_number: invoiceNumber,
        sale_date: now,
        sub_total: grandTotal,
        discount: 0,
        tax: 0,
        grand_total: grandTotal,
        payment_method: 'cash',
        payment_status: 'debt',
        amount_received: 0,
        change_amount: 0,
        due_date: new Date(opts.dueDate),
        note: opts.shipping
          ? `Termasuk pengiriman ke ${opts.shipping.recipient_address}`
          : null,
        cashier_name: user?.name || 'Kasir',
        items: saleItems,
      });

      // If shipping requested, create linked shipment record
      if (opts.shipping && selectedCustomer) {
        const itemsDesc = items
          .map((i) => `${i.product.name} x${i.quantity}`)
          .join(", ");
        
        await createShipment({
          store_id: activeStoreId,
          sale_id: sale.id,
          invoice_number: invoiceNumber,
          customer_id: selectedCustomer.id,
          recipient_name: opts.shipping.recipient_name,
          recipient_phone: opts.shipping.recipient_phone,
          recipient_address: opts.shipping.recipient_address,
          items_description: itemsDesc,
          shipping_cost: opts.shipping.shipping_cost,
        });
      }

      // Convert to local Sale format for receipt
      const localSale: Sale = {
        id: sale.id,
        store_id: sale.store_id,
        user_id: 1,
        customer_id: sale.customer_id,
        invoice_number: sale.invoice_number,
        date: new Date(sale.sale_date),
        sub_total: sale.sub_total,
        discount: sale.discount,
        tax: sale.tax,
        grand_total: sale.grand_total,
        payment_method: sale.payment_method,
        payment_status: sale.payment_status,
        amount_received: sale.amount_received,
        change_amount: sale.change_amount,
        due_date: sale.due_date ? new Date(sale.due_date) : null,
        note: sale.note,
        created_at: new Date(sale.created_at),
        updated_at: new Date(sale.updated_at),
      };

      const localDetails: (SaleDetail & { product?: Product })[] = items.map(item => ({
        id: Date.now(),
        sale_id: sale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_sale: item.price_per_unit,
        cost_at_sale: item.product.cost_price,
        total_price: item.price_per_unit * item.quantity,
        price_mode: item.price_mode,
        product: item.product,
        created_at: now,
        updated_at: now,
      }));

      setCurrentSale(localSale);
      setCurrentSaleDetails(localDetails);
      setShowReceipt(true);
      clearCart();
      setServiceItems([]);
      setSelectedCustomer(null);
      setIsDebt(false);
      setShowDebtModal(false);
      closeBill(activeBillId);
      
      // Reload products to update stock
      loadStoreData();
      
      toast.success(
        opts.shipping
          ? "Utang & pengiriman tercatat!"
          : "Penjualan (Utang) berhasil dicatat!",
      );
    } catch (error) {
      console.error('Error saving debt sale:', error);
      toast.error('Gagal menyimpan transaksi utang');
    }
  };

  const handleRefund = async (sale: Sale, reason: string) => {
    try {
      await processRefundService(sale.id, reason);
      // Reload products to update stock
      loadStoreData();
      toast.success(`Refund ${sale.invoice_number} berhasil! Stok dikembalikan.`);
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error('Gagal memproses refund');
    }
  };

  const activeBillCount = bills.filter(
    (b) =>
      b.items.length > 0 ||
      b.serviceItems.length > 0 ||
      (b.id === activeBillId && (items.length > 0 || serviceItems.length > 0)),
  ).length;

  return (
    <div className="flex flex-col bg-surface" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0">
              <img src="/logo.png" alt="Kombeng Baru" className="w-full h-full object-cover" />
            </div>
              <h1 className="text-[15px] font-bold text-foreground tracking-tight">Kombeng Baru</h1>
          </div>
          {activeBillCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
              {activeBillCount} bill
            </span>
          )}
          {canSwitchStore ? (
            <div className="relative">
              <select
                value={activeStoreId}
                onChange={(e) => {
                  setActiveStoreId(Number(e.target.value));
                  clearCart();
                  setServiceItems([]);
                  setBills([createBillWithNumber(1)]);
                  setActiveBillId(1);
                }}
                className="appearance-none pl-7 pr-6 py-1.5 rounded-lg text-[12px] font-medium border border-border bg-white text-foreground cursor-pointer focus:outline-none focus:border-primary"
              >
                {stores
                  .filter(
                    (s) =>
                      accessibleStoreIds.includes(s.id) ||
                      user?.role === "owner",
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
              <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Building2 className="w-3.5 h-3.5" />
              <span className="font-medium">{activeStore?.name || "Toko"}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canAccessMenu(user?.role, "pos") && (
            <button
              onClick={() => setShowRefund(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent active:bg-accent active:text-foreground text-[12px] font-medium transition-colors touch-manipulation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refund</span>
            </button>
          )}
          {canAccessMenu(user?.role, "dashboard") && (
            <Link
              to="/backoffice"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent text-[12px] font-medium transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Office</span>
            </Link>
          )}

          {/* Transport Selector */}
          <TransportSelector />

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface text-foreground text-[12px]">
            {user?.role === "owner" ? (
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            ) : user?.role === "admin" ? (
              <UserCog className="w-3.5 h-3.5 text-primary" />
            ) : (
              <User className="w-3.5 h-3.5 text-primary" />
            )}
            <div className="flex flex-col">
              <span className="font-medium leading-none">{user?.name || "User"}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 capitalize">{user?.role === 'admin' ? 'Admin' : user?.role || "user"}</span>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              navigate("/login");
              toast.success("Logout berhasil");
            }}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Bill Tabs */}
      <div className="flex items-center gap-0 px-4 bg-white border-b border-border overflow-x-auto">
        {bills.map((bill, index) => {
          const isActive = bill.id === activeBillId;
          const billItems = isActive ? items : bill.items;
          const billSvc = isActive ? serviceItems : bill.serviceItems;
          const hasItems = billItems.length > 0 || billSvc.length > 0;
          const billNumber = index + 1; // Dynamic bill number based on index
          return (
            <div
              key={bill.id}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium cursor-pointer transition-colors shrink-0 group border-b-2",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                onClick={() => switchToBill(bill.id)}
                className="flex items-center gap-1.5"
              >
                <FileText className="w-3 h-3" />
                Bill {billNumber}
                {hasItems && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface text-muted-foreground",
                    )}
                  >
                    {billItems.length + billSvc.length}
                  </span>
                )}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeBill(bill.id);
                }}
                className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        <button
          onClick={addNewBill}
          className="flex items-center gap-1 px-3 py-2.5 text-[12px] font-medium text-muted-foreground hover:text-foreground active:text-foreground transition-colors shrink-0 touch-manipulation"
        >
          <Plus className="w-3 h-3" /> Baru
        </button>
      </div>

      {/* Main: 2-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Product Catalog */}
        <div className="w-80 lg:w-96 shrink-0 flex flex-col border-r border-border">
          <div className="px-3 py-2 border-b border-border bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Ketik / scan barcode + ENTER"
                className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg border border-border bg-surface text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <ProductListPanel
            products={filteredStoreProducts}
            selectedIndex={selectedIndex}
            onAddProduct={(product) => {
              if (product.quantity > 0) {
                addItem(product);
                setSearchQuery("");
                setSelectedIndex(0);
                searchRef.current?.focus();
                toast.success(`${product.short_name || product.name} ditambahkan`, {
                  duration: 1000,
                });
              } else toast.error(`${product.short_name || product.name} stok habis`);
            }}
          />
        </div>

        {/* RIGHT: Cart */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-surface">
                  <th className="text-left px-3 py-2.5 text-caption w-10 border-b border-border">
                    No
                  </th>
                  <th className="text-left px-3 py-2.5 text-caption border-b border-border">
                    Nama Barang
                  </th>
                  <th className="text-center px-2 py-2.5 text-caption w-16 border-b border-border">
                    Mode
                  </th>
                  <th className="text-right px-3 py-2.5 text-caption w-28 border-b border-border">
                    Harga
                  </th>
                  <th className="text-center px-2 py-2.5 text-caption w-16 border-b border-border">
                    Qty
                  </th>
                  <th className="text-right px-3 py-2.5 text-caption w-32 border-b border-border">
                    Subtotal
                  </th>
                  <th className="text-center px-2 py-2.5 text-caption w-10 border-b border-border">
                    ×
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && serviceItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-20 text-muted-foreground"
                    >
                      <div className="text-4xl mb-3 opacity-30">📦</div>
                      <p className="text-[15px] font-medium text-foreground">
                        Belum ada barang
                      </p>
                      <p className="text-[12px] mt-1 text-muted-foreground">
                        Pilih dari daftar di kiri atau scan barcode
                      </p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {items.map((item, index) => (
                      <tr
                        key={item.product.id}
                        className="border-b border-border hover:bg-surface/50 transition-colors"
                      >
                        <td className="px-3 py-2 text-[12px] text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2">
                          <p className="text-[13px] font-medium text-foreground">
                            {item.product.short_name || item.product.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            E:
                            {formatCurrency(item.product.selling_price_retail)}{" "}
                            · G:
                            {formatCurrency(
                              item.product.selling_price_wholesale,
                            )}{" "}
                            · S:
                            {formatCurrency(item.product.selling_price_special)}
                          </p>
                        </td>
                        <td className="px-1 py-2 text-center">
                          <button
                            onClick={() => {
                              const modes: PriceMode[] = [
                                "retail",
                                "wholesale",
                                "special",
                              ];
                              const idx = modes.indexOf(item.price_mode);
                              setPriceMode(
                                item.product.id,
                                modes[(idx + 1) % modes.length],
                              );
                            }}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors w-full",
                              item.price_mode === "special"
                                ? "bg-primary-light text-primary"
                                : item.price_mode === "wholesale"
                                  ? "bg-blue-50 text-blue-600"
                                  : "bg-surface text-muted-foreground",
                            )}
                          >
                            {item.price_mode === "special"
                              ? "SPL"
                              : item.price_mode === "wholesale"
                                ? "GRS"
                                : "ECR"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right text-[13px] font-medium text-foreground tabular-nums">
                          {formatCurrency(item.price_per_unit)}
                        </td>
                        <td className="px-1 py-2 text-center">
                          <CartQtyInput
                            item={item}
                            updateQuantity={updateQuantity}
                            searchRef={searchRef}
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-[13px] font-medium text-primary tabular-nums">
                          {formatCurrency(item.price_per_unit * item.quantity)}
                        </td>
                        <td className="px-1 py-2 text-center">
                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Service Items */}
                    {serviceItems.map((svc, index) => (
                      <tr
                        key={`svc-${svc.id}`}
                        className="border-b border-border hover:bg-surface/50 transition-colors"
                      >
                        <td className="px-3 py-2 text-[12px] text-muted-foreground">
                          {items.length + index + 1}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-[hsl(40,72%,42%)]" />
                            <p className="text-[13px] font-medium text-foreground">
                              {svc.description}
                            </p>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Biaya Jasa
                          </p>
                        </td>
                        <td className="px-1 py-2 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[hsl(40,72%,42%)]/10 text-[hsl(40,72%,42%)]">
                            JASA
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-[13px] font-medium text-foreground tabular-nums">
                          {formatCurrency(svc.price)}
                        </td>
                        <td className="px-1 py-2 text-center">
                          <span className="text-[13px] text-muted-foreground">
                            1
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-[13px] font-medium text-primary tabular-nums">
                          {formatCurrency(svc.price)}
                        </td>
                        <td className="px-1 py-2 text-center">
                          <button
                            onClick={() => removeService(svc.id)}
                            className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Service Input Row */}
          {showServiceInput && (
            <div className="px-4 py-2 border-t border-border bg-white flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-[hsl(40,72%,42%)] shrink-0" />
              <input
                type="text"
                placeholder="Deskripsi jasa"
                value={serviceDesc}
                onChange={(e) => setServiceDesc(e.target.value)}
                className="flex-1 px-3 py-1.5 text-[13px] rounded-lg border border-border bg-surface focus:border-primary focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddService();
                }}
              />
              <input
                type="number"
                placeholder="Harga"
                value={servicePrice}
                onChange={(e) => setServicePrice(e.target.value)}
                className="w-28 px-3 py-1.5 text-[13px] rounded-lg border border-border bg-surface text-right focus:border-primary focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddService();
                }}
              />
              <button
                onClick={handleAddService}
                className="px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setShowServiceInput(false);
                  setServiceDesc("");
                  setServicePrice("");
                }}
                className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-border bg-white px-4 py-3">
            {selectedCustomer && (
              <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-primary-light rounded-lg w-fit">
                <User className="w-3.5 h-3.5 text-primary" />
                <span className="text-[12px] font-medium text-primary">
                  {selectedCustomer.name}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  • {selectedCustomer.phone}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-caption">
                    TOTAL ({items.length} item
                    {serviceItems.length > 0
                      ? ` + ${serviceItems.length} jasa`
                      : ""}
                    )
                  </span>
                  <div
                    className="text-[22px] font-medium text-foreground tabular-nums"
                    style={{ letterSpacing: "-0.5px" }}
                  >
                    {formatCurrency(grandTotal)}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isDebt}
                    onChange={(e) => setIsDebt(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border accent-primary"
                  />
                  <span className="text-[12px] font-medium text-foreground">
                    Utang
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowServiceInput(!showServiceInput)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-[12px] font-medium transition-colors flex items-center gap-1.5",
                    showServiceInput
                      ? "bg-[hsl(40,72%,42%)] text-white"
                      : "border border-border text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                >
                  <Wrench className="w-3.5 h-3.5" /> JASA
                </button>

                {!isDebt && (user?.role === "owner" || user?.role === "admin") && (
                  <div className="relative group">
                    <button
                      onClick={handleOwnerWithdrawal}
                      disabled={items.length === 0 && serviceItems.length === 0}
                      className="px-3 py-2 rounded-lg bg-[hsl(40,72%,42%)] hover:bg-[hsl(40,72%,36%)] text-white text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      title="Ambil produk tanpa pembayaran — tercatat sebagai pengambilan internal"
                    >
                      <Crown className="w-3.5 h-3.5" /> AMBIL (OWNER)
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-foreground text-white text-[11px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                      <Info className="w-3 h-3 inline mr-1" />
                      Ambil produk tanpa bayar — terdata sebagai pengambilan
                      internal
                    </div>
                  </div>
                )}

                {isDebt ? (
                  <button
                    onClick={() => {
                      if (items.length === 0 && serviceItems.length === 0) {
                        toast.error("Keranjang kosong");
                        return;
                      }
                      setShowDebtModal(true);
                    }}
                    disabled={items.length === 0 && serviceItems.length === 0}
                    className="px-4 py-2 min-h-[44px] rounded-lg bg-[hsl(40,72%,42%)] hover:bg-[hsl(40,72%,36%)] active:bg-[hsl(40,72%,30%)] active:scale-[0.97] text-white text-[12px] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    SIMPAN UTANG
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleCheckout("cash")}
                      disabled={items.length === 0 && serviceItems.length === 0}
                      className="px-4 py-2 min-h-[44px] rounded-lg bg-primary hover:bg-primary/90 active:bg-primary/80 active:scale-[0.97] text-primary-foreground text-[12px] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    >
                      TUNAI
                    </button>
                    <button
                      onClick={() => handleCheckout("transfer")}
                      disabled={items.length === 0 && serviceItems.length === 0}
                      className="px-4 py-2 min-h-[44px] rounded-lg bg-primary hover:bg-primary/90 active:bg-primary/80 active:scale-[0.97] text-primary-foreground text-[12px] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    >
                      TRANSFER
                    </button>
                    <button
                      onClick={() => handleCheckout("qris")}
                      disabled={items.length === 0 && serviceItems.length === 0}
                      className="px-4 py-2 min-h-[44px] rounded-lg bg-primary hover:bg-primary/90 active:bg-primary/80 active:scale-[0.97] text-primary-foreground text-[12px] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    >
                      QRIS
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals — combined payment modal with customer selection */}
      {paymentMethod && !isDebt && (
        <PaymentModal
          isOpen={!!paymentMethod}
          onClose={() => setPaymentMethod(null)}
          items={items}
          total={grandTotal}
          paymentMethod={paymentMethod}
          onConfirm={handleConfirmPayment}
          storeId={activeStoreId}
          selectedCustomer={selectedCustomer}
          onCustomerChange={handleCustomerChangeInPayment}
          requireCustomer={false}
        />
      )}
      <ShippingModal
        isOpen={showShipping}
        onClose={() => setShowShipping(false)}
        items={items}
        total={grandTotal}
        customer={selectedCustomer}
      />
      <DebtModal
        isOpen={showDebtModal}
        onClose={() => setShowDebtModal(false)}
        items={items}
        serviceItems={serviceItems}
        total={grandTotal}
        storeId={activeStoreId}
        selectedCustomer={selectedCustomer}
        onCustomerChange={setSelectedCustomer}
        onConfirm={(opts) => handleConfirmDebt(opts)}
      />
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        sale={currentSale}
        saleDetails={currentSaleDetails}
        cashierName={user?.name || "Kasir"}
        customerName={
          currentSale?.customer_id
            ? customers.find((c) => c.id === currentSale.customer_id)?.name
            : undefined
        }
        customerPhone={
          currentSale?.customer_id
            ? customers.find((c) => c.id === currentSale.customer_id)?.phone
            : undefined
        }
        store={activeStore}
      />
      <RefundModal
        isOpen={showRefund}
        onClose={() => setShowRefund(false)}
        storeId={activeStoreId}
        onRefund={handleRefund}
      />
    </div>
  );
}
