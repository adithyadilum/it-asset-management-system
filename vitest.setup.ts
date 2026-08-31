import '@testing-library/jest-dom';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

import { vi } from 'vitest';
vi.mock('server-only', () => ({}));

// Provide dummy environment variables for tests so Zod validation doesn't crash
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret-at-least-32-characters';
process.env.MOBILE_JWT_SECRET = 'test-mobile-jwt-secret-at-least-32-characters';
process.env.ENCRYPTION_SECRET = 'dGVzdC1zZWNyZXQtbWluLTE2LWNoYXJzLWZvci1lcmk=';
process.env.QSTASH_CURRENT_SIGNING_KEY = 'mock-current-signing-key';
process.env.QSTASH_NEXT_SIGNING_KEY = 'mock-next-signing-key';
process.env.QSTASH_URL = 'https://qstash.upstash.io';
process.env.QSTASH_TOKEN = 'mock-token';
process.env.KEYCLOAK_CLIENT_ID = 'test-client';
process.env.KEYCLOAK_CLIENT_SECRET = 'test-secret';
process.env.KEYCLOAK_ISSUER = 'http://localhost:8080/realms/test';
// @ts-ignore - TS thinks NODE_ENV is readonly
process.env.NODE_ENV = 'test';
process.env.ENABLE_RUNTIME_LOGS = 'false';
process.env.API_RATE_LIMIT_MAX = '100';
process.env.API_RATE_LIMIT_WINDOW_SECONDS = '60';

process.env.TEST_DATABASE_URL = 'postgresql://test:test@localhost/test';
process.env.ENCRYPTION_SECRET = 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
process.env.QSTASH_URL = 'https://qstash.upstash.io';
process.env.QSTASH_TOKEN = 'test-qstash-token';
process.env.QSTASH_CURRENT_SIGNING_KEY = 'sig_test_key_1';
process.env.QSTASH_NEXT_SIGNING_KEY = 'sig_test_key_2';
process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-redis-token';

process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_NOTIFICATION_POLL_INTERVAL = '30000';
process.env.NEXT_PUBLIC_PUSHER_KEY = 'test-key';
process.env.NEXT_PUBLIC_PUSHER_CLUSTER = 'ap1';
process.env.NEXT_PUBLIC_ENABLE_SANDBOX = 'true';

import { cleanup } from '@testing-library/react';
import { afterEach, afterAll } from 'vitest';

afterEach(() => {
  cleanup();
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  unstable_rethrow: vi.fn(),
}));

import React from 'react';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => {
    return React.createElement('a', { href, ...props }, children);
  },
}));
