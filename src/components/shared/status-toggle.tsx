'use client';

import { useId } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface StatusToggleProps {
  isActive: boolean;
  onToggle: (checked: boolean) => void;
  activeText?: string;
  inactiveText?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function StatusToggle({
  isActive,
  onToggle,
  activeText = 'Active',
  inactiveText = 'Inactive',
  disabled = false,
  className,
  id,
}: StatusToggleProps) {
  // Generates a unique ID automatically if one isn't provided
  const generatedId = useId();
  const toggleId = id || `status-toggle-${generatedId}`;

  return (
    <div className={cn('flex items-center space-x-3', className)}>
      <Switch
        id={toggleId}
        checked={isActive}
        onCheckedChange={onToggle}
        disabled={disabled}
      />
      <Label
        htmlFor={toggleId}
        className={cn(
          'text-sm font-medium transition-colors',
          isActive ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {isActive ? activeText : inactiveText}
      </Label>
    </div>
  );
}
