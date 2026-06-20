import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/**
 * Returns a compact human-readable relative time string.
 *
 * - < 60 min ago: "Xm ago"
 * - < 24 h ago:   "Xh ago"
 * - Same calendar year: "Mon DD" (e.g. "Jun 20")
 * - Prior year:   "Mon DD, YYYY" (e.g. "Jun 20, 2025")
 *
 * Returns "" on invalid input. Does not throw.
 */
export function formatRelativeTime(date: Date | string | number): string {
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';

    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);

    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    const currentYear = new Date().getFullYear();
    const year = d.getFullYear();
    const month = MONTH_NAMES[d.getMonth()];
    const day = d.getDate();

    if (year === currentYear) return `${month} ${day}`;
    return `${month} ${day}, ${year}`;
  } catch {
    return '';
  }
}
