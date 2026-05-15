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
    case 'IT & Digital':
      colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100';
      Icon = Laptop;
      break;
    case 'Software':
      colorClass = 'bg-violet-50 text-violet-700 border-violet-300 hover:bg-violet-100';
      Icon = Code;
      break;
    case 'Office Furniture':
      colorClass = 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100';
      Icon = Sofa;
      break;
    case 'Office Electronics':
      colorClass = 'bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100';
      Icon = Monitor;
      break;
    default:
      colorClass = 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100';
      Icon = Laptop;
  }

  return (
    <Badge
      variant="outline"
      className={cn('flex w-fit items-center gap-1.5 px-2.5 py-0.5 whitespace-nowrap', colorClass, className)}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="font-medium">{pillar}</span>
    </Badge>
  );
}
