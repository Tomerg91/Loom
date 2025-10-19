/**
 * Resource Library Data Validation Types
 *
 * Types for the resource library validation system that identifies
 * data inconsistencies and orphaned records.
 */

export type ValidationCheckType =
  | 'ORPHANED_ITEMS'
  | 'NON_LIBRARY_ITEMS'
  | 'ORPHANED_PROGRESS'
  | 'NON_LIBRARY_PROGRESS'
  | 'EMPTY_COLLECTIONS'
  | 'DUPLICATE_ITEMS'
  | 'OWNERSHIP_MISMATCH'
  | 'PROGRESS_NO_SHARE'
  | 'INVALID_COACH'
  | 'INVALID_CLIENT';

export interface ValidationCheck {
  issueType: ValidationCheckType;
  issueCount: number;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  affectedIds?: string[];
  affectedCollectionIds?: string[];
  affectedFileIds?: string[];
  affectedProgressIds?: string[];
  affectedItemIds?: string[];
  totalDuplicates?: number;
  remediation: string[];
}

export interface TableStatistics {
  tableName: string;
  totalRecords: number;
  createdLast7Days: number;
  createdLast30Days: number;
}

export interface AffectedCoach {
  coachId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  affectedCollectionCount: number;
}

export interface ResourceValidationReport {
  timestamp: string;
  checks: ValidationCheck[];
  statistics: TableStatistics[];
  affectedCoaches: AffectedCoach[];
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
  hasIssues: boolean;
}

/**
 * Get severity level for a validation check type
 */
export function getCheckSeverity(checkType: ValidationCheckType): 'critical' | 'warning' | 'info' {
  switch (checkType) {
    case 'ORPHANED_ITEMS':
    case 'ORPHANED_PROGRESS':
    case 'INVALID_COACH':
    case 'INVALID_CLIENT':
      return 'critical';

    case 'NON_LIBRARY_ITEMS':
    case 'NON_LIBRARY_PROGRESS':
    case 'OWNERSHIP_MISMATCH':
    case 'PROGRESS_NO_SHARE':
      return 'warning';

    case 'EMPTY_COLLECTIONS':
    case 'DUPLICATE_ITEMS':
      return 'info';

    default:
      return 'info';
  }
}

/**
 * Get human-readable title for a validation check
 */
export function getCheckTitle(checkType: ValidationCheckType): string {
  switch (checkType) {
    case 'ORPHANED_ITEMS':
      return 'Orphaned Collection Items';
    case 'NON_LIBRARY_ITEMS':
      return 'Non-Library Resources in Collections';
    case 'ORPHANED_PROGRESS':
      return 'Orphaned Progress Records';
    case 'NON_LIBRARY_PROGRESS':
      return 'Progress for Non-Library Resources';
    case 'EMPTY_COLLECTIONS':
      return 'Empty Collections (>7 days old)';
    case 'DUPLICATE_ITEMS':
      return 'Duplicate Collection Items';
    case 'OWNERSHIP_MISMATCH':
      return 'Ownership Mismatch';
    case 'PROGRESS_NO_SHARE':
      return 'Progress Without Share Records';
    case 'INVALID_COACH':
      return 'Invalid Coach References';
    case 'INVALID_CLIENT':
      return 'Invalid Client References';
    default:
      return checkType;
  }
}

/**
 * Get description for a validation check
 */
export function getCheckDescription(checkType: ValidationCheckType): string {
  switch (checkType) {
    case 'ORPHANED_ITEMS':
      return 'Collection items referencing files that no longer exist in the database.';
    case 'NON_LIBRARY_ITEMS':
      return 'Collection items pointing to files that are not marked as library resources.';
    case 'ORPHANED_PROGRESS':
      return 'Progress records for files that no longer exist in the database.';
    case 'NON_LIBRARY_PROGRESS':
      return 'Progress records for files that are not marked as library resources.';
    case 'EMPTY_COLLECTIONS':
      return 'Collections created more than 7 days ago that contain no items.';
    case 'DUPLICATE_ITEMS':
      return 'Same file appears multiple times in the same collection.';
    case 'OWNERSHIP_MISMATCH':
      return 'Collection items where the file owner does not match the collection owner.';
    case 'PROGRESS_NO_SHARE':
      return 'Client has progress records for files that were never shared with them.';
    case 'INVALID_COACH':
      return 'Collections referencing users that do not exist or are not coaches.';
    case 'INVALID_CLIENT':
      return 'Progress records referencing users that do not exist or are not clients.';
    default:
      return '';
  }
}

/**
 * Get remediation steps for a validation check
 */
export function getCheckRemediation(checkType: ValidationCheckType): string[] {
  switch (checkType) {
    case 'ORPHANED_ITEMS':
      return [
        'Delete orphaned collection items from the database',
        'Notify affected coaches about missing resources',
        'Check if files were accidentally deleted',
      ];
    case 'NON_LIBRARY_ITEMS':
      return [
        'Update files to set is_library_resource = true, or',
        'Remove items from collections if they should not be library resources',
      ];
    case 'ORPHANED_PROGRESS':
      return [
        'Delete orphaned progress records from the database',
        'Check if files were accidentally deleted',
      ];
    case 'NON_LIBRARY_PROGRESS':
      return [
        'Update files to set is_library_resource = true, or',
        'Delete progress records if files are not library resources',
      ];
    case 'EMPTY_COLLECTIONS':
      return [
        'Delete empty collections that are no longer needed',
        'Notify coaches to add items to their collections',
      ];
    case 'DUPLICATE_ITEMS':
      return [
        'Keep the first occurrence and delete duplicates',
        'Verify with coach before deletion',
      ];
    case 'OWNERSHIP_MISMATCH':
      return [
        'Remove items from collection (ownership violation), or',
        'Create a copy of the file for the collection owner',
      ];
    case 'PROGRESS_NO_SHARE':
      return [
        'Create missing share records, or',
        'Delete progress records for unshared files',
      ];
    case 'INVALID_COACH':
      return [
        'Delete collections with invalid coach references',
        'Reassign collections to valid coaches if possible',
      ];
    case 'INVALID_CLIENT':
      return [
        'Delete progress records with invalid client references',
      ];
    default:
      return [];
  }
}
