import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import {
  ResponsiveGrid,
  StatsGrid,
  CardsGrid,
  ListGrid,
  AutoFitGrid,
} from '@/components/ui/responsive-grid';

const getClassList = (element: Element | null) =>
  element?.getAttribute('class')?.split(/\s+/).filter(Boolean) ?? [];

describe('ResponsiveGrid', () => {
  it('renders default responsive classes with children', () => {
    const { container, getByText } = render(
      <ResponsiveGrid data-testid="grid">
        <div>First</div>
        <div>Second</div>
      </ResponsiveGrid>
    );

    expect(getByText('First')).toBeInTheDocument();
    expect(getByText('Second')).toBeInTheDocument();

    const classes = getClassList(container.firstElementChild);
    expect(classes).toContain('grid');
    expect(classes).toContain('gap-4');
    expect(classes).toContain('grid-cols-1');
    expect(classes).toContain('sm:grid-cols-2');
    expect(classes).toContain('lg:grid-cols-3');
    expect(classes).toContain('xl:grid-cols-4');
  });

  it('applies provided columns and gap sizes', () => {
    const { container } = render(
      <ResponsiveGrid
        data-testid="grid"
        gap="lg"
        cols={{ default: 2, md: 3, xl: 5 }}
        className="custom"
      >
        <div>Only Child</div>
      </ResponsiveGrid>
    );

    const classes = getClassList(container.firstElementChild);
    expect(classes).toEqual(
      expect.arrayContaining([
        'grid',
        'gap-6',
        'grid-cols-2',
        'md:grid-cols-3',
        'xl:grid-cols-5',
        'custom',
      ])
    );
  });

  it('renders auto-fit variant with inline grid styles', () => {
    const { container } = render(
      <ResponsiveGrid autoFit minItemWidth="200px">
        <div>Item</div>
      </ResponsiveGrid>
    );

    const element = container.firstElementChild as HTMLElement;
    expect(element.style.gridTemplateColumns).toBe(
      'repeat(auto-fit, minmax(200px, 1fr))'
    );

    const classes = getClassList(element);
    expect(classes).toContain('grid');
    expect(classes).toContain('gap-4');
  });
});

describe('ResponsiveGrid presets', () => {
  it('StatsGrid renders four-column layout on large screens', () => {
    const { container } = render(
      <StatsGrid data-testid="stats-grid">
        <div>Metric</div>
      </StatsGrid>
    );

    const classes = getClassList(container.firstElementChild);
    expect(classes).toEqual(
      expect.arrayContaining([
        'grid-cols-1',
        'sm:grid-cols-2',
        'lg:grid-cols-4',
      ])
    );
  });

  it('CardsGrid renders multi-column layout with large gaps', () => {
    const { container } = render(
      <CardsGrid>
        <div>Card</div>
      </CardsGrid>
    );

    const classes = getClassList(container.firstElementChild);
    expect(classes).toEqual(
      expect.arrayContaining([
        'grid-cols-1',
        'md:grid-cols-2',
        'xl:grid-cols-3',
        'gap-6',
      ])
    );
  });

  it('ListGrid and AutoFitGrid expose semantic shortcuts', () => {
    const { container: listContainer } = render(
      <ListGrid>
        <div>Row</div>
      </ListGrid>
    );

    const listClasses = getClassList(listContainer.firstElementChild);
    expect(listClasses).toEqual(
      expect.arrayContaining(['grid-cols-1', 'lg:grid-cols-2', 'gap-4'])
    );

    const { container: autoFitContainer } = render(
      <AutoFitGrid minItemWidth="240px">
        <div>Tile</div>
      </AutoFitGrid>
    );

    const autoFitElement = autoFitContainer.firstElementChild as HTMLElement;
    expect(autoFitElement.style.gridTemplateColumns).toBe(
      'repeat(auto-fit, minmax(240px, 1fr))'
    );
  });
});
