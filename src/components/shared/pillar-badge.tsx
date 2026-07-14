import { Code, Laptop, Monitor, Sofa } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RegistryPillar } from '@/lib/data/asset-registry-repo';

interface PillarBadgeProps {
  pillar: string;
  className?: string;
}

export function PillarBadge({ pillar, className }: PillarBadgeProps) {
  let colorClass = '';
  let Icon = Laptop;

  switch (pillar as RegistryPillar) {
    case 'Hardware':
      colorClass =
        'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800 dark:hover:bg-indigo-900/40';
      Icon = Laptop;
      break;
    case 'Software':
      colorClass =
        'bg-violet-50 text-violet-700 border-violet-300 hover:bg-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800 dark:hover:bg-violet-900/40';
      Icon = Code;
      break;
    case 'Office Furniture':
      colorClass =
        'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/40';
      Icon = Sofa;
      break;
    case 'Office Electronics':
      colorClass =
        'bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800 dark:hover:bg-teal-900/40';
      Icon = Monitor;
      break;
    default:
      colorClass =
        'bg-muted text-foreground border-gray-300 hover:bg-muted dark:bg-zinc-900/30 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-900/50';
      Icon = Laptop;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'flex w-fit items-center gap-1.5 px-2.5 py-0.5 whitespace-nowrap',
        colorClass,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="font-medium">{pillar}</span>
    </Badge>
  );
}
