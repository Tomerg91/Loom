import { NextRequest } from 'next/server';

import { ApiResponseHelper } from '@/lib/api/types';
import { authService } from '@/lib/services/auth-service';
import { parseTaskListQueryParams } from '@/modules/tasks/api/query-helpers';
import { logger } from '@/lib/logger';
import {
  TaskService,
  TaskServiceError,
} from '@/modules/tasks/services/task-service';

const taskService = new TaskService();

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const session = await authService.getSession();

    if (!session?.user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    const role = session.user.role;

    if (role !== 'client' && role !== 'admin') {
      return ApiResponseHelper.forbidden(
        `Client access required. Current role: ${role}`
      );
    }

    const parsed = parseTaskListQueryParams(request.nextUrl.searchParams);

    if (!parsed.success) {
      return ApiResponseHelper.badRequest(
        'Invalid query parameters',
        parsed.error.flatten()
      );
    }

    const normalizedFilters = {
      ...parsed.data,
      clientId: role === 'client' ? session.user.id : parsed.data.clientId,
    };

    const result = await taskService.listTasksForClient(
      { id: session.user.id, role: role as 'client' | 'admin' | 'coach' },
      normalizedFilters
    );

    return ApiResponseHelper.success(result);
  } catch (error) {
    if (error instanceof TaskServiceError) {
      return ApiResponseHelper.error(
        error.code,
        error.message,
        error.status
      );
    }

    logger.error('Client tasks API error:', error);
    return ApiResponseHelper.internalError('Failed to fetch client tasks');
  }
}
