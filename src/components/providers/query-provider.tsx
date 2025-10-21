'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';

import { config } from '@/lib/config';

interface QueryProviderProps {
  children: React.ReactNode;
}

// Create a stable QueryClient that can handle SSR scenarios
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: config.cache.QUERY_STALE_TIME,
        gcTime: config.cache.QUERY_GC_TIME,
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error && typeof error === 'object' && 'status' in error) {
            const status = error.status as number;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          // Retry up to configured times for other errors
          return failureCount < config.api.MAX_QUERY_RETRIES;
        },
        refetchOnWindowFocus: false, // Disable refetch on window focus
        refetchOnReconnect: true, // Refetch when connection is restored
        // Only enable if we're in the browser to avoid SSR hydration issues
        enabled: typeof window !== 'undefined',
      },
      mutations: {
        retry: (failureCount, error) => {
          // Don't retry mutations on client errors
          if (error && typeof error === 'object' && 'status' in error) {
            const status = error.status as number;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          // Retry configured times for other errors
          return failureCount < config.api.MAX_MUTATION_RETRIES;
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  // Server: always make a new query client
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  // Browser: make a new query client if we don't already have one
  // This is very important, so we don't re-make a new client if React
  // suspends during the initial render. This may not be needed if we
  // have a suspense boundary BELOW the creation of the query client
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient();
  
  // Track if component is mounted to prevent hydration issues
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools after hydration to prevent SSR issues */}
      {mounted && process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false} 
          buttonPosition="bottom-right"
          position="bottom"
        />
      )}
    </QueryClientProvider>
  );
}