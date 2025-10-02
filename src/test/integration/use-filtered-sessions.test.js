import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return actual;
});

import { screen, waitFor } from '@testing-library/react';
import React from 'react';

import { useFilteredSessions } from '@/lib/queries/sessions';
import {
  createMockSession,
  renderWithProviders,
  createTestQueryClient,
} from '@/test/utils';

function FilteredSessionsTestComponent({ clientId, options }) {
  const query = useFilteredSessions(clientId, options);

  return React.createElement(
    'div',
    null,
    React.createElement('span', { 'data-testid': 'status' }, query.status),
    React.createElement(
      'span',
      { 'data-testid': 'error' },
      query.error ? 'error' : ''
    ),
    React.createElement(
      'span',
      { 'data-testid': 'data' },
      query.data ? JSON.stringify(query.data) : ''
    )
  );
}

describe('useFilteredSessions integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('builds the request URL with all provided filters', async () => {
    const mockResponse = {
      data: [createMockSession({ id: 'session-1' })],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse),
    });
    global.fetch = fetchMock;

    const queryClient = createTestQueryClient();
    const options = {
      filters: {
        status: ['scheduled', 'completed'],
        dateRange: {
          from: new Date('2024-01-01T00:00:00Z'),
          to: new Date('2024-01-31T23:59:59Z'),
        },
        sessionType: ['video'],
        search: ' career coaching ',
      },
      sortBy: 'date',
      sortOrder: 'asc',
      page: 2,
      limit: 25,
      viewMode: 'list',
    };

    renderWithProviders(
      React.createElement(FilteredSessionsTestComponent, {
        clientId: 'client-123',
        options,
      }),
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('success');
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestUrl = fetchMock.mock.calls[0][0];
    const url = new URL(requestUrl, 'http://localhost');

    expect(url.pathname).toBe('/api/sessions');
    expect(url.searchParams.get('clientId')).toBe('client-123');
    expect(url.searchParams.getAll('status')).toEqual([
      'scheduled',
      'completed',
    ]);
    expect(url.searchParams.get('dateFrom')).toBe('2024-01-01T00:00:00.000Z');
    expect(url.searchParams.get('dateTo')).toBe('2024-01-31T23:59:59.000Z');
    expect(url.searchParams.getAll('sessionType')).toEqual(['video']);
    expect(url.searchParams.get('search')).toBe(' career coaching ');
    expect(url.searchParams.get('sortBy')).toBe('date');
    expect(url.searchParams.get('sortOrder')).toBe('asc');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('limit')).toBe('25');

    const data = screen.getByTestId('data').textContent;
    expect(data).toBe(JSON.stringify(mockResponse));

    queryClient.clear();
  });

  it('exposes an error state when the request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn(),
    });
    global.fetch = fetchMock;

    const queryClient = createTestQueryClient();

    renderWithProviders(
      React.createElement(FilteredSessionsTestComponent, {
        clientId: 'client-123',
        options: { page: 1, limit: 10 },
      }),
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('error');
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('error')).toHaveTextContent('error');

    queryClient.clear();
  });
});
