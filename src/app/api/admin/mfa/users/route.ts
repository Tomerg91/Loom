import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { getMfaStatistics, getMfaUserStatuses } from '@/lib/database/mfa-admin';
import type { GetMfaUsersOptions } from '@/lib/database/mfa-admin';
import * as rateLimitModule from '@/lib/security/rate-limit';
import { authService } from '@/lib/services/auth-service';

// Provide a minimal Next.js runtime config for tests that instantiate NextRequest directly.
type MinimalNextConfig = {
  basePath: string;
  i18n?: unknown;
  trailingSlash: boolean;
};

const globalWithNextConfig = globalThis as typeof globalThis & {
  __NEXT_CONFIG__?: MinimalNextConfig;
};

if (!globalWithNextConfig.__NEXT_CONFIG__) {
  globalWithNextConfig.__NEXT_CONFIG__ = {
    basePath: '',
    i18n: undefined,
    trailingSlash: false,
  };
}

const getMfaUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['admin', 'coach', 'client']).optional(),
  mfaStatus: z.enum(['enabled', 'disabled', 'all']).default('all'),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeStatistics: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),
});

const handleRequest = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Verify admin access
    const session = await authService.getSession();
    if (!session?.user || session.user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Admin access required for MFA management');
    }

    const requestUrl = 'nextUrl' in request ? request.nextUrl : new URL(request.url);
    const searchParams = requestUrl.searchParams;

    const getParam = (key: string) => {
      const value = searchParams.get(key);
      return value === null ? undefined : value;
    };

    const queryParams = {
      page: getParam('page'),
      limit: getParam('limit'),
      search: (() => {
        const value = getParam('search');
        return value === '' ? undefined : value;
      })(),
      role: (() => {
        const value = getParam('role');
        return value === '' ? undefined : value;
      })(),
      mfaStatus: (() => {
        const value = getParam('mfaStatus');
        return value === '' ? undefined : value;
      })(),
      sortBy: (() => {
        const value = getParam('sortBy');
        return value === '' ? undefined : value;
      })(),
      sortOrder: (() => {
        const value = getParam('sortOrder');
        return value === '' ? undefined : value;
      })(),
      includeStatistics: (() => {
        const value = getParam('includeStatistics');
        return value === '' ? undefined : value;
      })(),
    };

    const validation = getMfaUsersQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return ApiResponseHelper.badRequest(
        'Invalid query parameters',
        validation.error.issues
      );
    }

    const {
      includeStatistics,
      page,
      limit,
      search: parsedSearch,
      role,
      mfaStatus,
      sortBy,
      sortOrder,
    } = validation.data;

    const userOptions: GetMfaUsersOptions = {
      page,
      limit,
      sortBy,
      sortOrder,
    };

    if (parsedSearch) {
      userOptions.search = parsedSearch;
    }

    if (role) {
      userOptions.role = role;
    }

    if (mfaStatus && mfaStatus !== 'all') {
      userOptions.mfaStatus = mfaStatus;
    }

    // Fetch MFA user statuses
    const usersResult = await getMfaUserStatuses(userOptions);
    if (!usersResult.success) {
      const errorMessage = !usersResult.error || usersResult.error === 'Unknown error'
        ? 'Failed to fetch MFA user data'
        : usersResult.error;

      return ApiResponseHelper.internalError(errorMessage);
    }

    let statistics = null;
    if (includeStatistics) {
      const statsResult = await getMfaStatistics();
      if (statsResult.success) {
        statistics = statsResult.data;
      } else {
        console.error('Failed to fetch MFA statistics:', statsResult.error);
        // Don't fail the request if statistics fail, just log the error
      }
    }

    const response = {
      users: usersResult.data.users,
      pagination: {
        total: usersResult.data.total,
        page: usersResult.data.page,
        limit: usersResult.data.limit,
      },
      statistics,
    };

    return ApiResponseHelper.success(response);
  } catch (error) {
    console.error('Get MFA users API error:', error);

    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }

    return ApiResponseHelper.internalError('Failed to fetch MFA user data');
  }
};

export async function GET(request: NextRequest): Promise<Response> {
  return rateLimitModule.rateLimit(50, 60000)(handleRequest)(request);
}
