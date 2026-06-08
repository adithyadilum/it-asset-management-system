import '@testing-library/jest-dom';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

import { vi } from 'vitest';
vi.mock('server-only', () => ({}));

import { cleanup } from '@testing-library/react';
import { afterEach, afterAll } from 'vitest';

afterEach(() => {
  cleanup();
});