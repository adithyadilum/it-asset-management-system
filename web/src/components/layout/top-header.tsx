'use client';

import {
    Ban,
    Bell,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { logout } from '@/actions/auth';
import { BrandHeader } from '@/components/shared/brand-header';
import { OmniSearchTrigger } from '@/components/layout/omni-search-trigger';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';
import type { HeaderBreadcrumb, TopHeaderProps } from '@/types/layout';

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

export function TopHeader({ user }: TopHeaderProps) {
    const { state, toggleSidebar } = useSidebar();
    const pathname = usePathname();
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
        <header className="grid h-14 grid-cols-3 items-center gap-4 bg-white md:rounded-lg md:bg-muted md:px-2">
            {/* Left Column: Mobile Menu / Desktop Breadcrumb */}
            <div className="flex md:hidden">
                <button
                    type="button"
                    aria-label="Toggle menu"
                    onClick={toggleSidebar}
                    className="flex h-7 w-7 items-center justify-center"
                >
                    <Menu className="h-5 w-5 text-slate-900" />
                </button>
            </div>

            <div className="hidden min-w-0 items-center gap-2 px-2 md:flex">
                <button
                    type="button"
                    aria-label={state === 'collapsed' ? 'Expand sidebar' : 'Collapse sidebar'}
                    onClick={toggleSidebar}
                    className="flex h-7 w-7 items-center justify-center"
                >
                    {state === 'collapsed' ? (
                        <PanelLeftOpen className="h-4 w-4 text-slate-500" />
                    ) : (
                        <PanelLeftClose className="h-4 w-4 text-slate-500" />
                    )}
                </button>

                <div className="flex items-center px-2">
                    <Separator
                        orientation="vertical"
                        className="h-4.25 w-px bg-slate-200"
                    />
                </div>

                <Breadcrumb>
                    <BreadcrumbList className="min-w-0 flex-nowrap gap-1.5 overflow-hidden text-inherit">
                        {breadcrumbs.length === 0 ? (
                            <BreadcrumbItem>
                                <BreadcrumbPage className={`${sidebarDefaultTextClass} whitespace-nowrap text-slate-900`}>
                                    Dashboard
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        ) : (
                            breadcrumbs.map((breadcrumb, index) => {
                                const isLast = index === breadcrumbs.length - 1;

                                return [
                                    <BreadcrumbItem key={`${breadcrumb.href}-item`}>
                                        {isLast ? (
                                            <BreadcrumbPage className={`${sidebarDefaultTextClass} truncate whitespace-nowrap text-slate-900`}>
                                                {breadcrumb.label}
                                            </BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink
                                                asChild
                                                className={`${sidebarDefaultTextClass} truncate whitespace-nowrap text-slate-500 hover:text-slate-700`}
                                            >
                                                <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
                                            </BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>,
                                    !isLast ? (
                                        <BreadcrumbSeparator
                                            key={`${breadcrumb.href}-separator`}
                                            className="text-slate-400"
                                        />
                                    ) : null,
                                ];
                            })
                        )}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Center Column: Mobile Logo / Desktop Search */}
            <div className="flex justify-center md:hidden">
                <BrandHeader collapsed={false} />
            </div>

            <div className="hidden justify-self-center md:flex">
                <OmniSearchTrigger userRole={user.role} />
            </div>

            {/* Right Column: Avatar & User Info */}
            <div className="flex justify-end md:gap-4 md:p-2">
                {/* Desktop: Bell Icon & Separator */}
                <div className="hidden w-13 items-center justify-between md:flex">
                    <button
                        type="button"
                        aria-label="Notifications"
                        className="flex h-7 w-7 items-center justify-center"
                    >
                        <Bell className="h-4 w-4 text-slate-500" />
                    </button>
                    <div className="flex items-center px-2">
                        <Separator
                            orientation="vertical"
                            className="h-4.25 w-px bg-slate-200"
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
                            <Avatar className="h-8 w-8 rounded-full md:rounded-lg">
                                <AvatarImage src="" alt={user.name} className="object-cover" />
                                <AvatarFallback className="rounded-full bg-slate-300 text-xs font-semibold text-slate-700 md:rounded-lg md:bg-slate-300">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>

                            <div className="hidden flex-col items-start md:flex">
                                <span className="whitespace-nowrap font-text-sm-semi-bold text-(length:--text-sm-semi-bold-font-size) leading-(--text-sm-semi-bold-line-height) tracking-(--text-sm-semi-bold-letter-spacing) text-slate-900 [font-style:var(--text-sm-semi-bold-font-style)]">
                                    {user.name}
                                </span>
                                <span className="overflow-hidden text-ellipsis font-text-xs-regular text-(length:--text-xs-regular-font-size) leading-(--text-xs-regular-line-height) tracking-(--text-xs-regular-letter-spacing) text-slate-900 [display:-webkit-box] [-webkit-line-clamp:1] [-webkit-box-orient:vertical] [font-style:var(--text-xs-regular-font-style)]">
                                    {user.email}
                                </span>
                            </div>
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        align="end"
                        sideOffset={8}
                        className="w-67.5 min-w-67.5 border-none bg-transparent p-0 shadow-none ring-0"
                    >
                        <Card className="w-67.5 rounded-lg border border-solid border-slate-200 bg-white py-0 shadow-box-shadow-shadow-xl ring-0">
                            <CardContent className="flex flex-col items-end gap-4 p-6">
                                <div className="flex w-full justify-end">
                                    <Ban className="h-4 w-4 text-slate-400" />
                                </div>

                                <div className="flex w-full flex-col items-start gap-2">
                                    <div className="flex w-full items-center gap-4 p-2">
                                        <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                                            <AvatarImage
                                                src=""
                                                alt={user.name}
                                                className="rounded-lg object-cover"
                                            />
                                            <AvatarFallback className="rounded-lg bg-slate-200 text-xs text-slate-600">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex min-w-0 flex-1 flex-col items-start">
                                            <span className="self-stretch font-text-sm-semi-bold text-(length:--text-sm-semi-bold-font-size) leading-(--text-sm-semi-bold-line-height) tracking-(--text-sm-semi-bold-letter-spacing) text-slate-900 [font-style:var(--text-sm-semi-bold-font-style)]">
                                                {user.name}
                                            </span>
                                            <span className="self-stretch overflow-hidden text-ellipsis font-text-xs-regular text-(length:--text-xs-regular-font-size) leading-(--text-xs-regular-line-height) tracking-(--text-xs-regular-letter-spacing) text-slate-900 [display:-webkit-box] [-webkit-line-clamp:1] [-webkit-box-orient:vertical] [font-style:var(--text-xs-regular-font-style)]">
                                                {user.email}
                                            </span>
                                            <span className="self-stretch font-text-sm-semi-bold text-(length:--text-sm-semi-bold-font-size) leading-(--text-sm-semi-bold-line-height) tracking-(--text-sm-semi-bold-letter-spacing) text-[#7cc000] [font-style:var(--text-sm-semi-bold-font-style)]">
                                                {roleLabel}
                                            </span>
                                        </div>
                                    </div>

                                    <form action={logout} className="w-full">
                                        <Button className="h-8 w-full rounded-lg bg-red-500 text-(length:--text-sm-medium-font-size) leading-(--text-sm-medium-line-height) tracking-(--text-sm-medium-letter-spacing) text-white shadow-box-shadow-shadow-xs hover:bg-red-600 [font-style:var(--text-sm-medium-font-style)]">
                                            Logout
                                        </Button>
                                    </form>
                                </div>
                            </CardContent>
                        </Card>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
