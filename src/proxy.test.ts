import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// We extract and directly test the pure RBAC routing logic from proxy.ts.
// The proxy function itself wraps NextRequest/NextResponse which are not
// available in jsdom, but the route-access matrix is pure logic we can
// replicate and verify exhaustively.
// ---------------------------------------------------------------------------

type TokenRole = 'GlobalAdmin' | 'ITOperator' | 'FinancialAuditor' | 'Employee';

// Replicated from src/proxy.ts for isolated pure-function testing
function getTopLevelSegment(pathname: string) {
  return pathname.split('/').filter(Boolean)[0] ?? null;
}

function canAccessRoute(role: TokenRole, pathname: string) {
  if (
    pathname === '/' ||
    pathname === '/dashboard' ||
    pathname === '/dashboard/' ||
    pathname === '/my-assets' ||
    pathname.startsWith('/my-assets/')
  ) {
    return true;
  }

  if (role === 'GlobalAdmin') return true;
  if (role === 'Employee') return false;

  const topLevelSegment = getTopLevelSegment(pathname);
  const isSettingsRoute = topLevelSegment === 'settings';
  const isFinancialsRoute = topLevelSegment === 'financials';
  const isOperationsRoute = topLevelSegment === 'operations';

  if (role === 'ITOperator') {
    return !isSettingsRoute && !isFinancialsRoute;
  }

  if (role === 'FinancialAuditor') {
    if (isSettingsRoute) return false;
    if (isOperationsRoute) {
      return (
        pathname.startsWith('/operations/maintenance') ||
        pathname.startsWith('/operations/disposals') ||
        pathname === '/operations'
      );
    }
    return true;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RBAC Route Access Matrix', () => {
  describe('GlobalAdmin', () => {
    const role: TokenRole = 'GlobalAdmin';

    it('can access any route', () => {
      expect(canAccessRoute(role, '/')).toBe(true);
      expect(canAccessRoute(role, '/dashboard')).toBe(true);
      expect(canAccessRoute(role, '/assets/hardware')).toBe(true);
      expect(canAccessRoute(role, '/settings/roles')).toBe(true);
      expect(canAccessRoute(role, '/settings/master-data')).toBe(true);
      expect(canAccessRoute(role, '/financials/depreciation')).toBe(true);
      expect(canAccessRoute(role, '/operations/assignments')).toBe(true);
      expect(canAccessRoute(role, '/reports')).toBe(true);
    });
  });

  describe('ITOperator', () => {
    const role: TokenRole = 'ITOperator';

    it('can access dashboard and root', () => {
      expect(canAccessRoute(role, '/')).toBe(true);
      expect(canAccessRoute(role, '/dashboard')).toBe(true);
    });

    it('can access asset registries', () => {
      expect(canAccessRoute(role, '/assets/hardware')).toBe(true);
      expect(canAccessRoute(role, '/assets/software')).toBe(true);
    });

    it('can access operations module', () => {
      expect(canAccessRoute(role, '/operations/assignments')).toBe(true);
      expect(canAccessRoute(role, '/operations/maintenance')).toBe(true);
    });

    it('cannot access /settings/*', () => {
      expect(canAccessRoute(role, '/settings/roles')).toBe(false);
      expect(canAccessRoute(role, '/settings/master-data')).toBe(false);
      expect(canAccessRoute(role, '/settings/integrations')).toBe(false);
    });

    it('cannot access /financials/*', () => {
      expect(canAccessRoute(role, '/financials/depreciation')).toBe(false);
      expect(canAccessRoute(role, '/financials/tco')).toBe(false);
    });

    it('can access /my-assets', () => {
      expect(canAccessRoute(role, '/my-assets')).toBe(true);
      expect(canAccessRoute(role, '/my-assets/123')).toBe(true);
    });
  });

  describe('FinancialAuditor', () => {
    const role: TokenRole = 'FinancialAuditor';

    it('can access dashboard and root', () => {
      expect(canAccessRoute(role, '/')).toBe(true);
      expect(canAccessRoute(role, '/dashboard')).toBe(true);
    });

    it('can access financials module', () => {
      expect(canAccessRoute(role, '/financials/depreciation')).toBe(true);
      expect(canAccessRoute(role, '/financials/tco')).toBe(true);
    });

    it('can access reports module', () => {
      expect(canAccessRoute(role, '/reports')).toBe(true);
      expect(canAccessRoute(role, '/reports/templates')).toBe(true);
    });

    it('can access asset registries', () => {
      expect(canAccessRoute(role, '/assets/hardware')).toBe(true);
    });

    it('cannot access /settings/*', () => {
      expect(canAccessRoute(role, '/settings/roles')).toBe(false);
      expect(canAccessRoute(role, '/settings/master-data')).toBe(false);
    });

    it('can access /operations/maintenance and /operations/disposals', () => {
      expect(canAccessRoute(role, '/operations/maintenance')).toBe(true);
      expect(canAccessRoute(role, '/operations/maintenance/123')).toBe(true);
      expect(canAccessRoute(role, '/operations/disposals')).toBe(true);
      expect(canAccessRoute(role, '/operations')).toBe(true);
    });

    it('cannot access /operations/assignments', () => {
      expect(canAccessRoute(role, '/operations/assignments')).toBe(false);
    });
  });

  describe('Employee', () => {
    const role: TokenRole = 'Employee';

    it('can access dashboard and root', () => {
      expect(canAccessRoute(role, '/')).toBe(true);
      expect(canAccessRoute(role, '/dashboard')).toBe(true);
      expect(canAccessRoute(role, '/dashboard/')).toBe(true);
    });

    it('can access /my-assets', () => {
      expect(canAccessRoute(role, '/my-assets')).toBe(true);
      expect(canAccessRoute(role, '/my-assets/details')).toBe(true);
    });

    it('cannot access asset registries', () => {
      expect(canAccessRoute(role, '/assets/hardware')).toBe(false);
      expect(canAccessRoute(role, '/assets/software')).toBe(false);
    });

    it('cannot access settings', () => {
      expect(canAccessRoute(role, '/settings/roles')).toBe(false);
    });

    it('cannot access financials', () => {
      expect(canAccessRoute(role, '/financials/depreciation')).toBe(false);
    });

    it('cannot access operations', () => {
      expect(canAccessRoute(role, '/operations/assignments')).toBe(false);
    });

    it('cannot access reports', () => {
      expect(canAccessRoute(role, '/reports')).toBe(false);
    });
  });
});

describe('getTopLevelSegment', () => {
  it('extracts the first segment from a path', () => {
    expect(getTopLevelSegment('/settings/roles')).toBe('settings');
    expect(getTopLevelSegment('/assets/hardware')).toBe('assets');
    expect(getTopLevelSegment('/financials')).toBe('financials');
  });

  it('returns null for root path', () => {
    expect(getTopLevelSegment('/')).toBeNull();
  });

  it('handles paths without leading slash', () => {
    expect(getTopLevelSegment('settings/roles')).toBe('settings');
  });
});
