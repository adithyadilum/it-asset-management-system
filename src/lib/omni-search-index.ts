import type { UserRole } from '@/types/auth';

export type OmniStaticItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  keywords: string;
};

const OMNI_STATIC_ITEMS: OmniStaticItem[] = [
  {
    id: 'page-dashboard',
    label: 'Dashboard',
    description: 'System overview and KPIs',
    href: '/dashboard',
    keywords: 'home overview kpi summary',
  },
  {
    id: 'page-assets',
    label: 'All Assets',
    description: 'Main asset registry',
    href: '/assets',
    keywords: 'assets registry inventory',
  },
  {
    id: 'page-maintenance',
    label: 'Maintenance & Repairs',
    description: 'Track maintenance workflows',
    href: '/operations/maintenance',
    keywords: 'maintenance repairs operations',
  },
  {
    id: 'page-reports-audits',
    label: 'Reports & Audits',
    description: 'Compliance and audit pages',
    href: '/reports',
    keywords: 'reports audits logs',
  },
  {
    id: 'page-settings',
    label: 'Settings',
    description: 'System configuration',
    href: '/settings',
    keywords: 'settings configuration master data roles',
  },
  {
    id: 'report-standard',
    label: 'Standard Reports',
    description: 'Default reporting dashboards',
    href: '/reports',
    keywords: 'report standard summary',
  },
];

function getTopLevelSegment(pathname: string) {
  return pathname.split('/').filter(Boolean)[0] ?? null;
}

// Keep RBAC checks aligned with proxy route constraints.
function canAccessRoute(role: UserRole, pathname: string) {
  if (
    pathname === '/' ||
    pathname === '/dashboard' ||
    pathname === '/dashboard/'
  ) {
    return true;
  }

  if (role === 'GlobalAdmin') {
    return true;
  }

  if (role === 'Employee') {
    return false;
  }

  const topLevelSegment = getTopLevelSegment(pathname);
  const isSettingsRoute = topLevelSegment === 'settings';
  const isFinancialsRoute = topLevelSegment === 'financials';
  const isOperationsRoute = topLevelSegment === 'operations';

  if (role === 'ITOperator') {
    return !isSettingsRoute && !isFinancialsRoute;
  }

  return !isSettingsRoute && !isOperationsRoute;
}

function matchesQuery(item: OmniStaticItem, normalizedQuery: string) {
  if (!normalizedQuery) {
    return true;
  }

  const haystack =
    `${item.label} ${item.description} ${item.keywords}`.toLowerCase();
  return haystack.includes(normalizedQuery);
}

export function getVisibleOmniStaticItems(query: string, role: UserRole) {
  const normalizedQuery = query.trim().toLowerCase();

  return OMNI_STATIC_ITEMS.filter(
    (item) =>
      canAccessRoute(role, item.href) && matchesQuery(item, normalizedQuery)
  );
}
