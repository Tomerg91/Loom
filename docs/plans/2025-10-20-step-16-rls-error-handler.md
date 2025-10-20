# Step 16: RLS Error Handler Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Row-Level Security (RLS) policy violations from raw PostgreSQL errors into user-friendly, operation-specific messages while logging all violations to Sentry for admin review.

**Architecture:** Extend existing DatabaseError class in `src/lib/errors/database-errors.ts` with RLS detection logic, operation message mapping, and Sentry integration. Update all ResourceLibraryService mutation methods to use automatic error wrapping.

**Tech Stack:** TypeScript, Supabase PostgreSQL, Sentry (@sentry/nextjs), existing Result pattern

---

## Prerequisites

- Design document: `docs/plans/2025-10-20-rls-error-handler-design.md`
- Existing error system: `src/lib/errors/database-errors.ts`
- Target service: `src/lib/services/resource-library-service.ts`
- Sentry already configured in the project

---

## Task 1: Add RLS Error Codes

**Files:**

- Modify: `src/lib/errors/database-errors.ts:27-104`

**Step 1: Add new RLS error codes to DB_ERROR_CODES**

Locate the `DB_ERROR_CODES` object (around line 27) and add these codes in the Business Logic section (9xxx):

```typescript
// Business Logic (9xxx)
BUSINESS_RULE_VIOLATION: 'DB_9001',
INSUFFICIENT_PERMISSIONS: 'DB_9002',
ACCOUNT_SUSPENDED: 'DB_9003',
ACCOUNT_DELETED: 'DB_9004',
SESSION_CANCELLED: 'DB_9005',
SESSION_COMPLETED: 'DB_9006',
PAYMENT_REQUIRED: 'DB_9007',
RLS_VIOLATION: 'DB_9008',
RLS_INSERT_DENIED: 'DB_9009',
RLS_UPDATE_DENIED: 'DB_9010',
RLS_DELETE_DENIED: 'DB_9011',
RLS_SELECT_DENIED: 'DB_9012',
```

**Step 2: Add default user messages for RLS codes**

Locate the `getDefaultUserMessage()` method's messages object (around line 182) and add:

```typescript
[DB_ERROR_CODES.RLS_VIOLATION]: 'You do not have permission to perform this action.',
[DB_ERROR_CODES.RLS_INSERT_DENIED]: 'You do not have permission to create this resource.',
[DB_ERROR_CODES.RLS_UPDATE_DENIED]: 'You do not have permission to modify this resource.',
[DB_ERROR_CODES.RLS_DELETE_DENIED]: 'You do not have permission to delete this resource.',
[DB_ERROR_CODES.RLS_SELECT_DENIED]: 'You do not have permission to access this resource.',
```

**Step 3: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No new errors (baseline ~30 errors should remain)

**Step 4: Commit**

```bash
git add src/lib/errors/database-errors.ts
git commit -m "feat(errors): Add RLS error codes and default messages

- Add DB_9008-DB_9012 for RLS violations
- Add operation-specific default user messages
- Part of Step 16: RLS Error Handler

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Create RLS Operation Message Map

**Files:**

- Modify: `src/lib/errors/database-errors.ts` (add after line 104, before DatabaseErrorDetails interface)

**Step 1: Add RLS operation message map**

Add this constant after the `DB_ERROR_CODES` definition and before `DatabaseErrorDetails`:

```typescript
/**
 * Operation-specific error messages for Resource Library RLS violations
 * Maps operation names to user-friendly permission error messages
 */
