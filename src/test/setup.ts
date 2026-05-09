import '@testing-library/jest-dom/vitest';

class ResizeObserverMock {
  observe() {
    // No-op mock implementation for jsdom tests.
  }

  unobserve() {
    // No-op mock implementation for jsdom tests.
  }

  disconnect() {
    // No-op mock implementation for jsdom tests.
  }
}

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
}
