import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  BadgeCheck,
  AlertCircle,
  MinusCircle,
  Sparkles,
  Wrench,
  Archive,
  AlertTriangle,
  XCircle,
  HelpCircle,
  CircleDot,
  LucideIcon,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { STATUS_THEMES } from '@/lib/constants';

// 1. Define the distinct domains we are badging
export type BadgeType = 'assetStatus' | 'hardwareCondition' | 'userRole';
export type StatusBadgeVariant = 'default' | 'linkedAssets' | 'metadata';

// 2. The Configuration Dictionary (The Single Source of Truth)
const BADGE_DICTIONARY: Record<
  string,
  { label: string; className: string; icon: LucideIcon }
> = {
  // Asset Statuses
  available: {
    label: 'Available',
    className:
      'bg-green-50 text-green-700 border-green-400 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
    icon: CheckCircle2,
  },
  assigned: {
    label: 'Assigned',
    className:
      'bg-muted text-foreground border-slate-400 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800',
    icon: BadgeCheck,
  },
  new: {
    label: 'New',
    className:
      'bg-blue-50 text-blue-700 border-blue-400 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
    icon: Sparkles,
  },
  in_repair: {
    label: 'In Repair',
    className:
      'bg-purple-50 text-purple-700 border-purple-400 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
    icon: Wrench,
  },
  lost: {
    label: 'Lost',
    className:
      'bg-amber-50 text-amber-700 border-amber-400 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    icon: AlertCircle,
  },
  defective: {
    label: 'Defective',
    className:
      'bg-red-50 text-red-700 border-red-400 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
    icon: MinusCircle,
  },
  archived: {
    label: 'Archived',
    className:
      'bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground dark:border-border',
    icon: Archive,
  },
  active: {
    label: 'Active',
    className:
      'bg-lime-50 text-lime-700 border-lime-300 dark:bg-lime-950/30 dark:text-lime-400 dark:border-lime-800',
    icon: CheckCircle2,
  },
  inactive: {
    label: 'Inactive',
    className:
      'bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground dark:border-border',
    icon: MinusCircle,
  },

  // Hardware Conditions
  pristine: {
    label: 'Pristine',
    className:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
    icon: CheckCircle2,
  },
  damaged: {
    label: 'Damaged',
    className:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
    icon: AlertTriangle,
  },
  broken: {
    label: 'Broken',
    className:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
    icon: XCircle,
  },

  // Pending Alert States
  critical: {
    label: 'Critical',
    className:
      'bg-red-50 text-red-700 border-red-400 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
    icon: AlertTriangle,
  },
  warning: {
    label: 'Warning',
    className:
      'bg-amber-50 text-amber-700 border-amber-400 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    icon: AlertCircle,
  },
  neutral: {
    label: 'Neutral',
    className:
      'bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground dark:border-border',
    icon: MinusCircle,
  },

  // User Roles
  GlobalAdmin: {
    label: 'Global Admin',
    className:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
    icon: CheckCircle2,
  },
  ITOperator: {
    label: 'IT Operator',
    className:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800',
    icon: CheckCircle2,
  },
  Employee: {
    label: 'Employee',
    className:
      'bg-muted text-foreground border-border dark:bg-muted dark:text-foreground dark:border-border',
    icon: CheckCircle2,
  },

  // Additional Asset Statuses
  retired: {
    label: 'Retired',
    className:
      'bg-stone-50 text-stone-600 border-stone-300 dark:bg-stone-900/30 dark:text-stone-400 dark:border-stone-800',
    icon: Archive,
  },
  pending_disposal: {
    label: 'Pending Disposal',
    className:
      'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800',
    icon: AlertTriangle,
  },
  disposed: {
    label: 'Disposed',
    className:
      'bg-muted text-muted-foreground border-border [&>svg]:text-green-600 dark:bg-muted dark:text-muted-foreground dark:border-border dark:[&>svg]:text-green-400',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    className:
      'bg-muted text-muted-foreground border-border [&>svg]:text-red-500 dark:bg-muted dark:text-muted-foreground dark:border-border dark:[&>svg]:text-red-400',
    icon: XCircle,
  },
  returned: {
    label: 'Returned',
    className:
      'bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800',
    icon: CheckCircle2,
  },
  expired: {
    label: 'Expired',
    className:
      'bg-red-50 text-red-700 border-red-400 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
    icon: XCircle,
  },
  full: {
    label: 'Full',
    className:
      'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
    icon: AlertTriangle,
  },
};

// Fallback for unknown strings
const FALLBACK = {
  label: 'Unknown',
  className:
    'bg-muted text-foreground border-border dark:bg-muted dark:text-foreground dark:border-border',
  icon: HelpCircle,
};

interface StatusBadgeProps {
  value?: string;
  variant?: StatusBadgeVariant;
  count?: number;
  label?: string;
  showIcon?: boolean;
  className?: string;
  colorTheme?: string;
  iconName?: string;
}

export function StatusBadge({
  value,
  variant = 'default',
  count,
  label,
  showIcon = true,
  className,
  colorTheme,
  iconName,
}: StatusBadgeProps) {
  if (variant === 'linkedAssets') {
    const normalizedCount = Number.isFinite(count)
      ? Math.max(0, Math.trunc(count ?? 0))
      : 0;
    const linkedAssetLabel = `${normalizedCount} ${normalizedCount === 1 ? 'Asset' : 'Assets'}`;

    return (
      <Badge
        variant="outline"
        className={cn(
          'font-medium whitespace-nowrap bg-muted text-foreground border-border',
          className
        )}
      >
        {linkedAssetLabel}
      </Badge>
    );
  }

  if (variant === 'metadata') {
    const metadataLabel = label ?? value ?? '-';

    return (
      <Badge
        variant="outline"
        className={cn(
          'font-medium whitespace-nowrap bg-muted text-foreground border-border',
          className
        )}
      >
        {metadataLabel}
      </Badge>
    );
  }

  const normalizedValue = typeof value === 'string' ? value : '';

  // 1. Try to find in dictionary first (built-in statuses)
  const dictionaryConfig =
    BADGE_DICTIONARY[normalizedValue] ??
    BADGE_DICTIONARY[normalizedValue.trim().toLowerCase().replace(/\s+/g, '_')];

  // 2. If it's a custom status with theme/icon props
  if (colorTheme || iconName) {
    const Icon =
      (LucideIcons as unknown as Record<string, LucideIcon>)[iconName || ''] ||
      CircleDot;
    const themeClass =
      STATUS_THEMES[colorTheme as keyof typeof STATUS_THEMES] ||
      FALLBACK.className;

    return (
      <Badge
        variant="outline"
        className={cn(
          'font-medium gap-1.5 whitespace-nowrap',
          themeClass,
          className
        )}
      >
        {showIcon && <Icon className="h-3.5 w-3.5" />}
        {label ?? value}
      </Badge>
    );
  }

  // 3. Fallback to dictionary or general fallback
  const resolvedConfig = dictionaryConfig ?? FALLBACK;
  const displayLabel =
    label ??
    (dictionaryConfig
      ? resolvedConfig.label
      : normalizedValue || FALLBACK.label);
  const Icon = resolvedConfig.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium gap-1.5 whitespace-nowrap',
        resolvedConfig.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      {displayLabel}
    </Badge>
  );
}
