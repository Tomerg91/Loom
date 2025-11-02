import { NextRequest } from 'next/server';

import { getAuthenticatedUser } from '@/lib/api/authenticated-request';
import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import {
  loadDashboardSummary,
  type SessionSchedulerActor,
} from '@/modules/sessions/server/queries';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    if (user.role !== 'coach') {
      return ApiResponseHelper.forbidden(
        `Coach access required. Current role: ${user.role}`
      );
    }

    const actor: SessionSchedulerActor = { id: user.id, role: 'coach' };
    const summary = await loadDashboardSummary(actor);

    return ApiResponseHelper.success(summary);
  } catch (error) {
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }

    return ApiResponseHelper.internalError('Failed to load dashboard summary');
  }
}
