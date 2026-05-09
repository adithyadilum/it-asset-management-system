import { format } from 'date-fns';

/**
 * Formats a date string or Date object to a standard 'MM/dd/yyyy' format.
 * Includes safe fallback for null/undefined values.
 */
export function formatDate(date: string | Date | null | undefined, formatString: string = 'MM/dd/yyyy'): string {
  if (!date) return 'N/A';
  try {
    return format(new Date(date), formatString);
  } catch {
    return 'Invalid Date';
  }
}
