/**
 * Resource Library Components
 *
 * Barrel export for all resource library components.
 * This file provides a centralized import point for resource-related UI components,
 * making imports cleaner and more maintainable throughout the application.
 *
 * @module components/resources
 *
 * @example
 * ```tsx
 * // Import multiple components at once
 * import {
 *   ResourceCard,
 *   ResourceGrid,
 *   ResourceFilters,
 *   ResourceUploadDialog
 * } from '@/components/resources';
 *
 * // Import types
 * import type { ResourceCardProps } from '@/components/resources';
 * ```
 */

// ============================================================================
// Core Resource Components
// ============================================================================

/**
 * ResourceCard - Display individual resources in card format
 * Supports both grid and list layouts with actions
 */
export { ResourceCard } from './resource-card';
export type { ResourceCardProps } from './resource-card';

/**
 * ResourceGrid - Container for displaying multiple resources
 * Includes layout toggle, loading states, and empty state handling
 */
export { ResourceGrid } from './resource-grid';
export type { ResourceGridProps } from './resource-grid';

/**
 * ResourceFilters - Filtering UI for resources
 * Search, category, tags, and sort options
 */
export { ResourceFilters } from './resource-filters';
export type { ResourceFiltersProps } from './resource-filters';

/**
 * ResourceEmptyState - Display when no resources are found
 * Context-aware messaging and actions
 */
export { ResourceEmptyState } from './resource-empty-state';
export type { ResourceEmptyStateProps } from './resource-empty-state';

// ============================================================================
// Dialog Components
// ============================================================================

/**
 * ResourceUploadDialog - Modal for uploading resources
 * Drag & drop, validation, metadata form
 */
export { ResourceUploadDialog } from './resource-upload-dialog';
export type { ResourceUploadDialogProps } from './resource-upload-dialog';

/**
 * ResourceShareDialog - Modal for sharing resources
 * Bulk share, permissions, expiration
 */
export { ResourceShareDialog } from './resource-share-dialog';
export type { ResourceShareDialogProps } from './resource-share-dialog';

// ============================================================================
// Collection Components
// ============================================================================

/**
 * CollectionCard - Display resource collections
 * Shows collection metadata and resource count
 */
export { CollectionCard } from './collection-card';
export type { CollectionCardProps } from './collection-card';

/**
 * CollectionDialog - Create/edit collection modal
 * Name, description, icon, initial resources
 */
export { CollectionDialog } from './collection-dialog';
export type { CollectionDialogProps } from './collection-dialog';

// ============================================================================
// Analytics Components
// ============================================================================

/**
 * AnalyticsOverview - High-level library metrics
 * Total resources, views, downloads, completions
 */
export { AnalyticsOverview } from './analytics-overview';
export type { AnalyticsOverviewProps } from './analytics-overview';

/**
 * TopResourcesList - Display top performing resources
 * Sortable list with engagement metrics
 */
export { TopResourcesList } from './top-resources-list';
export type { TopResourcesListProps } from './top-resources-list';

/**
 * AutoShareSettings - Configure auto-share for new clients
 * Default permissions and collection selection
 */
export { AutoShareSettings } from './auto-share-settings';
export type { AutoShareSettingsProps } from './auto-share-settings';

// ============================================================================
// Error Handling
// ============================================================================

/**
 * ResourceErrorBoundary - Error boundary for resource components
 * Catches React errors and displays user-friendly messages
 */
export { ResourceErrorBoundary } from './resource-error-boundary';
