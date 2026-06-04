import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { DatePickerWithRange } from './date-range-picker';
import { addDays, format } from 'date-fns';

describe('DatePickerWithRange', () => {
  it('renders with default placeholder', () => {
    render(<DatePickerWithRange />);
    expect(screen.getByText('Pick a date range')).toBeInTheDocument();
  });

  it('renders single date if only from is provided', () => {
    const date = new Date(2024, 0, 1);
    render(<DatePickerWithRange date={{ from: date }} />);
    expect(screen.getByText(format(date, "MMM dd, yyyy"))).toBeInTheDocument();
  });

  it('renders range if from and to are provided', () => {
    const from = new Date(2024, 0, 1);
    const to = new Date(2024, 0, 5);
    render(<DatePickerWithRange date={{ from, to }} />);
    const expectedText = `${format(from, "MMM dd, yyyy")} - ${format(to, "MMM dd, yyyy")}`;
    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });

  it('opens calendar popover when clicked', async () => {
    const user = userEvent.setup();
    render(<DatePickerWithRange />);
    
    await user.click(screen.getByRole('button'));
    // Look for the grid inside the calendar
    expect(screen.getAllByRole('grid')[0]).toBeInTheDocument();
  });
});
