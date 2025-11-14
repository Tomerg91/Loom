import { Suspense } from 'react';
import { Metadata } from 'next';

import { withAuthGuard } from '@/lib/auth/guards';
import { withRoleGuard } from '@/lib/auth/guards';
import { LoadingState } from '@/components/dashboard';
import AuthAuditLogsPage from '@/components/admin/auth-audit-logs-page';

export const metadata: Metadata = {
  title: 'Authentication Audit Logs | Admin',
  description: 'View and monitor authentication and security events',
};

async function AuthAuditPage() {
  return (
    <Suspense fallback={<LoadingState title="Authentication Audit Logs" description="Loading audit logs..." />}>
      <AuthAuditLogsPage />
    </Suspense>
  );
}

// Apply authentication and admin role guard
export default withRoleGuard(withAuthGuard(AuthAuditPage), 'admin');
