import { differenceInDays } from 'date-fns';
import { StatusBadge } from '@/components/shared/status-badge';
import { isSoftwareLicenseExpired } from '@/lib/software-license-status';
import { cn } from '@/lib/utils';

interface SoftwareExpiryStatusProps {
  status: string;
  expiryDate?: string | Date | null;
  className?: string;
}

export function SoftwareExpiryStatus({
  status,
  expiryDate,
  className,
}: SoftwareExpiryStatusProps) {
  let daysLeftText = '';
  let daysLeftClass = 'text-muted-foreground';

  if (expiryDate) {
    const daysLeft = differenceInDays(new Date(expiryDate), new Date());
    if (isSoftwareLicenseExpired(expiryDate)) {
      daysLeftText = 'Expired';
      daysLeftClass = 'text-red-600 font-medium';
    } else {
      daysLeftText = `${daysLeft} days left`;
      if (daysLeft <= 30) {
        daysLeftClass = 'text-amber-600 font-medium';
      } else {
        daysLeftClass = 'text-green-600';
      }
    }
  } else {
    daysLeftText = 'Perpetual';
  }

  return (
    <div className={cn('flex flex-col gap-1 items-start', className)}>
      <StatusBadge value={status} />
      <span className={cn('text-xs whitespace-nowrap', daysLeftClass)}>
        {daysLeftText}
      </span>
    </div>
  );
}
