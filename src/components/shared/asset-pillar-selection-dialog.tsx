'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Monitor, Armchair, Speaker, Code } from 'lucide-react';

export const PILLAR_OPTIONS = [
  {
    label: 'Hardware',
    slug: 'hardware',
    icon: Monitor,
    description: 'Laptops, desktops, servers, and networking equipment',
  },
  {
    label: 'Office Furniture',
    slug: 'furniture',
    icon: Armchair,
    description: 'Desks, chairs, tables, and storage units',
  },
  {
    label: 'Office Electronics',
    slug: 'office-electronics',
    icon: Speaker,
    description: 'Phones, monitors, printers, and A/V equipment',
  },
  {
    label: 'Software',
    slug: 'software',
    icon: Code,
    description: 'Software licenses and subscriptions',
  },
] as const;

interface AssetPillarSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (slug: string) => void;
}

export function AssetPillarSelectionDialog({
  open,
  onOpenChange,
  onSelect,
}: AssetPillarSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Asset Pillar</DialogTitle>
          <DialogDescription>
            Choose the category of asset you want to register.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {PILLAR_OPTIONS.map((pillar) => (
            <button
              key={pillar.slug}
              onClick={() => onSelect(pillar.slug)}
              className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-center transition-all duration-200 hover:border-primary hover:bg-accent hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <pillar.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {pillar.label}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                  {pillar.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
