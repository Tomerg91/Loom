import { unstable_cache } from 'next/cache';

// Cache configuration
export const CACHE_TAGS = {
  SESSIONS: 'sessions',
  USERS: 'users',
  NOTIFICATIONS: 'notifications',
  ANALYTICS: 'analytics',
  AVAILABILITY: 'availability',
  REFLECTIONS: 'reflections',
} as const;

export const CACHE_DURATIONS = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

// Generic cache wrapper
export function createCachedFunction<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    keyPrefix: string;
    tags?: string[];
    revalidate?: number;
    keyGenerator?: (...args: T) => string;
  }
) {
  return unstable_cache(
    fn,
    [options.keyPrefix],
    {
      tags: options.tags,
      revalidate: options.revalidate || CACHE_DURATIONS.MEDIUM,
    }
  );
}

// Session-specific caching
export const cachedSessionOperations = {
  getSessions: createCachedFunction(
    async (userId: string, role: string) => {
      const { createSessionService } = await import('@/lib/database/sessions');
      const sessionService = createSessionService();
      return sessionService.getUserSessions(userId, role as any);
    },
    {
      keyPrefix: 'user-sessions',
      tags: [CACHE_TAGS.SESSIONS],
      revalidate: CACHE_DURATIONS.SHORT,
      keyGenerator: (userId, role) => `${userId}-${role}`,
    }
  ),

  getUpcomingSessions: createCachedFunction(
    async (userId: string) => {
      const { createSessionService } = await import('@/lib/database/sessions');
      const sessionService = createSessionService();
      return sessionService.getUpcomingSessions(userId);
    },
    {
      keyPrefix: 'upcoming-sessions',
      tags: [CACHE_TAGS.SESSIONS],
      revalidate: CACHE_DURATIONS.SHORT,
    }
  ),

  getSessionAnalytics: createCachedFunction(
    async (userId: string, timeframe: string) => {
      const { createSessionAnalyticsService } = await import('@/lib/database/services/session-analytics');
      const analyticsService = createSessionAnalyticsService();
      return analyticsService.getSessionAnalytics(userId, timeframe as any);
    },
    {
      keyPrefix: 'session-analytics',
      tags: [CACHE_TAGS.ANALYTICS, CACHE_TAGS.SESSIONS],
      revalidate: CACHE_DURATIONS.LONG,
      keyGenerator: (userId, timeframe) => `${userId}-${timeframe}`,
    }
  ),
};

// User-specific caching
export const cachedUserOperations = {
  getUserProfile: createCachedFunction(
    async (userId: string) => {
      const { createUserService } = await import('@/lib/database/users');
      const userService = createUserService();
      return userService.getUserProfile(userId);
    },
    {
      keyPrefix: 'user-profile',
      tags: [CACHE_TAGS.USERS],
      revalidate: CACHE_DURATIONS.MEDIUM,
    }
  ),

  getUserStats: createCachedFunction(
    async (userId: string, role: string) => {
      const { createUserService } = await import('@/lib/database/users');
      const userService = createUserService();
      return userService.getUserStats(userId, role as any);
    },
    {
      keyPrefix: 'user-stats',
      tags: [CACHE_TAGS.USERS, CACHE_TAGS.ANALYTICS],
      revalidate: CACHE_DURATIONS.MEDIUM,
      keyGenerator: (userId, role) => `${userId}-${role}`,
    }
  ),
};

// Analytics caching
export const cachedAnalyticsOperations = {
  getAdminAnalytics: createCachedFunction(
    async (timeframe: string) => {
      const { createAdminAnalyticsService } = await import('@/lib/database/admin-analytics');
      const analyticsService = createAdminAnalyticsService();
      return analyticsService.getAnalytics(timeframe as any);
    },
    {
      keyPrefix: 'admin-analytics',
      tags: [CACHE_TAGS.ANALYTICS],
      revalidate: CACHE_DURATIONS.LONG,
    }
  ),

  getDashboardMetrics: createCachedFunction(
    async (userId: string, role: string) => {
      const { createUserService } = await import('@/lib/database/users');
      const userService = createUserService();
      return userService.getDashboardMetrics(userId, role as any);
    },
    {
      keyPrefix: 'dashboard-metrics',
      tags: [CACHE_TAGS.ANALYTICS, CACHE_TAGS.USERS],
      revalidate: CACHE_DURATIONS.MEDIUM,
      keyGenerator: (userId, role) => `${userId}-${role}`,
    }
  ),
};

