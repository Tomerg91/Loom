import { render } from '@testing-library/react';

import { Skeleton } from '../skeleton';

describe('Skeleton', () => {
  it('renders with pulsing animation', () => {
    const { container } = render(<Skeleton className="h-12 w-32" />);
    const element = container.firstChild;
    expect(element).toHaveClass('animate-pulse');
  });

  it('accepts custom className', () => {
    const { container } = render(<Skeleton className="h-20 w-40 rounded-lg" />);
    expect(container.firstChild).toHaveClass('h-20', 'w-40', 'rounded-lg');
  });

  it('has aria-busy attribute for accessibility', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true');
  });
});
