import { describe, it, expect, vi } from 'vitest';
import { ReportPdfDocument } from './report-pdf-document';

// Mock react-pdf since it relies on node/browser streams not present in pure jsdom effectively
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children }: any) => <div data-testid="pdf-page">{children}</div>,
  View: ({ children }: any) => <div data-testid="pdf-view">{children}</div>,
  Text: ({ children }: any) => <div data-testid="pdf-text">{children}</div>,
  Image: () => <img data-testid="pdf-image" alt="logo" />,
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Font: {
    register: vi.fn(),
  },
}));

describe('ReportPdfDocument', () => {
  it('renders without crashing (component is mostly declarative PDF definitions)', () => {
    const mockData = {
      title: 'Test Report',
      description: 'Test Desc',
      generatedBy: 'User A',
      generatedAt: new Date().toISOString(),
      filtersApplied: 'None',
      filterDetails: [],
      dataSource: 'Assets',
      summary: { totalRecords: 1 },
      headers: ['ID'],
      rows: [{ id: '1', ID: '1' }],
    };

    // We don't use render from RTL because it expects DOM nodes and React-PDF components aren't real DOM nodes
    // but with our mock, they are.
    const { render } = require('@testing-library/react');
    const { screen } = require('@testing-library/react');

    render(<ReportPdfDocument data={mockData} />);
    
    expect(screen.getAllByTestId('pdf-document').length).toBeGreaterThan(0);
  });
});
