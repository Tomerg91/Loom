import { render } from '@testing-library/react';

import { DashboardShell } from '../dashboard-shell';

describe('DashboardShell', () => {
  it('renders header with skeleton for user name', () => {
    const { container } = render(<DashboardShell isLoading={true} />);
    const skeletons = container.querySelectorAll('[aria-busy="true"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders grid of quick action skeletons', () => {
    const { container } = render(<DashboardShell isLoading={true} />);
    const grid = container.querySelector('[data-testid="quick-actions-grid"]');
    expect(grid).toBeInTheDocument();
    const actionSkeletons = grid?.querySelectorAll('[aria-busy="true"]');
    expect(actionSkeletons?.length).toBe(4);
  });

  it('renders snapshot skeleton', () => {
    const { container } = render(<DashboardShell isLoading={true} />);
    expect(
      container.querySelector('[data-testid="snapshot-skeleton"]')
    ).toBeInTheDocument();
  });

  it('renders activity feed skeleton', () => {
    const { container } = render(<DashboardShell isLoading={true} />);
    expect(
      container.querySelector('[data-testid="activity-feed"]')
    ).toBeInTheDocument();
  });
});
