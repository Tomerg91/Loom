'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Database,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import type {
  ResourceValidationReport as ValidationReportType,
  ValidationCheck,
} from '@/types/resource-validation';

interface ResourceValidationReportProps {
  onRefresh?: () => void;
}

export function ResourceValidationReport({ onRefresh }: ResourceValidationReportProps) {
  const [report, setReport] = useState<ValidationReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/validate-resources');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch validation report');
      }

      setReport(data.data);
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700">Warning</Badge>;
      case 'info':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-700">Info</Badge>;
    }
  };

  if (!report && !loading && !error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resource Library Validation</CardTitle>
          <CardDescription>
            Run validation checks to identify data inconsistencies and orphaned records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Database className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No validation report available</p>
            <Button onClick={fetchReport} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Validation
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Resource Library Validation</CardTitle>
              <CardDescription>
                Last run: {report ? new Date(report.timestamp).toLocaleString() : 'Never'}
              </CardDescription>
            </div>
            <Button onClick={fetchReport} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Running...' : 'Run Validation'}
            </Button>
          </div>
        </CardHeader>
        {report && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{report.totalIssues}</p>
                  <p className="text-sm text-muted-foreground">Total Issues</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{report.criticalIssues}</p>
                  <p className="text-sm text-muted-foreground">Critical</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{report.warningIssues}</p>
                  <p className="text-sm text-muted-foreground">Warnings</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Info className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{report.infoIssues}</p>
                  <p className="text-sm text-muted-foreground">Info</p>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {report && !report.hasIssues && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>All Clear!</AlertTitle>
          <AlertDescription>
            No data inconsistencies or orphaned records found in the resource library.
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Checks */}
      {report && report.hasIssues && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Issues</CardTitle>
            <CardDescription>
              {report.checks.length} validation checks run, {report.checks.filter(c => c.issueCount > 0).length} found issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {report.checks
                .filter(check => check.issueCount > 0)
                .sort((a, b) => {
                  // Sort by severity (critical > warning > info), then by count
                  const severityOrder = { critical: 0, warning: 1, info: 2 };
                  if (severityOrder[a.severity] !== severityOrder[b.severity]) {
                    return severityOrder[a.severity] - severityOrder[b.severity];
                  }
                  return b.issueCount - a.issueCount;
                })
                .map((check) => (
                  <ValidationCheckCard key={check.issueType} check={check} />
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {report && report.statistics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Table Statistics
            </CardTitle>
            <CardDescription>Resource library table activity</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead className="text-right">Total Records</TableHead>
                  <TableHead className="text-right">Last 7 Days</TableHead>
                  <TableHead className="text-right">Last 30 Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.statistics.map((stat) => (
                  <TableRow key={stat.tableName}>
                    <TableCell className="font-mono">{stat.tableName}</TableCell>
                    <TableCell className="text-right font-bold">{stat.totalRecords.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{stat.createdLast7Days.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{stat.createdLast30Days.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Affected Coaches */}
      {report && report.affectedCoaches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Affected Coaches
            </CardTitle>
            <CardDescription>
              {report.affectedCoaches.length} coach(es) have collections with validation issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coach</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Affected Collections</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.affectedCoaches.map((coach) => (
                  <TableRow key={coach.coachId}>
                    <TableCell>
                      {coach.firstName && coach.lastName
                        ? `${coach.firstName} ${coach.lastName}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{coach.email}</TableCell>
                    <TableCell className="text-right font-bold">
                      {coach.affectedCollectionCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ValidationCheckCard({ check }: { check: ValidationCheck }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {getSeverityIcon(check.severity)}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{check.title}</h4>
              {getSeverityBadge(check.severity)}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{check.description}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="font-semibold text-destructive">{check.issueCount} issue(s) found</span>
              {check.totalDuplicates && (
                <span className="text-muted-foreground">
                  {check.totalDuplicates} total duplicates
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Hide Details' : 'Show Details'}
        </Button>
      </div>

      {expanded && (
        <div className="pt-3 border-t space-y-3">
          {/* Affected IDs */}
          {(check.affectedIds?.length ?? 0) > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Affected IDs ({check.affectedIds!.length}):</p>
              <p className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
                {check.affectedIds!.slice(0, 5).join(', ')}
                {check.affectedIds!.length > 5 && ` ... and ${check.affectedIds!.length - 5} more`}
              </p>
            </div>
          )}

          {/* Collection IDs */}
          {(check.affectedCollectionIds?.length ?? 0) > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Affected Collections ({check.affectedCollectionIds!.length}):</p>
              <p className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
                {check.affectedCollectionIds!.slice(0, 5).join(', ')}
                {check.affectedCollectionIds!.length > 5 && ` ... and ${check.affectedCollectionIds!.length - 5} more`}
              </p>
            </div>
          )}

          {/* Remediation Steps */}
          <div>
            <p className="text-sm font-medium mb-2">Remediation Steps:</p>
            <ol className="list-decimal list-inside space-y-1">
              {check.remediation.map((step, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function getSeverityIcon(severity: 'critical' | 'warning' | 'info') {
  switch (severity) {
    case 'critical':
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'info':
      return <Info className="h-5 w-5 text-blue-500" />;
  }
}

function getSeverityBadge(severity: 'critical' | 'warning' | 'info') {
  switch (severity) {
    case 'critical':
      return <Badge variant="destructive">Critical</Badge>;
    case 'warning':
      return (
        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700">
          Warning
        </Badge>
      );
    case 'info':
      return (
        <Badge variant="secondary" className="bg-blue-500/10 text-blue-700">
          Info
        </Badge>
      );
  }
}
