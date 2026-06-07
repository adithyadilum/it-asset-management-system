import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataTablesContainer } from './data-tables-container';

describe('DataTablesContainer', () => {
  it('renders data tables container with sections', () => {
    render(<DataTablesContainer leftSection={<div data-testid="left" />} rightSection={<div data-testid="right" />} />);
    
    expect(screen.getByTestId('left')).toBeInTheDocument();
    expect(screen.getByTestId('right')).toBeInTheDocument();
  });
});
