'use client';

import {
    Ban,
    PanelLeftClose,
    PanelLeftOpen,
    Sun,
    Moon,
    Monitor,
    Banknote,
    Check,
    Smartphone,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState, useTransition } from 'react';

import { getFederatedLogoutUrl } from '@/actions/auth';
import { signOut } from 'next-auth/react';
import { setPreferredCurrency } from '@/actions/currency';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { BrandHeader } from '@/components/shared/brand-header';
import { OmniSearchTrigger } from '@/components/layout/omni-search-trigger';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';
import type { HeaderBreadcrumb, TopHeaderProps } from '@/types/layout';
import { NotificationBell } from '@/components/features/notifications/notification-bell';
import DevicePairingModal from '@/components/auth/device-pairing-modal';

const SIDEBAR_BREADCRUMB_LABELS: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/assets': 'All Assets',
    '/assets/hardware': 'Hardware',
    '/assets/software': 'Software',
    '/assets/furniture': 'Furniture & Fixtures',
    '/assets/office-electronics': 'Office Electronics',
    '/operations': 'Operations',
    '/operations/assignments': 'Assignments & Returns',
    '/operations/maintenance': 'Maintenance & Repairs',
    '/operations/disposals': 'Disposals',
    '/financials': 'Financials',
    '/financials/depreciation': 'Depreciation Ledger',
    '/financials/tco': 'Total Cost of Ownership',
    '/financials/salvage': 'Salvage & Write-Offs',
    '/reports': 'Reports & Audits',
    '/reports/audit-log': 'System Audit Log',
    '/settings': 'Settings',
    '/settings/master-data': 'Master Data',
    '/settings/roles': 'User Roles & Access',
    '/settings/alerts': 'Alerts & Notifications',
    '/settings/integrations': 'Integrations',
    '/settings/devices': 'Linked Devices',
};

const sidebarDefaultTextClass =
    'font-text-sm-regular text-sm leading-5 tracking-(--text-sm-regular-letter-spacing) [font-style:var(--text-sm-regular-font-style)]';

