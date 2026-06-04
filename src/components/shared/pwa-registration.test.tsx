import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PwaRegistration } from './pwa-registration';

describe('PwaRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders null', () => {
    const { container } = render(<PwaRegistration />);
    expect(container).toBeEmptyDOMElement();
  });
});
