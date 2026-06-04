import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ModuleNavigationTabs } from './module-navigation-tabs';

describe('ModuleNavigationTabs', () => {
  const tabs = [
    { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
    { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
  ];

  it('renders tabs and default content', () => {
    render(<ModuleNavigationTabs tabs={tabs} />);
    expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
  });

  it('switches tabs on click', async () => {
    const user = userEvent.setup();
    const onTabChangeMock = vi.fn();
    
    render(<ModuleNavigationTabs tabs={tabs} onTabChange={onTabChangeMock} />);
    
    await user.click(screen.getByRole('tab', { name: 'Tab 2' }));
    
    expect(screen.getByText('Content 2')).toBeInTheDocument();
    expect(onTabChangeMock).toHaveBeenCalledWith('tab2');
  });
});
