import { NextRequest } from 'next/server';

import { compose, withAuth, withRole, withRateLimit } from '@/lib/api';
import { createSuccessResponse, createErrorResponse, HTTP_STATUS, withRequestLogging, withErrorHandling } from '@/lib/api/utils';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/admin/system/db-checks
export const GET = compose(
  withErrorHandling(withRequestLogging(async (request: NextRequest) => {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.rpc('db_health_check');
      if (error) {
        return createErrorResponse({ code: 'DB_HEALTH_RPC_ERROR', message: error.message }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
      return createSuccessResponse(data);
    } catch (err) {
      return createErrorResponse('Failed to run DB checks', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }, { name: 'admin:db-checks' })),
  withAuth,
  withRole(['admin']),
  withRateLimit(),
);

