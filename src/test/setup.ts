import '@testing-library/jest-dom';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

const NativeURL = global.URL;

type MinimalNextConfig = {
  basePath: string;
  i18n?: {
    locales: string[];
    defaultLocale: string;
    localeDetection: boolean;
  };
  trailingSlash: boolean;
};

const globalWithNextConfig = globalThis as typeof globalThis & {
  __NEXT_CONFIG__?: MinimalNextConfig;
};

if (!globalWithNextConfig.__NEXT_CONFIG__) {
  globalWithNextConfig.__NEXT_CONFIG__ = {
    basePath: '',
    i18n: {
      locales: ['en'],
      defaultLocale: 'en',
      localeDetection: false,
    },
    trailingSlash: false,
  };
}

vi.mock('next/server', async importOriginal => {
  const actual = await importOriginal<typeof import('next/server')>();

  class MockNextRequest {
    public nextUrl: URL;
    public headers: Headers;
    public method: string;
    public url: string;
    private bodyInit: BodyInit | null;

    constructor(input: RequestInfo | URL, init?: RequestInit) {
      const url = new NativeURL(
        input instanceof URL ? input.toString() : String(input),
        'http://localhost'
      );
      this.nextUrl = url;
      this.url = url.toString();
      this.headers = new Headers(init?.headers);
      this.method = init?.method ?? 'GET';
      this.bodyInit = init?.body ?? null;
    }

    get searchParams(): URLSearchParams {
      return this.nextUrl.searchParams;
    }

    async json(): Promise<unknown> {
      if (!this.bodyInit) {
        return {};
      }

      if (typeof this.bodyInit === 'string') {
        try {
          return JSON.parse(this.bodyInit);
        } catch (_error) {
          return {};
        }
      }

      if (this.bodyInit instanceof Uint8Array) {
        try {
          const text = new TextDecoder().decode(this.bodyInit);
          return JSON.parse(text);
        } catch (_error) {
          return {};
        }
      }

      return {};
    }
  }

  return {
    ...actual,
    NextRequest: MockNextRequest,
  };
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Set up jsdom environment with proper base URL
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
});

// Mock fetch globally to handle API calls in tests
global.fetch = vi.fn();

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

// Create exportable mock functions for React Query hooks
export const mockUseQuery = vi.fn();
export const mockUseMutation = vi.fn();
export const mockUseQueryClient = vi.fn();
export const mockQueryClient = {
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
  cancelQueries: vi.fn(),
};

// Mock @tanstack/react-query with consistent mock instances
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    QueryClient: vi.fn(() => mockQueryClient),
    useQuery: mockUseQuery,
    useMutation: mockUseMutation,
    useInfiniteQuery: vi.fn(),
    useQueryClient: mockUseQueryClient,
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

// Set up default mock return values
beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
  
  // Setup default mock implementations
  mockUseQueryClient.mockReturnValue(mockQueryClient);
  
  // Mock fetch with proper response structure
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({ data: null }),
    text: vi.fn().mockResolvedValue(''),
    blob: vi.fn(),
    arrayBuffer: vi.fn(),
    headers: new Headers(),
  });
});
