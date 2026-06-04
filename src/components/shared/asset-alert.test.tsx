import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AssetAlert } from './asset-alert';

describe('AssetAlert', () => {
  it('renders correctly with required props', () => {
    render(<AssetAlert variant="reminder" title="Test Title" message="Test Message" />);
    expect(screen.getByText('Test Title:')).toBeInTheDocument();
    expect(screen.getByText('Test Message')).toBeInTheDocument();
  });

  it('renders action link when actionHref is provided', () => {
    render(
      <AssetAlert 
        variant="action-required" 
        title="Notice" 
        message="Please update" 
        actionLabel="Update Now" 
        actionHref="/update" 
      />
    );
    const link = screen.getByRole('link', { name: 'Update Now' });
    expect(link).toHaveAttribute('href', '/update');
  });

  it('renders action button when only actionLabel is provided', () => {
    render(
      <AssetAlert 
        variant="notice" 
        title="Warning" 
        message="Be careful" 
        actionLabel="Acknowledge" 
      />
    );
    const button = screen.getByRole('button', { name: 'Acknowledge' });
    expect(button).toBeInTheDocument();
  });

  it('renders custom actionNode if provided', () => {
    render(
      <AssetAlert 
        variant="service-update" 
        title="Update" 
        message="Message" 
        actionNode={<button>Custom Action</button>} 
      />
    );
    expect(screen.getByRole('button', { name: 'Custom Action' })).toBeInTheDocument();
  });

  it('applies variant-specific styling', () => {
    const { container } = render(
      <AssetAlert variant="return-overdue" title="Overdue" message="Please return." />
    );
    expect(container.firstChild).toHaveClass('border-alert-destructive-border');
  });
});
