/**
 * Date utility functions for handling local dates and timezones
 *
 * IMPORTANT: Use getLocalDate() instead of new Date().toISOString().split('T')[0]
 * to get the date in the user's local timezone, not UTC.
 *
 * Example:
 * - User in Morocco (GMT+1) creates entry at 2025-01-21 23:30 local time
 * - toISOString().split('T')[0] gives "2025-01-21" (UTC date: 2025-01-21 22:30)
 * - But if created at 2025-01-21 00:30 local time (UTC: 2024-12-31 23:30)
 * - toISOString().split('T')[0] would give "2024-12-31" (wrong day!)
 */

/**
 * Get current local date in YYYY-MM-DD format
 * Uses the user's local timezone, not UTC
 */
export function getLocalDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date object to local date string (YYYY-MM-DD)
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get local date string offset by days from now
 * @param days Number of days to offset (positive for future, negative for past)
 */
export function getLocalDateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

/**
 * Parse a local date string (YYYY-MM-DD) and return a Date object
 * Note: This creates a Date at midnight local time
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a date to local datetime string for display
 * @param date Date object or ISO string
 * @param includeTime Whether to include time component
 */
export function formatLocalDateTime(date: Date | string, includeTime = true): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (includeTime) {
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Get current local datetime in ISO-like format (YYYY-MM-DDTHH:mm:ss)
 * Uses local timezone instead of UTC
 */
export function getLocalDateTime(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}
