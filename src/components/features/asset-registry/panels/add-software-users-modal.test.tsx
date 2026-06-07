import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AddSoftwareUsersModal } from './add-software-users-modal';

describe('AddSoftwareUsersModal', () => {
  it('renders modal and handles close', () => {
    render(<AddSoftwareUsersModal isOpen={true} onClose={vi.fn()} assetId="1" availableSeats={5} />);
    expect(screen.getByText(/Allocate Software License/i)).toBeInTheDocument();
  });
});
