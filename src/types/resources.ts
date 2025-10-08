/**
 * Resource Library Type Definitions
 *
 * This file contains all TypeScript interfaces and types for the Resource Library feature.
 * It provides type safety for resource management, collections, settings, and analytics.
 *
 * Key Types:
 * - ResourceLibraryItem: Main resource entity with metadata and analytics
 * - ResourceCategory: Enum for resource categorization
 * - ResourceCollection: Named groups of resources
 * - ResourceLibrarySettings: Per-coach configuration
 * - ResourceAnalytics: Usage and engagement metrics
 * - ResourceClientProgress: Client-specific progress tracking
 *
 * @module types/resources
 */

// ============================================================================
// Resource Categories
// ============================================================================

/**
 * Categories for organizing library resources
 * These align with common coaching use cases
 */
export type ResourceCategory =
  | 'onboarding'    // New client orientation materials
  | 'worksheets'    // Fillable worksheets and exercises
  | 'assessments'   // Self-assessment tools
  | 'videos'        // Video content
  | 'articles'      // Articles and reading materials
  | 'templates'     // Document templates
  | 'other';        // Uncategorized

/**
 * Human-readable labels for resource categories
 */
export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  onboarding: 'Onboarding',
  worksheets: 'Worksheets',
  assessments: 'Assessments',
  videos: 'Videos',
  articles: 'Articles',
  templates: 'Templates',
  other: 'Other',
};

/**
 * Icons for resource categories (Lucide React icon names)
 */
export const RESOURCE_CATEGORY_ICONS: Record<ResourceCategory, string> = {
  onboarding: 'UserPlus',
  worksheets: 'FileText',
  assessments: 'ClipboardList',
  videos: 'Video',
  articles: 'BookOpen',
  templates: 'FileCode',
  other: 'File',
};

// ============================================================================
// Main Resource Entity
// ============================================================================

/**
 * Complete resource library item with all metadata and relationships
 * Extends the base file_uploads table with library-specific fields
 */
export interface ResourceLibraryItem {
  // Core identifiers
  id: string;
  userId: string; // Coach who owns the resource

  // File metadata (from file_uploads table)
  filename: string;
  originalFilename: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  bucketName: string;

  // Library-specific flags
  isLibraryResource: boolean;
  isPublic: boolean; // Future: public marketplace
  sharedWithAllClients: boolean;

  // Organization
  category: ResourceCategory;
  tags: string[];
  description: string | null;

  // Analytics metrics
  viewCount: number;
  downloadCount: number;
  completionCount: number;
  shareCount?: number; // Computed from file_shares

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Optional joined data (populated by queries)
  ownerName?: string;
  sharedWith?: ResourceShare[];
  collections?: ResourceCollectionSummary[];
  storageUrl?: string;
}

/**
 * Lightweight resource summary for lists and cards
 * Omits heavy fields like sharedWith array
 */
export interface ResourceSummary {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  category: ResourceCategory;
  tags: string[];
  description: string | null;
  viewCount: number;
  downloadCount: number;
  completionCount: number;
  isShared: boolean;
  createdAt: string;
}

// ============================================================================
// Resource Sharing
// ============================================================================

/**
 * Resource share information (from file_shares table)
 */
export interface ResourceShare {
  id: string;
  fileId: string;
  sharedBy: string;
  sharedWith: string;
  permissionType: 'view' | 'download' | 'edit';
  expiresAt: string | null;
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;

  // Optional joined data
  sharedWithUser?: {
    id: string;
    name: string;
    email?: string;
  };
}

/**
 * Bulk share request parameters
 */
export interface BulkShareRequest {
  fileIds: string[];
  sharedWith: string[]; // Array of user IDs
  permissionType: 'view' | 'download' | 'edit';
  expiresAt?: string;
  message?: string;
  notifyUsers?: boolean;
}

/**
 * Bulk share response
 */
export interface BulkShareResponse {
  success: boolean;
  summary: {
    filesProcessed: number;
    usersSharedWith: number;
    sharesCreated: number;
    sharesUpdated: number;
  };
  shares: ResourceShare[];
}

// ============================================================================
// Resource Collections
// ============================================================================

/**
 * Collection of related resources (e.g., "Welcome Kit", "Module 1")
 */
export interface ResourceCollection {
  id: string;
  coachId: string;
  name: string;
  description: string | null;
  icon: string | null; // Emoji or icon name
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;

  // Optional joined data
  resources?: ResourceLibraryItem[];
  itemCount?: number;
}

/**
 * Lightweight collection summary for dropdowns and references
 */
export interface ResourceCollectionSummary {
  id: string;
  name: string;
  icon: string | null;
  itemCount: number;
}

/**
 * Item within a collection (many-to-many relationship)
 */
export interface ResourceCollectionItem {
  id: string;
  collectionId: string;
  fileId: string;
  sortOrder: number;
  createdAt: string;
}

/**
 * Request to create a new collection
 */
export interface CreateCollectionRequest {
  name: string;
  description?: string;
  icon?: string;
  resourceIds?: string[]; // Initial resources to add
}

/**
 * Request to update a collection
 */
export interface UpdateCollectionRequest {
  name?: string;
  description?: string;
  icon?: string;
  resourceOrder?: string[]; // Reorder items by file ID
}

// ============================================================================
// Resource Library Settings
// ============================================================================

/**
 * Per-coach resource library configuration
 */