function formatBreadcrumbSegment(segment: string) {
    return decodeURIComponent(segment)
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function resolveBreadcrumbLabel(href: string, segment: string) {
    return SIDEBAR_BREADCRUMB_LABELS[href] ?? formatBreadcrumbSegment(segment);
}

function buildBreadcrumbs(pathname: string): HeaderBreadcrumb[] {
    const segments = pathname.split('/').filter((segment) => segment !== '');

    return segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`;

        return {
            href,
            label: resolveBreadcrumbLabel(href, segment),
        };
    });
}

export function TopHeader({ user, preferredCurrency = 'LKR' }: TopHeaderProps) {
    const { state, toggleSidebar } = useSidebar();
    const pathname = usePathname();
    const { setTheme } = useTheme();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [pairingModalOpen, setPairingModalOpen] = useState(false);

    const handleLogout = async () => {
        try {
            setIsLoggingOut(true);
            const federatedUrl = await getFederatedLogoutUrl();
            await signOut({ redirect: false });
            window.location.href = federatedUrl;
        } catch (error) {
            console.error('Logout failed:', error);
            setIsLoggingOut(false);
        }
    };

    const breadcrumbs = buildBreadcrumbs(pathname);

    const initials = user.name
        .split(' ')
        .map((namePart) => namePart[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

    const roleLabelMap: Record<typeof user.role, string> = {
        GlobalAdmin: 'Global Admin',
        ITOperator: 'IT Ops',
        FinanceAuditor: 'Finance Audit',
        Employee: 'Employee',
    };
    const roleLabel = roleLabelMap[user.role];

    return (
        <header className="grid h-14 w-full grid-cols-2 md:grid-cols-3 items-center gap-4 rounded-none border-none bg-background md:rounded-lg md:bg-muted md:px-2">            {/* Left Column: Mobile Logo / Desktop Breadcrumb */}
            <div className="flex items-center md:hidden pl-4">
                <BrandHeader collapsed={false} />
            </div>

            <div className="hidden min-w-0 items-center gap-2 px-2 md:flex">
                <button
                    type="button"
                    aria-label={state === 'collapsed' ? 'Expand sidebar' : 'Collapse sidebar'}
                    onClick={toggleSidebar}
                    className="flex h-7 w-7 items-center justify-center"
                >
                    {state === 'collapsed' ? (
                        <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
                    )}
                </button>

                <div className="flex items-center px-2">
                    <Separator
                        orientation="vertical"
                        className="h-4.25 w-px bg-muted"
                    />
                </div>

                <Breadcrumb>
                    <BreadcrumbList className="min-w-0 flex-nowrap gap-1.5 overflow-hidden text-inherit">
                        {breadcrumbs.length === 0 ? (
                            <BreadcrumbItem>
                                <BreadcrumbPage className={`${sidebarDefaultTextClass} whitespace-nowrap text-foreground`}>
                                    Dashboard
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        ) : (
                            breadcrumbs.map((breadcrumb, index) => {
                                const isLast = index === breadcrumbs.length - 1;

                                return [
                                    <BreadcrumbItem key={`${breadcrumb.href}-item`}>
                                        {isLast ? (
                                            <BreadcrumbPage className={`${sidebarDefaultTextClass} truncate whitespace-nowrap text-foreground`}>
                                                {breadcrumb.label}
                                            </BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink
                                                asChild
                                                className={`${sidebarDefaultTextClass} truncate whitespace-nowrap text-muted-foreground hover:text-foreground`}
                                            >
                                                <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
                                            </BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>,
                                    !isLast ? (
                                        <BreadcrumbSeparator
                                            key={`${breadcrumb.href}-separator`}
                                            className="text-muted-foreground"
                                        />
                                    ) : null,
                                ];
                            })
                        )}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Center Column: Desktop Search */}
            <div className="hidden items-center justify-self-center md:flex">
                <OmniSearchTrigger userRole={user.role} />
            </div>

            {/* Right Column: Avatar & User Info */}
            <div className="flex items-center justify-end md:gap-4 md:px-2 pr-4">
                {/* Desktop: Bell Icon & Separator */}
                <div className="hidden md:flex items-center">
                    <NotificationBell />
                    <div className="flex items-center px-2">
                        <Separator
                            orientation="vertical"
                            className="h-4.25 w-px bg-muted"
                        />
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="md:flex md:items-center md:gap-4 md:rounded-lg md:p-2"
                            aria-label="Open user menu"
                        >
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage alt={user.name} className="object-cover" />
                                <AvatarFallback className="rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>

                            <div className="hidden flex-col items-start md:flex">
                                <span className="whitespace-nowrap font-text-sm-semi-bold text-(length:--text-sm-semi-bold-font-size) leading-(--text-sm-semi-bold-line-height) tracking-(--text-sm-semi-bold-letter-spacing) text-foreground [font-style:var(--text-sm-semi-bold-font-style)]">
                                    {user.name}
                                </span>
                                <span className="overflow-hidden text-ellipsis font-text-xs-regular text-(length:--text-xs-regular-font-size) leading-(--text-xs-regular-line-height) tracking-(--text-xs-regular-letter-spacing) text-muted-foreground [display:-webkit-box] [-webkit-line-clamp:1] [-webkit-box-orient:vertical] [font-style:var(--text-xs-regular-font-style)]">
                                    {user.email}
                                </span>
                            </div>
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        align="end"
                        sideOffset={8}
                        className="w-72 overflow-hidden rounded-xl border border-border bg-popover p-0 shadow-xl"
                    >
                        <div className="flex flex-col">
                            {/* User Profile Header */}
                            <div className="flex items-center gap-4 border-b border-border bg-muted/50 p-4">
                                <Avatar className="h-12 w-12 shrink-0 rounded-lg border border-background shadow-sm">
                                    <AvatarImage
                                        alt={user.name}
                                        className="rounded-lg object-cover"
                                    />
                                    <AvatarFallback className="rounded-lg bg-muted text-sm font-bold text-muted-foreground">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex min-w-0 flex-1 flex-col items-start">
                                    <span className="truncate self-stretch font-text-sm-semi-bold text-(length:--text-sm-semi-bold-font-size) leading-(--text-sm-semi-bold-line-height) tracking-(--text-sm-semi-bold-letter-spacing) text-foreground [font-style:var(--text-sm-semi-bold-font-style)]">
                                        {user.name}
                                    </span>
                                    <span className="truncate self-stretch font-text-xs-regular text-(length:--text-xs-regular-font-size) leading-(--text-xs-regular-line-height) tracking-(--text-xs-regular-letter-spacing) text-muted-foreground [font-style:var(--text-xs-regular-font-style)]">
                                        {user.email}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className="mt-1.5 border-[#7cc000]/30 bg-[#7cc000]/10 px-1.5 py-0 text-[10px] font-bold leading-4 tracking-wider text-[#7cc000] uppercase hover:bg-[#7cc000]/20"
                                    >
                                        {roleLabel}
                                    </Badge>
                                </div>
                            </div>

                            {/* Theme Selector */}
                            <div className="p-2 border-b border-border">
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger className="h-9 rounded-lg text-xs">
                                        <Sun className="mr-2 h-4 w-4 text-muted-foreground dark:hidden" />
                                        <Moon className="mr-2 h-4 w-4 text-muted-foreground hidden dark:block" />
                                        Theme
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                            <DropdownMenuItem onClick={() => setTheme("light")} className="h-9 justify-start rounded-lg text-xs cursor-pointer focus:bg-muted">
                                                <Sun className="mr-2 h-4 w-4 text-muted-foreground" />
                                                Light
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setTheme("dark")} className="h-9 justify-start rounded-lg text-xs cursor-pointer focus:bg-muted">
                                                <Moon className="mr-2 h-4 w-4 text-muted-foreground" />
                                                Dark
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setTheme("system")} className="h-9 justify-start rounded-lg text-xs cursor-pointer focus:bg-muted">
                                                <Monitor className="mr-2 h-4 w-4 text-muted-foreground" />
                                                System
                                            </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                            </div>

                            {/* Currency Selector */}
                            <div className="p-2 border-b border-border">
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger className="h-9 rounded-lg text-xs" disabled={isPending}>
                                        <Banknote className="mr-2 h-4 w-4 text-muted-foreground" />
                                        Currency ({preferredCurrency})
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                            {SUPPORTED_CURRENCIES.map((currency) => (
                                                <DropdownMenuItem
                                                    key={currency}
                                                    onClick={() => startTransition(() => setPreferredCurrency(currency))}
                                                    className="h-9 justify-start rounded-lg text-xs cursor-pointer focus:bg-muted relative pl-8"
                                                >
                                                    {preferredCurrency === currency && (
                                                        <Check className="absolute left-2 h-4 w-4 text-foreground" />
                                                    )}
                                                    {currency}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                            </div>

                            {/* Link Device */}
                            <div className="p-2 border-b border-border">
                                <Button
                                    variant="ghost"
                                    onClick={() => setPairingModalOpen(true)}
                                    className="h-9 w-full justify-start rounded-lg text-xs"
                                >
                                    <Smartphone className="mr-2 h-4 w-4 text-muted-foreground" />
                                    Link Device
                                </Button>
                            </div>

                            {/* Actions Area */}
                            <div className="p-2">
                                <Button
                                    variant="ghost"
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                    className="h-9 w-full justify-start rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                >
                                    <Ban className="mr-2 h-4 w-4" />
                                    {isLoggingOut ? 'Logging out...' : 'Logout Session'}
                                </Button>
                            </div>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
                <DevicePairingModal open={pairingModalOpen} onOpenChange={setPairingModalOpen} />
            </div>
        </header>
    );
}
