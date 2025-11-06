import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import type {
  ResourceValidationReport,
  ValidationCheck,
  ValidationCheckType,
  TableStatistics,
  AffectedCoach,
} from '@/types/resource-validation';
import { logger } from '@/lib/logger';
import {
  getCheckSeverity,
  getCheckTitle,
  getCheckDescription,
  getCheckRemediation,
} from '@/types/resource-validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/validate-resources
 *
 * Runs all 10 resource library validation checks and returns a comprehensive report.
 *
 * Validation checks:
 * 1. Orphaned collection items
 * 2. Non-library resources in collections
 * 3. Orphaned progress records
 * 4. Progress for non-library resources
 * 5. Empty collections (>7 days old)
 * 6. Duplicate collection items
 * 7. Ownership mismatches
 * 8. Progress without share records
 * 9. Invalid coach references
 * 10. Invalid client references
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Verify admin access
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const startTime = Date.now();
    const checks: ValidationCheck[] = [];

    // ========================================================================
    // Check 1: Orphaned collection items
    // ========================================================================
    const { data: orphanedItems } = await supabase.rpc(
      'validate_orphaned_collection_items'
    );

    if (orphanedItems && orphanedItems.length > 0) {
      const check = orphanedItems[0];
      checks.push({
        issueType: 'ORPHANED_ITEMS' as ValidationCheckType,
        issueCount: check.issue_count || 0,
        severity: getCheckSeverity('ORPHANED_ITEMS'),
        title: getCheckTitle('ORPHANED_ITEMS'),
        description: getCheckDescription('ORPHANED_ITEMS'),
        affectedIds: check.affected_ids || [],
        remediation: getCheckRemediation('ORPHANED_ITEMS'),
      });
    }

    // ========================================================================
    // Check 2: Non-library resources in collections
    // ========================================================================
    const { data: nonLibraryItems } = await supabase.rpc(
      'validate_non_library_collection_items'
    );

    if (nonLibraryItems && nonLibraryItems.length > 0) {
      const check = nonLibraryItems[0];
      checks.push({
        issueType: 'NON_LIBRARY_ITEMS' as ValidationCheckType,
        issueCount: check.issue_count || 0,
        severity: getCheckSeverity('NON_LIBRARY_ITEMS'),
        title: getCheckTitle('NON_LIBRARY_ITEMS'),
        description: getCheckDescription('NON_LIBRARY_ITEMS'),
        affectedItemIds: check.affected_collection_item_ids || [],
        affectedFileIds: check.affected_file_ids || [],
        remediation: getCheckRemediation('NON_LIBRARY_ITEMS'),
      });
    }

    // ========================================================================
    // Check 3: Orphaned progress records
    // ========================================================================
    const { data: orphanedProgress } = await supabase.rpc(
      'validate_orphaned_progress_records'
    );

    if (orphanedProgress && orphanedProgress.length > 0) {
      const check = orphanedProgress[0];
      checks.push({
        issueType: 'ORPHANED_PROGRESS' as ValidationCheckType,
        issueCount: check.issue_count || 0,
        severity: getCheckSeverity('ORPHANED_PROGRESS'),
        title: getCheckTitle('ORPHANED_PROGRESS'),
        description: getCheckDescription('ORPHANED_PROGRESS'),
        affectedIds: check.affected_ids || [],
        remediation: getCheckRemediation('ORPHANED_PROGRESS'),
      });
    }

    // ========================================================================
    // Check 4: Progress for non-library resources
    // ========================================================================
    const { data: nonLibraryProgress } = await supabase.rpc(
      'validate_non_library_progress_records'
    );

    if (nonLibraryProgress && nonLibraryProgress.length > 0) {
      const check = nonLibraryProgress[0];
      checks.push({
        issueType: 'NON_LIBRARY_PROGRESS' as ValidationCheckType,
        issueCount: check.issue_count || 0,
        severity: getCheckSeverity('NON_LIBRARY_PROGRESS'),
        title: getCheckTitle('NON_LIBRARY_PROGRESS'),
        description: getCheckDescription('NON_LIBRARY_PROGRESS'),
        affectedProgressIds: check.affected_progress_ids || [],
        affectedFileIds: check.affected_file_ids || [],
        remediation: getCheckRemediation('NON_LIBRARY_PROGRESS'),
      });
    }

    // ========================================================================
    // Check 5: Empty collections (>7 days old)
    // ========================================================================
    const { data: emptyCollections } = await supabase.rpc(
      'validate_empty_collections'
    );

    if (emptyCollections && emptyCollections.length > 0) {
      const check = emptyCollections[0];
      checks.push({
        issueType: 'EMPTY_COLLECTIONS' as ValidationCheckType,
        issueCount: check.issue_count || 0,
        severity: getCheckSeverity('EMPTY_COLLECTIONS'),
        title: getCheckTitle('EMPTY_COLLECTIONS'),
        description: getCheckDescription('EMPTY_COLLECTIONS'),
        affectedCollectionIds: check.affected_collection_ids || [],
        remediation: getCheckRemediation('EMPTY_COLLECTIONS'),
      });
    }

    // ========================================================================
    // Check 6: Duplicate collection items
    // ========================================================================
    const { data: duplicateItems } = await supabase.rpc(
      'validate_duplicate_collection_items'
    );

    if (duplicateItems && duplicateItems.length > 0) {
      const check = duplicateItems[0];
      checks.push({
        issueType: 'DUPLICATE_ITEMS' as ValidationCheckType,
        issueCount: check.issue_count || 0,
        severity: getCheckSeverity('DUPLICATE_ITEMS'),
        title: getCheckTitle('DUPLICATE_ITEMS'),
        description: getCheckDescription('DUPLICATE_ITEMS'),
        totalDuplicates: check.total_duplicates || 0,
        affectedCollectionIds: check.affected_collection_ids || [],
        remediation: getCheckRemediation('DUPLICATE_ITEMS'),
      });
    }

    // ========================================================================
    // Check 7: Ownership mismatches
    // ========================================================================
    const { data: ownershipMismatch } = await supabase.rpc(
      'validate_ownership_mismatch'
    );

    if (ownershipMismatch && ownershipMismatch.length > 0) {
      const check = ownershipMismatch[0];
      checks.push({
        issueType: 'OWNERSHIP_MISMATCH' as ValidationCheckType,
        issueCount: check.issue_count || 0,
        severity: getCheckSeverity('OWNERSHIP_MISMATCH'),
        title: getCheckTitle('OWNERSHIP_MISMATCH'),
        description: getCheckDescription('OWNERSHIP_MISMATCH'),
        affectedItemIds: check.affected_item_ids || [],
        remediation: getCheckRemediation('OWNERSHIP_MISMATCH'),
      });
    }

    // ========================================================================
    // Check 8: Progress without share records
    // ========================================================================
    const { data: progressNoShare } = await supabase.rpc(
      'validate_progress_without_shares'
    );

    if (progressNoShare && progressNoShare.length > 0) {
      const check = progressNoShare[0];
      checks.push({
        issueType: 'PROGRESS_NO_SHARE' as ValidationCheckType,
        issueCount: check.issue_count || 0,
        severity: getCheckSeverity('PROGRESS_NO_SHARE'),
        title: getCheckTitle('PROGRESS_NO_SHARE'),
        description: getCheckDescription('PROGRESS_NO_SHARE'),
        affectedProgressIds: check.affected_progress_ids || [],
        remediation: getCheckRemediation('PROGRESS_NO_SHARE'),
      });
    }

    // ========================================================================
    // Check 9: Invalid coach references
    // ========================================================================
    const { data: invalidCoach } = await supabase.rpc(
      'validate_invalid_coach_references'
    );

    if (invalidCoach && invalidCoach.length > 0) {
      const check = invalidCoach[0];
      checks.push({
        issueType: 'INVALID_COACH' as ValidationCheckType,
        issueCount: check.issue_count || 0,
        severity: getCheckSeverity('INVALID_COACH'),
        title: getCheckTitle('INVALID_COACH'),
        description: getCheckDescription('INVALID_COACH'),
        affectedCollectionIds: check.affected_collection_ids || [],
        remediation: getCheckRemediation('INVALID_COACH'),
      });
    }

    // ========================================================================
    // Check 10: Invalid client references
    // ========================================================================
    const { data: invalidClient } = await supabase.rpc(
      'validate_invalid_client_references'
    );

    if (invalidClient && invalidClient.length > 0) {
      const check = invalidClient[0];
      checks.push({
        issueType: 'INVALID_CLIENT' as ValidationCheckType,
        issueCount: check.issue_count || 0,
        severity: getCheckSeverity('INVALID_CLIENT'),
        title: getCheckTitle('INVALID_CLIENT'),
        description: getCheckDescription('INVALID_CLIENT'),
        affectedProgressIds: check.affected_progress_ids || [],
        remediation: getCheckRemediation('INVALID_CLIENT'),
      });
    }

    // ========================================================================
    // Get table statistics
    // ========================================================================
    const { data: stats } = await supabase.rpc('get_resource_library_statistics');

    const statistics: TableStatistics[] = (stats || []).map((stat: any) => ({
      tableName: stat.table_name,
      totalRecords: stat.total_records || 0,
      createdLast7Days: stat.created_last_7_days || 0,
      createdLast30Days: stat.created_last_30_days || 0,
    }));

    // ========================================================================
    // Get affected coaches
    // ========================================================================
    const { data: coaches } = await supabase.rpc('get_affected_coaches');

    const affectedCoaches: AffectedCoach[] = (coaches || []).map((coach: any) => ({
      coachId: coach.coach_id,
      email: coach.email,
      firstName: coach.first_name,
      lastName: coach.last_name,
      affectedCollectionCount: coach.affected_collection_count || 0,
    }));

    // ========================================================================
    // Build report
    // ========================================================================
    const totalIssues = checks.reduce((sum, check) => sum + check.issueCount, 0);
    const criticalIssues = checks
      .filter(c => c.severity === 'critical')
      .reduce((sum, check) => sum + check.issueCount, 0);
    const warningIssues = checks
      .filter(c => c.severity === 'warning')
      .reduce((sum, check) => sum + check.issueCount, 0);
    const infoIssues = checks
      .filter(c => c.severity === 'info')
      .reduce((sum, check) => sum + check.issueCount, 0);

    const report: ResourceValidationReport = {
      timestamp: new Date().toISOString(),
      checks,
      statistics,
      affectedCoaches,
      totalIssues,
      criticalIssues,
      warningIssues,
      infoIssues,
      hasIssues: totalIssues > 0,
    };

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: report,
      meta: {
        duration_ms: duration,
        checks_run: 10,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to validate resource library:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate resource library',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
