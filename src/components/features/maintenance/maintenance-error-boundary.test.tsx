import { render, screen, fireEvent } from '@testing-library/react';
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterAll,
  afterEach,
} from 'vitest';
import { MaintenanceErrorBoundary } from './maintenance-error-boundary';

// Hide console.error during test to keep output clean
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

const ThrowError = () => {
  throw new Error('Test error');
};

describe('MaintenanceErrorBoundary', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <MaintenanceErrorBoundary>
        <div>Safe Content</div>
      </MaintenanceErrorBoundary>
    );

    expect(screen.getByText('Safe Content')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    render(
      <MaintenanceErrorBoundary>
        <ThrowError />
      </MaintenanceErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText(
        /The maintenance module encountered an unexpected error/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try again' })
    ).toBeInTheDocument();
  });

  it('resets error state when Try again is clicked', () => {
    let shouldThrow = true;

    const SometimesThrow = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>Recovered Content</div>;
    };

    const { rerender } = render(
      <MaintenanceErrorBoundary>
        <SometimesThrow />
      </MaintenanceErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Fix the component to not throw on next render
    shouldThrow = false;

    // Click try again
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    // Re-render so it attempts to render children again
    rerender(
      <MaintenanceErrorBoundary>
        <SometimesThrow />
      </MaintenanceErrorBoundary>
    );

    expect(screen.getByText('Recovered Content')).toBeInTheDocument();
  });
});
