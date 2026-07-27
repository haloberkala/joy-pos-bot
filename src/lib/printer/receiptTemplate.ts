/**
 * Receipt Template Helpers
 * Shared utilities untuk UI receipt dan fallback browser print
 */

export function formatReceiptDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('id-ID', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
}

export function formatReceiptTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    'cash': 'Tunai',
    'qris': 'QRIS',
    'transfer': 'Transfer',
  };
  return labels[method] || method;
}
