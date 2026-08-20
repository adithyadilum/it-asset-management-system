'use client';

import * as React from 'react';
import { Copy, Eye, EyeOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { tiqriToast } from '@/components/shared/sonner';

interface CopyableFieldProps {
  value: string;
  label?: string;
  isMasked?: boolean;
  className?: string;
}

function formatInGroups(value: string, size: number = 4): string {
  const cleanValue = value.replace(/\s/g, '');
  const regex = new RegExp(`.{1,${size}}`, 'g');
  return cleanValue.match(regex)?.join(' ') ?? value;
}

export function CopyableField({
  value,
  label,
  isMasked = true,
  className,
}: CopyableFieldProps) {
  const [isVisible, setIsVisible] = React.useState(!isMasked);
  const [isCopied, setIsCopied] = React.useState(false);

  const displayValue = React.useMemo(() => {
    if (isVisible) {
      return formatInGroups(value);
    }

    // Masked format: show only last 4 characters with dots
    const last4 = value.slice(-4);
    return `....${last4}`;
  }, [value, isVisible]);

  const handleCopy = async () => {
    try {
      // Always copy the RAW value without groups/spaces
      const rawValue = value.replace(/\s/g, '');
      await navigator.clipboard.writeText(rawValue);
      setIsCopied(true);
      tiqriToast.success(`${label || 'Value'} copied to clipboard`);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      tiqriToast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 group min-w-0 max-w-full',
        className
      )}
    >
      <code
        className={cn(
          'relative block rounded bg-muted/50 px-2 py-1 font-mono text-sm font-medium text-foreground transition-colors group-hover:bg-muted',
          'min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-left [&::-webkit-scrollbar]:hidden'
        )}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {displayValue}
      </code>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => setIsVisible(!isVisible)}
          title={isVisible ? 'Hide' : 'Show'}
        >
          {isVisible ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon-xs"
          className={cn(
            'h-7 w-7 transition-colors',
            isCopied
              ? 'text-green-600'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          {isCopied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
