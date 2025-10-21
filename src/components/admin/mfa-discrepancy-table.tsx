'use client';

import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface MfaDiscrepancy {
  userId: string;
  email: string;
  role: 'admin' | 'coach' | 'client';
  unifiedStatus: boolean;
  legacyStatus: boolean;
  activeMethodCount: number;
  totalMethods: number;
  activeMethodTypes: string[];
}

interface MfaDiscrepancyTableProps {
  discrepancies: MfaDiscrepancy[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function MfaDiscrepancyTable({
  discrepancies,
  isLoading = false,
  onRefresh,
}: MfaDiscrepancyTableProps) {
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'coach':
        return 'default';
      case 'client':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRemediationSteps = (discrepancy: MfaDiscrepancy): string[] => {
    const steps: string[] = [];

    if (discrepancy.unifiedStatus && !discrepancy.legacyStatus) {
      // Unified shows enabled, legacy shows disabled
      steps.push('Legacy MFA flag is out of sync (should be true)');
      steps.push('Trigger sync will update users.mfa_enabled to true');
    } else if (!discrepancy.unifiedStatus && discrepancy.legacyStatus) {
      // Unified shows disabled, legacy shows enabled
      steps.push('Legacy MFA flag is out of sync (should be false)');
      steps.push('Trigger sync will update users.mfa_enabled to false');
    }

    if (discrepancy.activeMethodCount === 0 && discrepancy.unifiedStatus) {
      steps.push('Warning: User marked as MFA enabled but has no active methods');
    }

    if (discrepancy.activeMethodCount > 0 && !discrepancy.unifiedStatus) {
      steps.push('Warning: User has active MFA methods but marked as disabled');
    }

    return steps;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>MFA Discrepancies</CardTitle>
          <CardDescription>Loading discrepancies...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (discrepancies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                MFA Discrepancies
              </CardTitle>
              <CardDescription>No discrepancies found - all MFA sources are in sync</CardDescription>
            </div>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All users have consistent MFA status across unified and legacy sources. The automatic
              sync trigger is working correctly.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              MFA Discrepancies
            </CardTitle>
            <CardDescription>
              Found {discrepancies.length} user{discrepancies.length !== 1 ? 's' : ''} with MFA
              status mismatches
            </CardDescription>
          </div>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            These discrepancies indicate users where the unified MFA status (from user_mfa_methods)
            differs from the legacy users.mfa_enabled flag. This should be automatically resolved by
            the sync trigger on the next MFA method change.
          </AlertDescription>
        </Alert>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Unified Status</TableHead>
                <TableHead>Legacy Status</TableHead>
                <TableHead>Active Methods</TableHead>
                <TableHead>Remediation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discrepancies.map((discrepancy) => {
                const steps = getRemediationSteps(discrepancy);
                return (
                  <TableRow key={discrepancy.userId}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{discrepancy.email}</span>
                        <span className="text-xs text-muted-foreground">
                          ID: {discrepancy.userId.slice(0, 8)}...
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeColor(discrepancy.role)}>
                        {discrepancy.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {discrepancy.unifiedStatus ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">
                          {discrepancy.unifiedStatus ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {discrepancy.legacyStatus ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">
                          {discrepancy.legacyStatus ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">
                          {discrepancy.activeMethodCount} / {discrepancy.totalMethods}
                        </span>
                        {discrepancy.activeMethodTypes.length > 0 && (
                          <div className="flex gap-1">
                            {discrepancy.activeMethodTypes.map((method) => (
                              <Badge key={method} variant="outline" className="text-xs">
                                {method}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {steps.map((step, index) => (
                          <span key={index} className="text-xs text-muted-foreground">
                            • {step}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