const RLS_OPERATION_MESSAGES: Record<string, string> = {
  // Resource operations
  uploadResource: "You don't have permission to upload resources",
  updateResource: "You don't have permission to modify this resource",
  deleteResource: "You don't have permission to delete this resource",

  // Collection operations
  createCollection: "You don't have permission to create collections",
  updateCollection: "You don't have permission to modify this collection",
  deleteCollection: "You don't have permission to delete this collection",
  addToCollection:
    "You don't have permission to add resources to this collection",
  removeFromCollection:
    "You don't have permission to remove resources from this collection",

  // Sharing operations
  shareWithAllClients: "You don't have permission to share this resource",
  getResourceShares: "You don't have permission to view resource shares",

  // Settings
  updateSettings: "You don't have permission to update library settings",
};
```

**Step 2: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/lib/errors/database-errors.ts
git commit -m "feat(errors): Add RLS operation message map

- Map resource library operations to user messages
- Covers resources, collections, sharing, settings
- Part of Step 16: RLS Error Handler

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Implement RLS Detection Function

**Files:**

- Modify: `src/lib/errors/database-errors.ts` (add after RLS_OPERATION_MESSAGES)

**Step 1: Add isRLSViolation helper function**

Add after the `RLS_OPERATION_MESSAGES` constant:

```typescript
/**
 * Detect if a Supabase error is an RLS violation
 *
 * Checks for:
 * - PostgreSQL error code 42501 (insufficient_privilege)
 * - Error messages containing RLS policy violation text
 */
