// ================ STORE & MULTI-TOKO ================
export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  logo?: string;
  receiptFooter?: string;
  isActive: boolean;
  createdAt: Date;
}

// ================ PRODUCT MANAGEMENT ================
export interface Category {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

export interface Brand {
  id: string;
  name: string;
  logo?: string;
}

export interface Unit {
  id: string;
  name: string;
  shortName: string; // e.g., "pcs", "kg", "ltr"
}

export interface UnitConversion {
  id: string;
  productId: string;
  fromUnitId: string;
  toUnitId: string;
  conversionRate: number; // e.g., 1 karton = 12 pcs
  barcode?: string;
  buyPrice: number;
  sellPrice: number;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description?: string;
  categoryId: string;
  brandId?: string;
  baseUnitId: string;
  buyPrice: number; // Harga modal
  sellPrice: number; // Harga jual
  image?: string;
  minStock: number; // Stok minimum untuk alert
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ================ STOCK MANAGEMENT ================
export interface StockPerStore {
  id: string;
  productId: string;
  storeId: string;
  quantity: number;
  lastUpdated: Date;
}

export interface StockMovement {
  id: string;
  productId: string;
  storeId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previousQty: number;
  newQty: number;
  reference: string; // TRX ID, SO ID, or Transfer ID
  notes?: string;
  createdBy: string;
  createdAt: Date;
}

export interface StockOpname {
  id: string;
  storeId: string;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  createdBy: string;
  approvedBy?: string;
  notes?: string;
}

export interface StockOpnameItem {
  id: string;
  stockOpnameId: string;
  productId: string;
  systemQty: number;
  actualQty: number;
  difference: number;
  notes?: string;
}


// ================ SUPPLIER ================
export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  isActive: boolean;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  storeId: string;
  status: 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled';
  totalAmount: number;
  createdBy: string;
  createdAt: Date;
  receivedAt?: Date;
  notes?: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  quantityReceived?: number;
}

// ================ TRANSACTION ================
export interface CartItem {
  product: Product;
  quantity: number;
  unitId: string;
  pricePerUnit: number;
  discount?: number;
}

export interface Transaction {
  id: string;
  storeId: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  customerId?: string;
  createdAt: Date;
  cashierId: string;
  cashierName: string;
  notes?: string;
}

export interface TransactionReturn {
  id: string;
  originalTransactionId: string;
  storeId: string;
  items: ReturnItem[];
  totalRefund: number;
  reason: string;
  createdBy: string;
  createdAt: Date;
}

export interface ReturnItem {
  productId: string;
  quantity: number;
  refundAmount: number;
}

export type PaymentMethod = 'cash' | 'card' | 'qris' | 'transfer';

// ================ CUSTOMER ================
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  points: number;
  totalSpent: number;
  createdAt: Date;
}

// ================ USER & ROLES ================
export type UserRole = 'owner' | 'admin' | 'cashier';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  storeIds: string[]; // Toko yang bisa diakses
  isActive: boolean;
  createdAt: Date;
}

// ================ EXPENSE ================
export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  storeId: string;
  categoryId: string;
  amount: number;
  description: string;
  date: Date;
  createdBy: string;
  receipt?: string;
}

// ================ LEGACY SUPPORT (for existing components) ================
export interface LegacyProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  stock: number;
}

export interface LegacyCategory {
  id: string;
  name: string;
  icon: string;
}