// Notification caching
export const cachedNotificationOperations = {
  getUserNotifications: createCachedFunction(
    async (userId: string) => {
      const { createNotificationService } = await import('@/lib/database/notifications');
      const notificationService = createNotificationService();
      return notificationService.getUserNotifications(userId);
    },
    {
      keyPrefix: 'user-notifications',
      tags: [CACHE_TAGS.NOTIFICATIONS],
      revalidate: CACHE_DURATIONS.SHORT,
    }
  ),
};

// Cache invalidation utilities
export async function invalidateCache(tags: string | string[]) {
  const { revalidateTag } = await import('next/cache');
  const tagsArray = Array.isArray(tags) ? tags : [tags];
  
  for (const tag of tagsArray) {
    revalidateTag(tag);
  }
}

export async function invalidateUserCache(userId: string) {
  await invalidateCache([
    CACHE_TAGS.USERS,
    CACHE_TAGS.SESSIONS,
    CACHE_TAGS.NOTIFICATIONS,
    CACHE_TAGS.ANALYTICS,
  ]);
}

export async function invalidateSessionCache() {
  await invalidateCache([CACHE_TAGS.SESSIONS, CACHE_TAGS.ANALYTICS]);
}

// Client-side caching utilities
export class ClientCache {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  static set<T>(key: string, data: T, ttlSeconds: number = CACHE_DURATIONS.MEDIUM): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  static delete(key: string): void {
    this.cache.delete(key);
  }

  static clear(): void {
    this.cache.clear();
  }

  static keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Clean expired entries
  static cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Auto cleanup client cache every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    ClientCache.cleanup();
  }, 5 * 60 * 1000);
}

// React Query cache configuration
export const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: CACHE_DURATIONS.SHORT * 1000,
      gcTime: CACHE_DURATIONS.MEDIUM * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount: number, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: 1,
    },
  },
};

// Prefetch strategies
export const prefetchStrategies = {
  // Prefetch user data on login
  async prefetchUserData(userId: string, role: string) {
    const { createQueryClient } = await import('@/lib/queries');
    const queryClient = createQueryClient();

    // Prefetch critical data
    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ['user-profile', userId],
        queryFn: () => cachedUserOperations.getUserProfile(userId),
        staleTime: CACHE_DURATIONS.MEDIUM * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['user-sessions', userId],
        queryFn: () => cachedSessionOperations.getSessions(userId, role),
        staleTime: CACHE_DURATIONS.SHORT * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['user-notifications', userId],
        queryFn: () => cachedNotificationOperations.getUserNotifications(userId),
        staleTime: CACHE_DURATIONS.SHORT * 1000,
      }),
    ]);
  },

  // Prefetch route-specific data
  async prefetchRouteData(route: string, userId: string, role: string) {
    const { createQueryClient } = await import('@/lib/queries');
    const queryClient = createQueryClient();

    switch (route) {
      case '/dashboard':
        await queryClient.prefetchQuery({
          queryKey: ['dashboard-metrics', userId],
          queryFn: () => cachedAnalyticsOperations.getDashboardMetrics(userId, role),
        });
        break;
      case '/sessions':
        await queryClient.prefetchQuery({
          queryKey: ['user-sessions', userId],
          queryFn: () => cachedSessionOperations.getSessions(userId, role),
        });
        break;
      case '/admin/analytics':
        if (role === 'admin') {
          await queryClient.prefetchQuery({
            queryKey: ['admin-analytics', 'month'],
            queryFn: () => cachedAnalyticsOperations.getAdminAnalytics('month'),
          });
        }
        break;
    }
  },
};