function isRLSViolation(error: any): boolean {
  if (!error) return false;

  const code = error.code || error.error_code || '';
  const message = error.message || '';

  // Check for PostgreSQL insufficient privilege error
  if (code === '42501') return true;

  // Check for RLS-specific error messages
  const rlsPatterns = [
    'row-level security',
    'row level security',
    'violates row-level security policy',
    'new row violates row-level security',
  ];

  return rlsPatterns.some(pattern => message.toLowerCase().includes(pattern));
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/lib/errors/database-errors.ts
git commit -m "feat(errors): Add RLS violation detection function

- Detect PostgreSQL error code 42501
- Detect RLS policy violation in error messages
- Part of Step 16: RLS Error Handler

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Implement Sentry Logging Function

**Files:**

- Modify: `src/lib/errors/database-errors.ts` (add import and function)

**Step 1: Add Sentry import at top of file**

Add after existing imports (around line 1):

```typescript
import * as Sentry from '@sentry/nextjs';
```

**Step 2: Add logRLSViolation function**

Add after the `isRLSViolation` function:

```typescript
/**
 * Log RLS violation to console and Sentry
 *
 * @param error - Supabase error object
 * @param operation - Operation that triggered violation
 * @param resourceType - Type of resource involved
 */
function logRLSViolation(
  error: any,
  operation?: string,
  resourceType?: string
): void {
  const logData = {
    code: 'DB_9008',
    operation: operation || 'unknown',
    resourceType: resourceType || 'unknown',
    timestamp: new Date().toISOString(),
    supabaseError: {
      code: error.code || error.error_code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    },
  };

  // Console log (structured)
  console.error('[RLS_VIOLATION]', logData);

  // Sentry capture
  Sentry.captureException(
    new Error(`RLS Violation: ${operation || 'unknown'}`),
    {
      level: 'warning', // Expected security boundary, not a bug
      tags: {
        errorType: 'rls_violation',
        operation: operation || 'unknown',
        resourceType: resourceType || 'unknown',
      },
      extra: {
        supabaseErrorCode: error.code || error.error_code,
        supabaseMessage: error.message,
        supabaseDetails: error.details,
        supabaseHint: error.hint,
        timestamp: logData.timestamp,
      },
      contexts: {
        rls: {
          operation,
          resourceType,
          errorCode: 'DB_9008',
        },
      },
    }
  );
}
```

**Step 3: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/lib/errors/database-errors.ts
git commit -m "feat(errors): Add Sentry logging for RLS violations

- Log structured data to console
- Capture to Sentry with warning level
- Include full context for admin investigation
- Part of Step 16: RLS Error Handler

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Enhance fromSupabaseError with RLS Detection

**Files:**

- Modify: `src/lib/errors/database-errors.ts:332-361` (fromSupabaseError method)

**Step 1: Update fromSupabaseError to detect and handle RLS violations**

Replace the existing `fromSupabaseError` method (around line 332) with this enhanced version:

```typescript
/**
 * Convert Supabase error to DatabaseError
 */
static fromSupabaseError(error: unknown, operation?: string, resourceType?: string): DatabaseError {
  if (!error) {
    return new DatabaseError({
      code: DB_ERROR_CODES.UNKNOWN_ERROR,
      message: 'Unknown error occurred',
      operation,
      resourceType,
    });
  }

  // Handle Supabase error object
  const supabaseError = error as { code?: string; message?: string; details?: string; hint?: string };

  // Detect and handle RLS violations
  if (isRLSViolation(supabaseError)) {
    logRLSViolation(supabaseError, operation, resourceType);

    // Get operation-specific message or fallback
    const userMessage = operation && RLS_OPERATION_MESSAGES[operation]
      ? RLS_OPERATION_MESSAGES[operation]
      : undefined;

    return new DatabaseError({
      code: DB_ERROR_CODES.RLS_VIOLATION,
      message: `RLS violation: ${operation || 'unknown operation'}`,
      userMessage,
      operation,
      resourceType,
      details: {
        supabaseCode: supabaseError.code,
        supabaseDetails: supabaseError.details,
        supabaseHint: supabaseError.hint,
      },
    });
  }

  // Map Supabase error codes to our error codes (existing logic)
  const code = mapSupabaseErrorCode(supabaseError.code);
  const message = supabaseError.message || 'Database operation failed';
  const details = {
    supabaseCode: supabaseError.code,
    supabaseDetails: supabaseError.details,
    supabaseHint: supabaseError.hint,
  };

  return new DatabaseError({
    code,
    message,
    operation,
    resourceType,
    details,
  });
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/lib/errors/database-errors.ts
git commit -m "feat(errors): Enhance fromSupabaseError with RLS detection

- Detect RLS violations before general error mapping
- Log to Sentry automatically
- Use operation-specific messages when available
- Part of Step 16: RLS Error Handler

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Create wrapDatabaseOperation Helper

**Files:**

- Modify: `src/lib/errors/database-errors.ts` (add static method to DatabaseError class)

**Step 1: Add wrapDatabaseOperation static method**

Add this method to the `DatabaseError` class, after the `fromSupabaseError` method:

```typescript
/**
 * Wrap a database operation with automatic error handling
 *
 * @param operation - Name of the operation (for error messages)
 * @param fn - Async function to execute
 * @returns Result with success data or formatted error
 */
static async wrapDatabaseOperation<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<Result<T>> {
  try {
    const result = await fn();
    return Result.success(result);
  } catch (error) {
    const dbError = DatabaseError.fromSupabaseError(error, operation);
    return Result.error(dbError.toString());
  }
}
```

**Step 2: Add Result import if not present**

Check if `Result` is imported at the top of the file. If not, add:

```typescript
import { Result } from '@/lib/types/result';
```

**Step 3: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/lib/errors/database-errors.ts
git commit -m "feat(errors): Add wrapDatabaseOperation helper

- Automatic error wrapping for database operations
- Generic type support for any return type
- Integrates with Result pattern
- Part of Step 16: RLS Error Handler

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Update uploadResource Method

**Files:**

- Modify: `src/lib/services/resource-library-service.ts:58-112`

**Step 1: Import DatabaseError at top of file**

Add to imports:

```typescript
import { DatabaseError } from '@/lib/errors/database-errors';
```

**Step 2: Update uploadResource to use wrapper**

Replace the existing `uploadResource` method (lines 58-112) with:

```typescript
async uploadResource(
  file: File,
  userId: string,
  metadata: {
    category: string;
    tags: string[];
    description?: string;
    addToCollection?: string;
  }
): Promise<Result<ResourceLibraryItem>> {
  return DatabaseError.wrapDatabaseOperation('uploadResource', async () => {
    // Use existing file upload service
    const fileService = getFileManagementService();
    const uploadResult = await fileService.uploadFile(file, userId, {
      fileCategory: metadata.category as any,
      tags: metadata.tags,
      description: metadata.description,
    });

    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'File upload failed');
    }

    const fileId = uploadResult.data.id;

    // Mark as library resource
    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from('file_uploads')
      .update({ is_library_resource: true })
      .eq('id', fileId);

    if (updateError) {
      throw DatabaseError.fromSupabaseError(updateError, 'uploadResource', 'file_uploads');
    }

    // Add to collection if specified
    if (metadata.addToCollection) {
      await db.addResourcesToCollection(metadata.addToCollection, [fileId]);
    }

    // Get the updated resource
    const resource = await db.getResourceById(fileId, userId);
    if (!resource) {
      throw new Error('Resource created but not found');
    }

    return resource;
  });
}
```

**Step 3: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/lib/services/resource-library-service.ts
git commit -m "refactor(resources): Update uploadResource to use RLS error wrapper

- Replace try-catch with wrapDatabaseOperation
- Throw DatabaseError for Supabase errors
- Automatic RLS detection and user-friendly messages
- Part of Step 16: RLS Error Handler

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Update updateResource Method

**Files:**

- Modify: `src/lib/services/resource-library-service.ts:175-235`

**Step 1: Update updateResource to use wrapper**

Replace the existing `updateResource` method with:

```typescript
async updateResource(
  resourceId: string,
  userId: string,
  updates: UpdateResourceRequest
): Promise<Result<ResourceLibraryItem>> {
  return DatabaseError.wrapDatabaseOperation('updateResource', async () => {
    const supabase = await createClient();

    // Verify ownership
    const resource = await db.getResourceById(resourceId, userId);
    if (!resource) {
      throw DatabaseError.notFound('Resource', resourceId);
    }

    if (resource.userId !== userId) {
      throw DatabaseError.forbidden('resource', 'update');
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.filename) {
      updateData.filename = updates.filename;
    }

    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }

    if (updates.category) {
      updateData.file_category = normalizeResourceCategory(updates.category);
    }

    if (updates.tags) {
      updateData.tags = updates.tags;
    }

    const { error } = await supabase
      .from('file_uploads')
      .update(updateData)
      .eq('id', resourceId);

    if (error) {
      throw DatabaseError.fromSupabaseError(error, 'updateResource', 'file_uploads');
    }

    const updatedResource = await db.getResourceById(resourceId, userId);
    if (!updatedResource) {
      throw new Error('Resource updated but not found');
    }

    return updatedResource;
  });
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/lib/services/resource-library-service.ts
git commit -m "refactor(resources): Update updateResource to use RLS error wrapper

