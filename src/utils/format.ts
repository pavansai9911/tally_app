export function formatCurrency(amount: number, symbol: string = '₹'): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return `${sign}${symbol}${formatted}`;
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = todayKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);
  const dKey = dateStr.slice(0, 10);

  if (dKey === today) return 'Today';
  if (dKey === yKey) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
