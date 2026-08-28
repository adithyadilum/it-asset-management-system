import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AssetCard } from './asset-card';

describe('AssetCard', () => {
  it('renders correctly with required props', () => {
    render(<AssetCard name="MacBook Pro" />);

    expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
    expect(screen.getByText('Asset')).toBeInTheDocument(); // Default type
    expect(screen.getByText('Active')).toBeInTheDocument(); // Default status
    expect(screen.getAllByText('-').length).toBe(2); // Default assetId and assignedDate
  });

  it('renders all provided props correctly', () => {
    render(
      <AssetCard
        name="Dell XPS"
        assetType="Laptop"
        status="assigned"
        assetId="AST-001"
        assignedDate="2023-01-01"
      />
    );

    expect(screen.getByText('Dell XPS')).toBeInTheDocument();
    expect(screen.getByText('Laptop')).toBeInTheDocument();
    expect(screen.getByText('Assigned')).toBeInTheDocument();

    // Check if the asset ID and date rendered correctly by looking at parents or exact text.
    expect(screen.getByText('AST-001')).toBeInTheDocument();
    expect(screen.getByText('2023-01-01')).toBeInTheDocument();
  });

  it('renders an icon if provided', () => {
    const CustomIcon = () => <svg data-testid="custom-icon" />;
    render(<AssetCard name="iPad" icon={<CustomIcon />} />);

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <AssetCard name="Test" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows the assignment state alongside the asset status', () => {
    render(
      <AssetCard
        name="Dell XPS"
        status="assigned"
        assignmentState="pending approval"
      />
    );

    // The stored enum reads as though somebody must sign it off; the badge
    // says what it means for the holder.
    expect(screen.getByText('Pending assignment')).toBeInTheDocument();
    expect(screen.getByText('Assigned')).toBeInTheDocument();
  });

  it('marks a return date that has passed as overdue', () => {
    const { rerender } = render(
      <AssetCard name="Dell XPS" expectedReturnDate="2024-01-15" />
    );
    expect(screen.getByText(/Due back/)).toBeInTheDocument();

    rerender(
      <AssetCard name="Dell XPS" expectedReturnDate="2024-01-15" isOverdue />
    );
    expect(screen.getByText(/Overdue since/)).toBeInTheDocument();
  });

  it('renders actions when given them', () => {
    render(<AssetCard name="Dell XPS" actions={<button>Accept</button>} />);

    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
  });
});