- Replace try-catch with wrapDatabaseOperation
- Use DatabaseError for ownership checks
- Part of Step 16: RLS Error Handler

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Update deleteResource Method

**Files:**

- Modify: `src/lib/services/resource-library-service.ts:244-274`

**Step 1: Update deleteResource to use wrapper**

Replace the existing `deleteResource` method with:

```typescript
async deleteResource(
  resourceId: string,
  userId: string
): Promise<Result<void>> {
  return DatabaseError.wrapDatabaseOperation('deleteResource', async () => {
    // Verify ownership
    const resource = await db.getResourceById(resourceId, userId);
    if (!resource) {
      throw DatabaseError.notFound('Resource', resourceId);
    }

    if (resource.userId !== userId) {
      throw DatabaseError.forbidden('resource', 'delete');
    }

    // Use file management service to delete (handles storage cleanup)
    const fileService = getFileManagementService();
    const deleteResult = await fileService.deleteFile(resourceId, userId);

    if (!deleteResult.success) {
      throw new Error(deleteResult.error || 'Failed to delete resource');
    }

    return undefined;
  });
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/lib/services/resource-library-service.ts
git commit -m "refactor(resources): Update deleteResource to use RLS error wrapper

- Replace try-catch with wrapDatabaseOperation
- Use DatabaseError for ownership validation
- Part of Step 16: RLS Error Handler

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Update Collection Methods (createCollection, updateCollection, deleteCollection)

**Files:**

- Modify: `src/lib/services/resource-library-service.ts:427-571`

**Step 1: Update createCollection**

Replace the existing `createCollection` method (lines 427-451) with:

```typescript
async createCollection(
  coachId: string,
  request: CreateCollectionRequest
): Promise<Result<ResourceCollection>> {
  return DatabaseError.wrapDatabaseOperation('createCollection', async () => {
    const collection = await db.createCollection(
      coachId,
      request.name,
      request.description,
      request.icon
    );

    // Add initial resources if provided
    if (request.resourceIds && request.resourceIds.length > 0) {
      await db.addResourcesToCollection(collection.id, request.resourceIds);
    }

    return collection;
  });
}
```

**Step 2: Update updateCollection**

Replace the existing `updateCollection` method (lines 461-533) with:

```typescript
async updateCollection(
  collectionId: string,
  coachId: string,
  request: UpdateCollectionRequest
): Promise<Result<ResourceCollection>> {
  return DatabaseError.wrapDatabaseOperation('updateCollection', async () => {
    const supabase = await createClient();

    // Verify ownership
    const collection = await db.getCollectionWithResources(collectionId, coachId);
    if (!collection) {
      throw DatabaseError.notFound('Collection', collectionId);
    }

    // Build update object
    const updateData: any = {};

    if (request.name) {
      updateData.name = request.name;
    }

    if (request.description !== undefined) {
      updateData.description = request.description;
    }

    if (request.icon !== undefined) {
      updateData.icon = request.icon;
    }

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('resource_collections')
        .update(updateData)
        .eq('id', collectionId);

      if (error) {
        throw DatabaseError.fromSupabaseError(error, 'updateCollection', 'resource_collections');
      }
    }

    // Handle resource reordering if provided
    if (request.resourceOrder && request.resourceOrder.length > 0) {
      const updates = request.resourceOrder.map((fileId, index) => ({
        collection_id: collectionId,
        file_id: fileId,
        sort_order: index,
      }));

      const { error } = await supabase
        .from('resource_collection_items')
        .upsert(updates, {
          onConflict: 'collection_id,file_id',
        });

      if (error) {
        throw DatabaseError.fromSupabaseError(error, 'updateCollection', 'resource_collection_items');
      }
    }

    const updatedCollection = await db.getCollectionWithResources(collectionId, coachId);
    if (!updatedCollection) {
      throw new Error('Collection updated but not found');
    }

    return updatedCollection;
  });
}
```

**Step 3: Update deleteCollection**

Replace the existing `deleteCollection` method (lines 542-571) with:

```typescript
async deleteCollection(
  collectionId: string,
  coachId: string
): Promise<Result<void>> {
  return DatabaseError.wrapDatabaseOperation('deleteCollection', async () => {
    const supabase = await createClient();

    // Verify ownership
    const collection = await db.getCollectionWithResources(collectionId, coachId);
    if (!collection) {
      throw DatabaseError.notFound('Collection', collectionId);
    }

    const { error } = await supabase
      .from('resource_collections')
      .delete()
      .eq('id', collectionId);

    if (error) {
      throw DatabaseError.fromSupabaseError(error, 'deleteCollection', 'resource_collections');
    }

    return undefined;
  });
}
```

**Step 4: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No new errors

**Step 5: Commit**

```bash
git add src/lib/services/resource-library-service.ts
git commit -m "refactor(collections): Update collection methods to use RLS error wrapper

