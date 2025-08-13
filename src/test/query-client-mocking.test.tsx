import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, mockUseQuery, mockUseMutation, createMockQueryResult, createMockMutationResult } from '@/test/utils';
import { useQuery, useMutation } from '@tanstack/react-query';

// Simple test component that uses React Query
function TestComponent() {
  const { data: queryData, isPending } = useQuery({
    queryKey: ['test'],
    queryFn: () => Promise.resolve('test data'),
  });

  const { mutate, isPending: mutationPending } = useMutation({
    mutationFn: (data: string) => Promise.resolve(`mutated: ${data}`),
  });

  return (
    <div>
      <div data-testid="query-data">{isPending ? 'Loading...' : queryData}</div>
      <button 
        data-testid="mutate-button" 
        disabled={mutationPending}
        onClick={() => mutate('test')}
      >
        {mutationPending ? 'Mutating...' : 'Mutate'}
      </button>
    </div>
  );
}

describe('QueryClient Mocking Infrastructure', () => {
  beforeEach(() => {
    // Setup default mock implementations
    mockUseQuery.mockReturnValue(
      createMockQueryResult('test data', { isSuccess: true })
    );
    
    mockUseMutation.mockReturnValue(
      createMockMutationResult(null, { mutate: () => {}, isPending: false })
    );
  });

  it('renders component with mocked useQuery data', () => {
    renderWithProviders(<TestComponent />);
    
    expect(screen.getByTestId('query-data')).toHaveTextContent('test data');
    expect(screen.getByTestId('mutate-button')).toHaveTextContent('Mutate');
  });

  it('shows loading state with mocked useQuery', () => {
    mockUseQuery.mockReturnValue(
      createMockQueryResult(null, { isPending: true })
    );
    
    renderWithProviders(<TestComponent />);
    
    expect(screen.getByTestId('query-data')).toHaveTextContent('Loading...');
  });

  it('shows mutation loading state', () => {
    mockUseMutation.mockReturnValue(
      createMockMutationResult(null, { mutate: () => {}, isPending: true })
    );
    
    renderWithProviders(<TestComponent />);
    
    expect(screen.getByTestId('mutate-button')).toHaveTextContent('Mutating...');
    expect(screen.getByTestId('mutate-button')).toBeDisabled();
  });

  it('handles error states in queries', () => {
    mockUseQuery.mockReturnValue(
      createMockQueryResult(null, { 
        isError: true, 
        error: new Error('Query failed') 
      })
    );
    
    renderWithProviders(<TestComponent />);
    
    // Component should handle error state gracefully
    expect(screen.getByTestId('query-data')).toHaveTextContent('');
  });
});
