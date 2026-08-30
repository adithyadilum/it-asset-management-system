import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetRegistryPanels } from './asset-registry-panels';
import { useRouter } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('./panels/asset-details-panel-wrapper', () => ({
  AssetDetailsPanelWrapper: (props: any) => (
    <div data-testid="details-panel" data-open={props.isOpen}>
      Details: {props.recordId}
      <button onClick={props.onClose}>Close Details</button>
      <button onClick={() => props.onRefreshRef?.current?.()}>Refresh</button>
    </div>
  ),
}));

vi.mock('./panels/registration-panel-wrapper', () => ({
  RegistrationPanelWrapper: (props: any) => (
    <div data-testid="registration-panel" data-open={props.isOpen}>
      Registration
      <button onClick={() => props.onClose(true)}>Close Success</button>
      <button onClick={() => props.onClose(false)}>Close Fail</button>
    </div>
  ),
}));

describe('AssetRegistryPanels', () => {
  const mockRouterPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockRouterPush });
  });

  it('renders nothing when no panels are open', () => {
    render(<AssetRegistryPanels closePanelUrl="/assets" pillar="" />);
    expect(screen.queryByTestId('registration-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('details-panel')).not.toBeInTheDocument();
  });

  it('renders registration panel when currentPanel is registration and pillar is set', () => {
    render(
      <AssetRegistryPanels
        closePanelUrl="/assets"
        pillar="HARDWARE"
        currentPanel="registration"
      />
    );

    const regPanel = screen.getByTestId('registration-panel');
    expect(regPanel).toBeInTheDocument();
    expect(regPanel).toHaveAttribute('data-open', 'true');
  });

  it('handles closing registration panel successfully', () => {
    const mockRefresh = vi.fn();
    const onRefreshRef = { current: mockRefresh } as any;

    render(
      <AssetRegistryPanels
        closePanelUrl="/assets"
        pillar="HARDWARE"
        currentPanel="registration"
        onRefreshRef={onRefreshRef}
      />
    );

    fireEvent.click(screen.getByText('Close Success'));
    expect(mockRefresh).toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith('/assets', { scroll: false });
  });

  it('handles closing registration panel without success', () => {
    const mockRefresh = vi.fn();
    const onRefreshRef = { current: mockRefresh } as any;

    render(
      <AssetRegistryPanels
        closePanelUrl="/assets"
        pillar="HARDWARE"
        currentPanel="registration"
        onRefreshRef={onRefreshRef}
      />
    );

    fireEvent.click(screen.getByText('Close Fail'));
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith('/assets', { scroll: false });
  });

  it('renders details panel when recordId is provided', () => {
    render(
      <AssetRegistryPanels
        closePanelUrl="/assets"
        pillar="HARDWARE"
        currentPanel="record"
        recordId="rec-1"
      />
    );

    const detailsPanel = screen.getByTestId('details-panel');
    expect(detailsPanel).toBeInTheDocument();
    expect(detailsPanel).toHaveAttribute('data-open', 'true');
    expect(detailsPanel).toHaveTextContent('Details: rec-1');
  });

  it('handles closing details panel', () => {
    render(
      <AssetRegistryPanels
        closePanelUrl="/assets"
        pillar="HARDWARE"
        currentPanel="record"
        recordId="rec-1"
      />
    );

    fireEvent.click(screen.getByText('Close Details'));
    expect(mockRouterPush).toHaveBeenCalledWith('/assets', { scroll: false });
  });
});