- Update createCollection, updateCollection, deleteCollection
- Replace try-catch with wrapDatabaseOperation
- Part of Step 16: RLS Error Handler

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 11: Update Collection Item Methods (addToCollection, removeFromCollection)

**Files:**

- Modify: `src/lib/services/resource-library-service.ts:581-643`

**Step 1: Update addToCollection**

Replace the existing `addToCollection` method with:

```typescript
async addToCollection(
  collectionId: string,
  coachId: string,
  resourceIds: string[]
): Promise<Result<void>> {
  return DatabaseError.wrapDatabaseOperation('addToCollection', async () => {
    // Verify ownership
    const collection = await db.getCollectionWithResources(collectionId, coachId);
    if (!collection) {
      throw DatabaseError.notFound('Collection', collectionId);
    }

    await db.addResourcesToCollection(collectionId, resourceIds);

    return undefined;
  });
}
```

**Step 2: Update removeFromCollection**

Replace the existing `removeFromCollection` method with:

```typescript
async removeFromCollection(
  collectionId: string,
  coachId: string,
  resourceId: string
): Promise<Result<void>> {
  return DatabaseError.wrapDatabaseOperation('removeFromCollection', async () => {
    const supabase = await createClient();

    // Verify ownership
    const collection = await db.getCollectionWithResources(collectionId, coachId);
    if (!collection) {
      throw DatabaseError.notFound('Collection', collectionId);
    }

    const { error } = await supabase
      .from('resource_collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('file_id', resourceId);

    if (error) {
      throw DatabaseError.fromSupabaseError(error, 'removeFromCollection', 'resource_collection_items');
    }

    return undefined;
  });
}
```

