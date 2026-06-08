import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { MobileRouteHandler } from './mobile-route-handler';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/mobile'
}));

describe('MobileRouteHandler', () => {
  afterEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });
  it('renders children correctly', () => {
    render(<MobileRouteHandler role={"Admin" as any} />);
  });
});
