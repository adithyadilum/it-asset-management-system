import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { PageLoadError } from './page-load-error';
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
it('shows a safe fallback and requests fresh server data on retry', () => {
  const reset = vi.fn();
  render(
    <PageLoadError
      error={
        new Error('Failed query: select credentials for private@example.com')
      }
      reset={reset}
    />
  );
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Unable to load this page'
  );
  expect(screen.queryByText(/private@example.com/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(reset).toHaveBeenCalledTimes(1);
});
