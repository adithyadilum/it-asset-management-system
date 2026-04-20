// src/components/shared/status-badge.tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
    LucideIcon,
} from "lucide-react";

// 1. Define the distinct domains we are badging
export type BadgeType = "assetStatus" | "hardwareCondition" | "userRole";
export type StatusBadgeVariant = "default" | "linkedAssets";

// 2. The Configuration Dictionary (The Single Source of Truth)
const BADGE_DICTIONARY: Record<string, { label: string; className: string; icon: LucideIcon }> = {
    // Asset Statuses
    available: {
        label: "Available",
        className: "bg-green-50 text-green-700 border-green-400",
        icon: CheckCircle2,
    },
    assigned: {
        label: "Assigned",
        className: "bg-slate-50 text-slate-700 border-slate-400",
        icon: BadgeCheck,
    },
    new: {
        label: "New",
        className: "bg-blue-50 text-blue-700 border-blue-400",
        icon: Sparkles,
    },
    in_repair: {
        label: "In Repair",
        className: "bg-purple-50 text-purple-700 border-purple-400",
        icon: Wrench,
    },
    lost: {
        label: "Lost",
        className: "bg-amber-50 text-amber-700 border-amber-400",
        icon: AlertCircle,
    },
    defective: {
        label: "Defective",
        className: "bg-red-50 text-red-700 border-red-400",
        icon: MinusCircle,
    },
    archived: {
        label: "Archived",
        className: "bg-slate-50 text-slate-600 border-slate-300",
        icon: Archive,
    },
    active: {
        label: "Active",
        className: "bg-lime-50 text-lime-700 border-lime-300",
        icon: CheckCircle2,
    },
    inactive: {
        label: "Inactive",
        className: "bg-slate-50 text-slate-600 border-slate-300",
        icon: MinusCircle,
    },

    // Hardware Conditions
    pristine: { label: "Pristine", className: "bg-blue-50 text-blue-700 border-blue-200", icon: CheckCircle2 },
    damaged: { label: "Damaged", className: "bg-red-50 text-red-700 border-red-200", icon: AlertTriangle },
    broken: { label: "Broken", className: "bg-rose-50 text-rose-700 border-rose-200", icon: XCircle },

    // User Roles (From Epic 2!)
    GlobalAdmin: { label: "Global Admin", className: "bg-purple-50 text-purple-700 border-purple-200", icon: CheckCircle2 },
    ITOperator: { label: "IT Operator", className: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: CheckCircle2 },
    Employee: { label: "Employee", className: "bg-slate-50 text-slate-700 border-slate-200", icon: CheckCircle2 },
};

// Fallback for unknown strings
const FALLBACK = { label: "Unknown", className: "bg-slate-100 text-slate-600 border-slate-200", icon: HelpCircle };

interface StatusBadgeProps {
    value?: string;
    variant?: StatusBadgeVariant;
    count?: number;
    showIcon?: boolean;
    className?: string;
}

export function StatusBadge({
    value,
    variant = "default",
    count,
    showIcon = true,
    className,
}: StatusBadgeProps) {
    if (variant === "linkedAssets") {
        const normalizedCount = Number.isFinite(count) ? Math.max(0, Math.trunc(count ?? 0)) : 0;
        const linkedAssetLabel = `${normalizedCount} ${normalizedCount === 1 ? "Asset" : "Assets"}`;

        return (
            <Badge
                variant="outline"
                className={cn("font-medium whitespace-nowrap bg-slate-100 text-slate-700 border-slate-200", className)}
            >
                {linkedAssetLabel}
            </Badge>
        );
    }

    const normalizedValue = typeof value === "string" ? value : "";
    const config =
        BADGE_DICTIONARY[normalizedValue] ??
        BADGE_DICTIONARY[normalizedValue.trim().toLowerCase().replace(/\s+/g, "_")] ??
        FALLBACK;
    const Icon = config.icon;

    return (
        <Badge
            variant="outline"
            className={cn("font-medium gap-1.5 whitespace-nowrap", config.className, className)}
        >
            {showIcon && <Icon className="h-3.5 w-3.5" />}
            {config.label}
        </Badge>
    );
}
