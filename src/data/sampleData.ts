import { Product, Category, Transaction } from '@/types/pos';

export const categories: Category[] = [
  { id: 'all', name: 'Semua', icon: '🏷️' },
  { id: 'food', name: 'Makanan', icon: '🍔' },
  { id: 'drink', name: 'Minuman', icon: '🥤' },
  { id: 'snack', name: 'Snack', icon: '🍿' },
  { id: 'dessert', name: 'Dessert', icon: '🍰' },
];

export const products: Product[] = [
  { id: '1', name: 'Nasi Goreng Spesial', price: 25000, category: 'food', stock: 50 },
  { id: '2', name: 'Mie Goreng', price: 22000, category: 'food', stock: 45 },
  { id: '3', name: 'Ayam Bakar', price: 35000, category: 'food', stock: 30 },
  { id: '4', name: 'Sate Ayam (10 tusuk)', price: 30000, category: 'food', stock: 40 },
  { id: '5', name: 'Es Teh Manis', price: 5000, category: 'drink', stock: 100 },
  { id: '6', name: 'Es Jeruk', price: 8000, category: 'drink', stock: 80 },
  { id: '7', name: 'Kopi Susu', price: 15000, category: 'drink', stock: 60 },
  { id: '8', name: 'Jus Alpukat', price: 18000, category: 'drink', stock: 40 },
  { id: '9', name: 'Keripik Singkong', price: 12000, category: 'snack', stock: 35 },
  { id: '10', name: 'Kentang Goreng', price: 15000, category: 'snack', stock: 50 },
  { id: '11', name: 'Es Krim Vanilla', price: 10000, category: 'dessert', stock: 25 },
  { id: '12', name: 'Brownies', price: 20000, category: 'dessert', stock: 20 },
];

export const sampleTransactions: Transaction[] = [
  {
    id: 'TRX001',
    items: [
      { product: products[0], quantity: 2 },
      { product: products[4], quantity: 2 },
    ],
    total: 60000,
    paymentMethod: 'cash',
    amountPaid: 100000,
    change: 40000,
    createdAt: new Date('2024-01-15T10:30:00'),
    cashier: 'Admin',
  },
  {
    id: 'TRX002',
    items: [
      { product: products[2], quantity: 1 },
      { product: products[6], quantity: 2 },
    ],
    total: 65000,
    paymentMethod: 'qris',
    amountPaid: 65000,
    change: 0,
    createdAt: new Date('2024-01-15T11:45:00'),
    cashier: 'Admin',
  },
  {
    id: 'TRX003',
    items: [
      { product: products[3], quantity: 2 },
      { product: products[7], quantity: 2 },
    ],
    total: 96000,
    paymentMethod: 'card',
    amountPaid: 96000,
    change: 0,
    createdAt: new Date('2024-01-15T14:20:00'),
    cashier: 'Admin',
  },
];
