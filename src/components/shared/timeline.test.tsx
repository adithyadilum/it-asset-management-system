import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AssetHistoryTimeline } from './timeline';

describe('AssetHistoryTimeline', () => {
  const mockHistoryLog = {
    id: 1,
    actionType: 'UPDATE',
    entityType: 'Asset',
    entityId: 'uuid-1',
    entityLabel: 'AST-001 · Dell Laptop',
    performedAt: '2024-01-01T12:00:00Z',
    performedBy: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
    },
    oldValue: { status: 'Available' },
    newValue: { status: 'Assigned' },
    ipAddress: '192.168.1.1',
  };

  it('renders empty state if no logs are provided', () => {
    render(<AssetHistoryTimeline historyLogs={[]} />);
    expect(screen.getByText('No history available')).toBeInTheDocument();
  });

  it('renders log details including user and action type', () => {
    render(<AssetHistoryTimeline historyLogs={[mockHistoryLog]} />);

    // The headline is the human verb phrase, not the raw enum: the timeline
    // used to print 'UPDATE', 'ACCESS DENIED', 'STATUS CHANGE'.
    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.queryByText('UPDATE')).not.toBeInTheDocument();
    expect(screen.getByText('AST-001 · Dell Laptop')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
  });

  it('renders system action if performedBy is null', () => {
    const systemLog = { ...mockHistoryLog, performedBy: null };
    render(<AssetHistoryTimeline historyLogs={[systemLog]} />);
    expect(screen.getByText('System action')).toBeInTheDocument();
  });

  it('renders formatted field changes', () => {
    render(<AssetHistoryTimeline historyLogs={[mockHistoryLog]} />);

    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument(); // old value
    expect(screen.getByText('Assigned')).toBeInTheDocument(); // new value
  });

  it('renders financial fields with currency formatting', () => {
    const financeLog = {
      ...mockHistoryLog,
      oldValue: { basePrice: 1000 },
      newValue: { basePrice: 1500 },
    };

    render(<AssetHistoryTimeline historyLogs={[financeLog]} />);
    expect(screen.getByText('Base Price:')).toBeInTheDocument();
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
    expect(screen.getByText('$1,500.00')).toBeInTheDocument();
  });

  it('hides entity label when showEntityLabel is false', () => {
    render(
      <AssetHistoryTimeline
        historyLogs={[mockHistoryLog]}
        showEntityLabel={false}
      />
    );
    expect(screen.queryByText('AST-001 · Dell Laptop')).not.toBeInTheDocument();
  });
});