export interface ResourceLibrarySettings {
  coachId: string;
  defaultPermission: 'view' | 'download';
  autoShareNewClients: boolean;
  storageLimitMb: number;
  allowClientRequests: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request to update library settings
 */
export interface UpdateLibrarySettingsRequest {
  defaultPermission?: 'view' | 'download';
  autoShareNewClients?: boolean;
  allowClientRequests?: boolean;
}

// ============================================================================
// Client Progress Tracking
// ============================================================================

/**
 * Client's progress on a specific resource
 */
export interface ResourceClientProgress {
  id: string;
  fileId: string;
  clientId: string;
  viewedAt: string | null;
  completedAt: string | null;
  lastAccessedAt: string | null;
  accessCount: number;
  createdAt: string;
}

/**
 * Progress action types
 */
export type ProgressAction = 'viewed' | 'completed' | 'accessed';

/**
 * Request to track progress
 */
export interface TrackProgressRequest {
  action: ProgressAction;
}

// ============================================================================
// Resource Analytics
// ============================================================================

/**
 * Comprehensive analytics for a resource
 */
export interface ResourceAnalytics {
  resourceId: string;
  resourceName: string;

  // Aggregate metrics
  totalViews: number;
  totalDownloads: number;
  totalCompletions: number;
  uniqueViewers: number;
  averageEngagementTime: number | null;
  completionRate: number; // Percentage (0-100)

  // Per-client breakdown
  clientBreakdown: ResourceClientEngagement[];

  // Time-series data (optional)
  viewsOverTime?: TimeSeriesDataPoint[];
  downloadsOverTime?: TimeSeriesDataPoint[];
}

/**
 * Individual client's engagement with a resource
 */
export interface ResourceClientEngagement {
  clientId: string;
  clientName: string;
  clientEmail?: string;
  viewCount: number;
  downloadCount: number;
  lastAccessedAt: string | null;
  completed: boolean;
  completedAt: string | null;
}

/**
 * Time-series data point for analytics charts
 */
export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

/**
 * Overall library analytics for a coach
 */
export interface LibraryAnalytics {
  totalResources: number;
  totalViews: number;
  totalDownloads: number;
  totalCompletions: number;
  avgCompletionRate: number;
  activeClients: number;

  // Top performing resources
  topResources: ResourcePerformanceSummary[];

  // Category breakdown
  categoryBreakdown: CategoryAnalytics[];
}

/**
 * Performance summary for a single resource
 */
export interface ResourcePerformanceSummary {
  id: string;
  filename: string;
  category: ResourceCategory;
  viewCount: number;
  downloadCount: number;
  completionCount: number;
  completionRate: number;
  shareCount: number;
}

/**
 * Analytics breakdown by category
 */
export interface CategoryAnalytics {
  category: ResourceCategory;
  resourceCount: number;
  totalViews: number;
  totalDownloads: number;
  totalCompletions: number;
  avgCompletionRate: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Query parameters for listing resources
 */
export interface ResourceListParams {
  category?: ResourceCategory;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'filename' | 'file_size' | 'view_count' | 'download_count';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Response for resource list endpoint
 */
export interface ResourceListResponse {
  success: boolean;
  data: {
    resources: ResourceLibraryItem[];
    total: number;
    collections?: ResourceCollection[];
  };
}

/**
 * Request to create/upload a resource
 */
export interface CreateResourceRequest {
  // File data sent as FormData
  file: File;
  category: ResourceCategory;
  tags: string[];
  description?: string;
  addToCollection?: string; // Collection ID
}

/**
 * Request to update resource metadata
 */
export interface UpdateResourceRequest {
  filename?: string;
  description?: string;
  category?: ResourceCategory;
  tags?: string[];
}

/**
 * Request to share resource with all clients
 */
export interface ShareAllClientsRequest {
  permission: 'view' | 'download';
  expiresAt?: string;
  message?: string;
}

/**
 * Response for share-all-clients endpoint
 */
export interface ShareAllClientsResponse {
  success: boolean;
  data: {
    sharedCount: number;
    shares: ResourceShare[];
  };
}

/**
 * Client-facing resource with share metadata
 */
export interface ClientResourceItem extends ResourceLibraryItem {
  sharedBy: {
    id: string;
    name: string;
    role: 'coach' | 'admin';
  };
  permission: 'view' | 'download' | 'edit';
  expiresAt: string | null;
  progress?: {
    viewed: boolean;
    completed: boolean;
    viewedAt: string | null;
    completedAt: string | null;
  };
}

// ============================================================================
// Filter and Sort Options
// ============================================================================

/**
 * Filter state for resource library UI
 */
export interface ResourceFilters {
  category: ResourceCategory | 'all';
  tags: string[];
  search: string;
  sharedStatus?: 'all' | 'shared' | 'not_shared';
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Sort configuration
 */
export interface ResourceSort {
  field: 'created_at' | 'filename' | 'file_size' | 'view_count' | 'download_count' | 'completion_count';
  order: 'asc' | 'desc';
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Storage usage summary
 */
export interface StorageUsage {
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeMb: number;
  limitMb: number;
  percentageUsed: number;
  remainingMb: number;
}

/**
 * Resource upload progress
 */
export interface UploadProgress {
  fileId: string;
  filename: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

/**
 * Validation error for resource operations
 */
export interface ResourceValidationError {
  field: string;
  message: string;
  code: string;
}
