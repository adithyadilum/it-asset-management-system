'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useTheme } from 'next-themes';
import {
  Toaster as Sonner,
  toast,
  type ExternalToast,
  type ToasterProps,
} from 'sonner';
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react';

const toastBaseStyle: CSSProperties = {
  fontFamily: 'var(--font-noto-sans), "Noto Sans", sans-serif',
  borderRadius: 'var(--radius-md, 8px)',
  background: 'var(--background)',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.10)',
};

const toastLayoutStyle: CSSProperties = {
  width: '100%',
  minWidth: 'min(600px, calc(100vw - 2rem))',
  maxWidth: 'min(797px, calc(100vw - 2rem))',
  padding: '12px 16px',
  margin: '0 auto',
  boxSizing: 'border-box',
  color: 'var(--card-foreground)',
};

type TiqriToastVariant =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'loading'
  | 'actionable'
  | 'warningAction'
  | 'infoAction';

type VariantConfig = {
  borderColor: string;
  icon: ReactNode;
  defaults?: ExternalToast;
};

const variantConfigs: Record<TiqriToastVariant, VariantConfig> = {
  success: {
    borderColor: 'var(--success)',
    icon: <CircleCheckIcon className="size-4 text-success" />,
  },
  error: {
    borderColor: 'var(--destructive)',
    icon: <OctagonXIcon className="size-4 text-destructive" />,
  },
  warning: {
    borderColor: 'var(--status-lost)',
    icon: <TriangleAlertIcon className="size-4 text-status-lost" />,
  },
  info: {
    borderColor: 'var(--status-new)',
    icon: <InfoIcon className="size-4 text-status-new" />,
  },
  loading: {
    borderColor: 'var(--muted-foreground)',
    icon: <Loader2Icon className="size-4 animate-spin text-muted-foreground" />,
    defaults: {
      duration: Number.POSITIVE_INFINITY,
    },
  },
  actionable: {
    borderColor: 'var(--foreground)',
    icon: <InfoIcon className="size-4 text-foreground" />,
    defaults: {
      closeButton: true,
      dismissible: true,
    },
  },
  warningAction: {
    borderColor: 'var(--status-lost)',
    icon: <TriangleAlertIcon className="size-4 text-status-lost" />,
    defaults: {
      closeButton: true,
      dismissible: true,
    },
  },
  infoAction: {
    borderColor: 'var(--status-new)',
    icon: <InfoIcon className="size-4 text-status-new" />,
    defaults: {
      closeButton: true,
      dismissible: true,
    },
  },
};

const createVariantToastStyle = (borderColor: string): CSSProperties => ({
  ...toastBaseStyle,
  ...toastLayoutStyle,
  border: `var(--border-width, 1px) solid ${borderColor}`,
});

const mergeToastStyle = (
  baseStyle: CSSProperties,
  incomingStyle?: CSSProperties
): CSSProperties => ({
  ...baseStyle,
  ...(incomingStyle ?? {}),
});

const mergeFontClass = (className?: string) =>
  `font-sans${className ? ` ${className}` : ''}`;

const mergeClassName = (baseClassName: string, incomingClassName?: string) =>
  incomingClassName ? `${baseClassName} ${incomingClassName}` : baseClassName;

const twoLineWrapClassName =
  'whitespace-normal break-words [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden';
const toastTextClassName = 'text-sm font-normal';

const formatBySplitColon = (message: ReactNode): ReactNode => {
  if (typeof message !== 'string') {
    return message;
  }

  const trimmedMessage = message.trim();
  const parts = trimmedMessage.split(':');

  if (parts.length < 2) {
    return trimmedMessage;
  }

  const leadingPhrase = parts[0]?.trim() ?? '';
  const remainingText = parts.slice(1).join(':').trim();

  if (!leadingPhrase || !remainingText) {
    return trimmedMessage;
  }

  return (
    <span>
      <span className="font-semibold">{leadingPhrase}:</span>{' '}
      <span className="font-normal">{remainingText}</span>
    </span>
  );
};

const createToastOptions = (
  variant: TiqriToastVariant,
  options?: ExternalToast
): ExternalToast => {
  const config = variantConfigs[variant];

  return {
    ...config.defaults,
    ...options,
    icon: options?.icon ?? config.icon,
    className: mergeFontClass(options?.className),
    style: mergeToastStyle(
      createVariantToastStyle(config.borderColor),
      options?.style as CSSProperties | undefined
    ),
    classNames: {
      ...config.defaults?.classNames,
      ...options?.classNames,
      title: mergeClassName(
        `${twoLineWrapClassName} ${toastTextClassName}`,
        options?.classNames?.title
      ),
      description: mergeClassName(
        `${twoLineWrapClassName} ${toastTextClassName}`,
        options?.classNames?.description
      ),
    },
  };
};

const emitToast = (
  variant: TiqriToastVariant,
  message: ReactNode,
  options?: ExternalToast
) => toast(formatBySplitColon(message), createToastOptions(variant, options));

export const tiqriToast = {
  success: (message: ReactNode, options?: ExternalToast) =>
    emitToast('success', message, options),
  error: (message: ReactNode, options?: ExternalToast) =>
    emitToast('error', message, options),
  warning: (message: ReactNode, options?: ExternalToast) =>
    emitToast('warning', message, options),
  info: (message: ReactNode, options?: ExternalToast) =>
    emitToast('info', message, options),
  loading: (message: ReactNode, options?: ExternalToast) =>
    emitToast('loading', message, options),
  actionable: (message: ReactNode, options?: ExternalToast) =>
    emitToast('actionable', message, options),
  warningAction: (message: ReactNode, options?: ExternalToast) =>
    emitToast('warningAction', message, options),
  infoAction: (message: ReactNode, options?: ExternalToast) =>
    emitToast('infoAction', message, options),
};

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        info: <InfoIcon className="size-4 text-status-new" />,
        warning: <TriangleAlertIcon className="size-4 text-status-lost" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: (
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        ),
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast font-sans',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
