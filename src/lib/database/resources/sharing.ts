/**
 * Resource Sharing Operations
 *
 * This module provides functions for sharing resources with clients.
 * Includes bulk sharing, individual shares, and share management.
 *
 * @module lib/database/resources/sharing
 */

import { createClient } from '@/lib/supabase/server';
import type { ResourceShare } from '@/types/resources';

/**
 * Share a resource with all current clients of a coach
 *
 * @param resourceId - Resource to share
 * @param coachId - Coach sharing the resource
 * @param permission - Permission level
 * @param expiresAt - Optional expiration date
 * @returns Array of created/updated shares
 */
export async function shareResourceWithAllClients(
  resourceId: string,
  coachId: string,
  permission: 'view' | 'download' | 'edit',
  expiresAt?: Date
): Promise<ResourceShare[]> {
  const supabase = await createClient();

  // Get all unique clients coached by this coach (via sessions)
  const { data: sessions } = await supabase
    .from('sessions')
    .select('client_id')
    .eq('coach_id', coachId)
    .not('client_id', 'is', null);

  if (!sessions || sessions.length === 0) {
    return [];
  }

  const uniqueClientIds = [
    ...new Set(sessions.map(s => s.client_id).filter(Boolean)),
  ];

  // Create share records for each client
  const shares = uniqueClientIds.map(clientId => ({
    file_id: resourceId,
    shared_by: coachId,
    shared_with: clientId,
    permission_type: permission,
    expires_at: expiresAt?.toISOString() || null,
  }));

  const { data, error } = await supabase
    .from('file_shares')
    .upsert(shares, {
      onConflict: 'file_id,shared_by,shared_with',
    })
    .select();

  if (error) {
    throw new Error(`Failed to share resource: ${error.message}`);
  }

  // Mark resource as shared with all clients
  await supabase
    .from('file_uploads')
    .update({
      shared_with_all_clients: true,
      is_shared: true,
    })
    .eq('id', resourceId);

  return data || [];
}

/**
 * Get all shares for a resource
 *
 * @param resourceId - Resource ID
 * @returns Array of shares
 */
export async function getResourceShares(
  resourceId: string
): Promise<ResourceShare[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('file_shares')
    .select(
      `
      *,
      users!file_shares_shared_with_fkey(id, first_name, last_name, email)
    `
    )
    .eq('file_id', resourceId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch resource shares: ${error.message}`);
  }

  return (data || []).map(share => ({
    id: share.id,
    fileId: share.file_id,
    sharedBy: share.shared_by,
    sharedWith: share.shared_with,
    permissionType: share.permission_type,
    expiresAt: share.expires_at,
    accessCount: share.access_count,
    lastAccessedAt: share.last_accessed_at,
    createdAt: share.created_at,
    sharedWithUser: share.users
      ? {
          id: share.users.id,
          name: `${share.users.first_name} ${share.users.last_name || ''}`.trim(),
          email: share.users.email,
        }
      : undefined,
  }));
}
