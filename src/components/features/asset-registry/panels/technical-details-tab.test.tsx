import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TechnicalDetailsTab } from './technical-details-tab';

describe('TechnicalDetailsTab', () => {
  it('renders technical details', () => {
    const mockAsset = {
      specifications: { cpu: 'i7', ram: '16GB' },
      network: { macAddress: '00:11:22', ipAddress: '192.168.1.1' },
      os: { name: 'Windows 11' }
    };
    render(<TechnicalDetailsTab specs={mockAsset.specifications as any} />);
    expect(screen.getByText('i7')).toBeInTheDocument();
  });
});
