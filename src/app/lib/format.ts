/**
 * Formatting utilities for UI display
 * Keep ALL UI formatting logic here
 */

/**
 * Shorten long blockchain addresses
 * 0x1234...abcd
 */
export function formatAddress(
  address?: string | null,
  chars = 4
): string {
  if (!address) return '—';

  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format token amounts (TBNT)
 */
export function formatTokenAmount(
  amount?: number | string,
  decimals = 2
): string {
  if (amount === undefined || amount === null) return '0';

  const num = Number(amount);
  if (Number.isNaN(num)) return '0';

  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format ISO date to readable UI format
 * Example: Jan 25, 2026
 */
export function formatDate(date?: string | Date): string {
  if (!date) return '—';

  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date + time
 * Example: Jan 25, 2026 • 14:32
 */
export function formatDateTime(date?: string | Date): string {
  if (!date) return '—';

  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Human-friendly status labels
 */
export function formatStatus(status?: string): string {
  if (!status) return 'Unknown';

  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
