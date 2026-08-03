export function formatCurrency(amount: number | null | undefined): string {
  const safe = Number(amount);
  if (isNaN(safe) || amount == null) return 'Rp0';
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
}

export const formatRupiah = formatCurrency;

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function generateTransactionId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TRX${timestamp}${random}`;
}

export function formatMonthYear(date: Date | null = null): string {
  const dateToFormat = date || new Date();
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(dateToFormat);
}

/**
 * Format time string to 24-hour format (HH:mm)
 * @param timeStr - Time string in various formats
 * @returns Formatted time string in HH:mm format
 */
export function formatTime24h(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const parts = timeStr.match(/(\d+):(\d+)/);
  if (parts) return `${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
  return timeStr;
}
