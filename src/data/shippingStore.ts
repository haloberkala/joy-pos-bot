import { customers } from '@/data/sampleData';

export type ShippingStatus = 'pending' | 'shipped' | 'delivered' | 'cancelled';

export interface Shipment {
  id: number;
  store_id: number;
  sale_id: number | null;
  invoice_number: string;
  customer_id: number;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  items_description?: string;
  note?: string;
  shipping_cost: number;
  status: ShippingStatus;
  created_at: Date;
  updated_at: Date;
}

// Shared mutable store
let shipments: Shipment[] = [
  {
    id: 1, store_id: 1, sale_id: 1, invoice_number: 'INV-20240115-001',
    customer_id: 1, recipient_name: 'Pak Joko Kontraktor', recipient_phone: '08123456789',
    recipient_address: 'Jl. Mangga No. 10, Banjarmasin', note: 'Antar pagi sebelum jam 10',
    shipping_cost: 50000, status: 'delivered',
    created_at: new Date('2024-01-15'), updated_at: new Date('2024-01-16'),
  },
  {
    id: 2, store_id: 1, sale_id: 4, invoice_number: 'INV-20240116-001',
    customer_id: 1, recipient_name: 'Pak Joko Kontraktor', recipient_phone: '08123456789',
    recipient_address: 'Proyek Jl. Ahmad Yani KM 5, Banjarmasin', note: 'Bawa ke lokasi proyek',
    shipping_cost: 75000, status: 'shipped',
    created_at: new Date('2024-01-16'), updated_at: new Date('2024-01-16'),
  },
  {
    id: 3, store_id: 2, sale_id: 3, invoice_number: 'INV-20240115-003',
    customer_id: 3, recipient_name: 'Budi Santoso', recipient_phone: '08111222333',
    recipient_address: 'Jl. Rambutan No. 5, Banjarmasin',
    shipping_cost: 25000, status: 'pending',
    created_at: new Date('2024-01-15'), updated_at: new Date('2024-01-15'),
  },
];

// Event listeners for reactivity
type Listener = () => void;
const listeners: Listener[] = [];

export function subscribeShipments(fn: Listener) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function notify() {
  listeners.forEach(fn => fn());
}

export function getShipments(): Shipment[] {
  return shipments;
}

export function getShipmentsForStore(storeId: number): Shipment[] {
  return shipments.filter(s => s.store_id === storeId);
}

export function addShipment(shipment: Shipment) {
  shipments = [shipment, ...shipments];
  notify();
}

export function updateShipmentStatus(id: number, status: ShippingStatus) {
  shipments = shipments.map(s =>
    s.id === id ? { ...s, status, updated_at: new Date() } : s
  );
  notify();
}

export function handleCustomerSelectForShipping(customerId: number) {
  const customer = customers.find(c => c.id === customerId);
  return customer ? { name: customer.name, phone: customer.phone, address: customer.address || '' } : null;
}

export const statusConfig: Record<ShippingStatus, { label: string; className: string }> = {
  pending: { label: 'Menunggu', className: 'bg-yellow-100 text-yellow-700' },
  shipped: { label: 'Dikirim', className: 'bg-blue-100 text-blue-700' },
  delivered: { label: 'Sampai', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Dibatalkan', className: 'bg-red-100 text-red-700' },
};