**Step 3: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/lib/services/resource-library-service.ts
git commit -m "refactor(collections): Update collection item methods to use RLS error wrapper

- Update addToCollection, removeFromCollection
- Replace try-catch with wrapDatabaseOperation
- Part of Step 16: RLS Error Handler

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 12: Update shareWithAllClients Method

**Files:**

- Modify: `src/lib/services/resource-library-service.ts:288-331`

**Step 1: Update shareWithAllClients**

Replace the existing `shareWithAllClients` method with:

```typescript
async shareWithAllClients(
  resourceId: string,
  coachId: string,
  request: ShareAllClientsRequest
): Promise<Result<BulkShareResponse>> {
  return DatabaseError.wrapDatabaseOperation('shareWithAllClients', async () => {
    // Verify ownership
    const resource = await db.getResourceById(resourceId, coachId);
    if (!resource) {
      throw DatabaseError.notFound('Resource', resourceId);
    }

    if (resource.userId !== coachId) {
      throw DatabaseError.forbidden('resource', 'share');
    }

    const expiresAt = request.expiresAt ? new Date(request.expiresAt) : undefined;

    const shares = await db.shareResourceWithAllClients(
      resourceId,
      coachId,
      request.permission,
      expiresAt
    );

    // TODO: Send notifications if message provided

    return {
      success: true,
      summary: {
        filesProcessed: 1,
        usersSharedWith: shares.length,
        sharesCreated: shares.length,
        sharesUpdated: 0, // TODO: Track upserts
      },
      shares,
    };
  });
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/lib/services/resource-library-service.ts
git commit -m "refactor(sharing): Update shareWithAllClients to use RLS error wrapper

- Replace try-catch with wrapDatabaseOperation
- Use DatabaseError for ownership validation
- Part of Step 16: RLS Error Handler

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 13: Update updateSettings Method

**Files:**

- Modify: `src/lib/services/resource-library-service.ts:729-768`

**Step 1: Update updateSettings**

Replace the existing `updateSettings` method with:

```typescript
async updateSettings(
  coachId: string,
  updates: Partial<ResourceLibrarySettings>
): Promise<Result<ResourceLibrarySettings>> {
  return DatabaseError.wrapDatabaseOperation('updateSettings', async () => {
    const supabase = await createClient();

    const updateData: any = {};

    if (updates.defaultPermission) {
      updateData.default_permission = updates.defaultPermission;
    }

    if (updates.autoShareNewClients !== undefined) {
      updateData.auto_share_new_clients = updates.autoShareNewClients;
    }

    if (updates.allowClientRequests !== undefined) {
      updateData.allow_client_requests = updates.allowClientRequests;
    }

    const { error } = await supabase
      .from('resource_library_settings')
      .update(updateData)
      .eq('coach_id', coachId);

    if (error) {
      throw DatabaseError.fromSupabaseError(error, 'updateSettings', 'resource_library_settings');
    }

    const settings = await db.getOrCreateLibrarySettings(coachId);

    return settings;
  });
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/lib/services/resource-library-service.ts
git commit -m "refactor(settings): Update updateSettings to use RLS error wrapper

- Replace try-catch with wrapDatabaseOperation
- Use DatabaseError for Supabase errors
- Part of Step 16: RLS Error Handler

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 14: Write Unit Tests for RLS Detection

**Files:**

- Create: `src/lib/errors/__tests__/database-errors-rls.test.ts`

**Step 1: Create test file with RLS detection tests**

Create the test file:

```typescript
/**
 * Unit tests for RLS error detection and handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseError, DB_ERROR_CODES } from '../database-errors';
import * as Sentry from '@sentry/nextjs';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

describe('DatabaseError RLS handling', () => {
  beforeEach(() => {
    // Clear mocks
    vi.clearAllMocks();
    // Mock console.error to avoid noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('RLS violation detection', () => {
    it('detects RLS violation from error code 42501', () => {
      const error = {
        code: '42501',
        message: 'permission denied for table file_uploads',
      };
      const result = DatabaseError.fromSupabaseError(error, 'uploadResource');

      expect(result.code).toBe(DB_ERROR_CODES.RLS_VIOLATION);
      expect(result.userMessage).toBe(
        "You don't have permission to upload resources"
      );
    });

    it('detects RLS violation from message pattern', () => {
      const error = {
        code: '23000',
        message: 'new row violates row-level security policy',
      };
      const result = DatabaseError.fromSupabaseError(error, 'addToCollection');

      expect(result.code).toBe(DB_ERROR_CODES.RLS_VIOLATION);
      expect(result.userMessage).toBe(
        "You don't have permission to add resources to this collection"
      );
    });

    it('uses operation-specific message when available', () => {
      const error = { code: '42501', message: 'permission denied' };
      const result = DatabaseError.fromSupabaseError(error, 'deleteResource');

      expect(result.userMessage).toBe(
        "You don't have permission to delete this resource"
      );
    });

    it('uses default message when operation not in map', () => {
      const error = { code: '42501', message: 'permission denied' };
      const result = DatabaseError.fromSupabaseError(error, 'unknownOperation');

      expect(result.userMessage).toBe(
        'You do not have permission to perform this action.'
      );
    });

    it('does not detect RLS violation for other error codes', () => {
      const error = { code: '23505', message: 'unique constraint violation' };
      const result = DatabaseError.fromSupabaseError(error, 'createResource');

      expect(result.code).toBe(DB_ERROR_CODES.UNIQUE_VIOLATION);
      expect(result.code).not.toBe(DB_ERROR_CODES.RLS_VIOLATION);
    });
  });

  describe('Sentry logging', () => {
    it('logs to Sentry when RLS violation detected', () => {
      const error = { code: '42501', message: 'permission denied' };
      DatabaseError.fromSupabaseError(error, 'uploadResource', 'file_uploads');

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          level: 'warning',
          tags: expect.objectContaining({
            errorType: 'rls_violation',
            operation: 'uploadResource',
            resourceType: 'file_uploads',
          }),
        })
      );
    });

    it('logs to console when RLS violation detected', () => {
      const error = { code: '42501', message: 'permission denied' };
      DatabaseError.fromSupabaseError(error, 'addToCollection');

      expect(console.error).toHaveBeenCalledWith(
        '[RLS_VIOLATION]',
        expect.objectContaining({
          code: 'DB_9008',
          operation: 'addToCollection',
        })
      );
    });

    it('does not log to Sentry for non-RLS errors', () => {
      const error = { code: '23505', message: 'unique constraint' };
      DatabaseError.fromSupabaseError(error, 'createResource');

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });

  describe('Error details', () => {
    it('includes Supabase error details in DatabaseError', () => {
      const error = {
        code: '42501',
        message: 'permission denied',
        details: 'Policy violation on table file_uploads',
        hint: 'Check RLS policies',
      };
      const result = DatabaseError.fromSupabaseError(error, 'uploadResource');

      expect(result.details).toMatchObject({
        supabaseCode: '42501',
        supabaseDetails: 'Policy violation on table file_uploads',
        supabaseHint: 'Check RLS policies',
      });
    });

    it('includes operation and resourceType in error', () => {
      const error = { code: '42501', message: 'permission denied' };
      const result = DatabaseError.fromSupabaseError(
        error,
        'deleteCollection',
        'resource_collections'
      );

      expect(result.operation).toBe('deleteCollection');
      expect(result.resourceType).toBe('resource_collections');
    });
  });
});
```

**Step 2: Run tests**

Run: `npm test src/lib/errors/__tests__/database-errors-rls.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/lib/errors/__tests__/database-errors-rls.test.ts
git commit -m "test(errors): Add unit tests for RLS error detection

- Test error code and message pattern detection
- Test Sentry logging integration
- Test operation-specific messages
- Part of Step 16: RLS Error Handler

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 15: Manual Testing & Verification

**Files:**

- None (manual testing only)

**Step 1: Verify all type checks pass**

Run: `npm run type-check`
Expected: No new errors (baseline ~30 errors remain)

**Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass (including new RLS tests)

**Step 3: Verify Sentry integration (optional - requires Sentry dashboard access)**

If you have Sentry access:

1. Trigger an RLS violation (try to add resource to collection you don't own)
2. Check Sentry dashboard for warning-level event
3. Verify tags: `errorType:rls_violation`, `operation:<name>`

**Step 4: Document completion**

Create verification checklist:

```markdown
## Step 16 Verification Checklist

- [x] All error codes added to DB_ERROR_CODES
- [x] Operation message map complete
- [x] RLS detection function implemented
- [x] Sentry logging function implemented
- [x] fromSupabaseError enhanced with RLS detection
- [x] wrapDatabaseOperation helper created
- [x] All 11 service methods updated:
  - [x] uploadResource
  - [x] updateResource
  - [x] deleteResource
  - [x] createCollection
  - [x] updateCollection
  - [x] deleteCollection
  - [x] addToCollection
  - [x] removeFromCollection
  - [x] shareWithAllClients
  - [x] updateSettings
- [x] Unit tests written and passing
- [x] Type checks pass
- [x] No raw SQL errors exposed to users
- [x] RLS errors logged to Sentry
```

**Step 5: Final commit**

```bash
git add .
git commit -m "docs(security): Verify Step 16 completion

- All RLS error handling implemented
- 11 service methods updated
- Unit tests passing
- Type checks clean
- Ready for integration

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Success Criteria

✅ **User Experience:**

- No raw SQL errors visible to users
- Operation-specific, actionable messages
- Consistent error format across all operations

✅ **Admin Visibility:**

- All RLS violations logged to Sentry
- Searchable by operation, user, resource
- Includes full context for investigation

✅ **Code Quality:**

- DRY: Single wrapper handles all detection
- No code duplication across service methods
- Type-safe Result pattern maintained

✅ **Testing:**

- Unit tests for RLS detection logic
- All tests passing
- Type checks clean

---

## Next Steps

After completing this plan:

1. **Review Sentry Dashboard**: Check that RLS violations are being logged correctly
2. **Integration Testing**: Test with real RLS policies in development environment
3. **User Acceptance Testing**: Verify error messages are clear and helpful
4. **Documentation**: Update API documentation with new error codes
5. **Consider Step 17**: Move on to next security or feature enhancement

---

## References

- Design Document: `docs/plans/2025-10-20-rls-error-handler-design.md`
- Existing Error System: `src/lib/errors/database-errors.ts`
- Resource Service: `src/lib/services/resource-library-service.ts`
- Result Pattern: `src/lib/types/result.ts`
- Sentry Docs: https://docs.sentry.io/platforms/javascript/
