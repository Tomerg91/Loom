import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/mock-path',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    QueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
      setQueryData: vi.fn(),
      getQueryData: vi.fn(),
      removeQueries: vi.fn(),
      clear: vi.fn(),
      mount: vi.fn(),
      unmount: vi.fn(),
      isFetching: vi.fn(),
      isMutating: vi.fn(),
      getDefaultOptions: vi.fn(() => ({})),
      setDefaultOptions: vi.fn(),
      getMutationCache: vi.fn(),
      getQueryCache: vi.fn(),
    })),
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useInfiniteQuery: vi.fn(),
    useQueryClient: vi.fn(),
  };
});

// Mock environment variables
Object.defineProperty(process, 'env', {
  value: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: 'https://mock-supabase-url.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock-anon-key',
  },
});