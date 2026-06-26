import * as React from 'react';

interface DateFormattedProps extends React.HTMLAttributes<HTMLSpanElement> {
  date: Date | string | number | null | undefined;
  /**
   * The style of the formatted date.
   * - `short`: e.g. "Oct 12, 2024"
   * - `long`: e.g. "October 12, 2024"
   * - `numeric`: e.g. "10/12/2024" (Standardized to en-GB: DD/MM/YYYY)
   */
  format?: 'short' | 'long' | 'numeric';
  fallback?: string;
}

/**
 * Standardized date rendering component.
 * Ensures dates look identical across all lists, cards, and export views.
 */
export function DateFormatted({
  date,
  format = 'numeric',
  fallback = '-',
  ...props
}: DateFormattedProps) {
  if (!date) {
    return <span {...props}>{fallback}</span>;
  }

  const parsedDate = new Date(date);
  
  if (Number.isNaN(parsedDate.getTime())) {
    return <span {...props}>{fallback}</span>;
  }

  let formattedValue = '';

  switch (format) {
    case 'short':
      formattedValue = parsedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      break;
    case 'long':
      formattedValue = parsedDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      break;
    case 'numeric':
    default:
      // Standardizing the most common layout to en-GB (DD/MM/YYYY) for business data
      formattedValue = parsedDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      break;
  }

  return <span {...props}>{formattedValue}</span>;
}
