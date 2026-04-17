"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, toast, type ExternalToast, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const toastBaseStyle: React.CSSProperties = {
  fontFamily: "var(--font-noto-sans), \"Noto Sans\", sans-serif",
  borderRadius: "var(--radius-md, 8px)",
  background: "var(--background, #FFF)",
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.10)",
}

const toastLayoutStyle: React.CSSProperties = {
  width: "100%",
  minWidth: "min(600px, calc(100vw - 2rem))",
  maxWidth: "min(797px, calc(100vw - 2rem))",
  padding: "12px 16px",
  margin: "0 auto",
  boxSizing: "border-box",
  color: "var(--card-foreground, #0F172A)",
}

type TiqriToastVariant =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "loading"
  | "actionable"
  | "warningAction"
  | "infoAction"

type VariantConfig = {
  borderColor: string
  icon: React.ReactNode
  defaults?: ExternalToast
}

const variantConfigs: Record<TiqriToastVariant, VariantConfig> = {
  success: {
    borderColor: "#7CC000",
    icon: <CircleCheckIcon className="size-4 text-[#7CC000]" />,
  },
  error: {
    borderColor: "#EF4444",
    icon: <OctagonXIcon className="size-4 text-[#EF4444]" />,
  },
  warning: {
    borderColor: "#F59E0B",
    icon: <TriangleAlertIcon className="size-4 text-[#F59E0B]" />,
  },
  info: {
    borderColor: "#040D5A",
    icon: <InfoIcon className="size-4 text-[#040D5A]" />,
  },
  loading: {
    borderColor: "#64748B",
    icon: <Loader2Icon className="size-4 animate-spin text-slate-500" />,
    defaults: {
      duration: Number.POSITIVE_INFINITY,
    },
  },
  actionable: {
    borderColor: "#0F172A",
    icon: <InfoIcon className="size-4 text-[#0F172A]" />,
    defaults: {
      closeButton: true,
      dismissible: true,
    },
  },
  warningAction: {
    borderColor: "#F59E0B",
    icon: <TriangleAlertIcon className="size-4 text-[#F59E0B]" />,
    defaults: {
      closeButton: true,
      dismissible: true,
    },
  },
  infoAction: {
    borderColor: "#040D5A",
    icon: <InfoIcon className="size-4 text-[#040D5A]" />,
    defaults: {
      closeButton: true,
      dismissible: true,
    },
  },
}

const createVariantToastStyle = (borderColor: string): React.CSSProperties => ({
  ...toastBaseStyle,
  ...toastLayoutStyle,
  border: `var(--border-width, 1px) solid ${borderColor}`,
})

const mergeToastStyle = (baseStyle: React.CSSProperties, incomingStyle?: React.CSSProperties): React.CSSProperties => ({
  ...baseStyle,
  ...(incomingStyle ?? {}),
})

/**
 * TIQRI Convention: Toast messages use a colon (:) as a delimiter. 
 * Text preceding the colon is automatically rendered as a bold title.
 * Example: "Success: The asset has been updated."
 */

const mergeFontClass = (className?: string) => `font-sans${className ? ` ${className}` : ""}`
const mergeClassName = (baseClassName: string, incomingClassName?: string) =>
  incomingClassName ? `${baseClassName} ${incomingClassName}` : baseClassName

const twoLineWrapClassName = "whitespace-normal break-words [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden"
const toastTextClassName = "text-sm font-normal"

const formatBySplitColon = (message: React.ReactNode): React.ReactNode => {
  if (typeof message !== "string") {
    return message
  }

  const trimmedMessage = message.trim()
  const parts = trimmedMessage.split(":")

  if (parts.length < 2) {
    return trimmedMessage
  }

  const leadingPhrase = parts[0]?.trim() ?? ""
  const remainingText = parts.slice(1).join(":").trim()

  if (!leadingPhrase || !remainingText) {
    return trimmedMessage
  }

  return (
    <span>
      <span className="font-semibold">{leadingPhrase}:</span>{" "}
      <span className="font-normal">{remainingText}</span>
    </span>
  )
}

const createToastOptions = (
  variant: TiqriToastVariant,
  options?: ExternalToast
): ExternalToast => {
  const config = variantConfigs[variant]

  return {
    ...config.defaults,
    ...options,
    icon: options?.icon ?? config.icon,
    className: mergeFontClass(options?.className),
    style: mergeToastStyle(createVariantToastStyle(config.borderColor), options?.style),
    classNames: {
      ...config.defaults?.classNames,
      ...options?.classNames,
      title: mergeClassName(`${twoLineWrapClassName} ${toastTextClassName}`, options?.classNames?.title),
      description: mergeClassName(`${twoLineWrapClassName} ${toastTextClassName}`, options?.classNames?.description),
    },
  }
}

const emitToast = (
  variant: TiqriToastVariant,
  message: React.ReactNode,
  options?: ExternalToast
) => toast(formatBySplitColon(message), createToastOptions(variant, options))

export const tiqriToast = {
  success: (message: React.ReactNode, options?: ExternalToast) =>
    emitToast("success", message, options),
  error: (message: React.ReactNode, options?: ExternalToast) =>
    emitToast("error", message, options),
  warning: (message: React.ReactNode, options?: ExternalToast) =>
    emitToast("warning", message, options),
  info: (message: React.ReactNode, options?: ExternalToast) =>
    emitToast("info", message, options),
  loading: (message: React.ReactNode, options?: ExternalToast) =>
    emitToast("loading", message, options),
  actionable: (message: React.ReactNode, options?: ExternalToast) =>
    emitToast("actionable", message, options),
  warningAction: (message: React.ReactNode, options?: ExternalToast) =>
    emitToast("warningAction", message, options),
  infoAction: (message: React.ReactNode, options?: ExternalToast) =>
    emitToast("infoAction", message, options),
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-[#7CC000]" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-[#EF4444]" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast font-sans",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
