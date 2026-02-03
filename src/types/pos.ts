export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'qris';
  amountPaid: number;
  change: number;
  createdAt: Date;
  cashier: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export type PaymentMethod = 'cash' | 'card' | 'qris';
