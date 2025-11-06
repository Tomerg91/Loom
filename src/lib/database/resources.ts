/**
 * Resources Database Service
 * Handles CRUD operations for coach resources library
 */

import { createClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export type ResourceType = 'video' | 'audio' | 'pdf' | 'link';

export interface Resource {
  id: string;
  coach_id: string;
  title: string;
  description: string | null;
  type: ResourceType;
  url: string;
  thumbnail_url: string | null;
  tags: string[];
  category: string | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceWithStats extends Resource {
  total_assignments: number;
  viewed_count: number;
  completed_count: number;
}

export interface ResourceAssignment {
  id: string;
  resource_id: string;
  client_id: string;
  assigned_by: string;
  notes: string | null;
  assigned_at: string;
  viewed_at: string | null;
  completed_at: string | null;
}

export interface ClientResourceWithProgress extends Resource {
  assignment_id: string;
  assigned_by: string;
  notes: string | null;
  assigned_at: string;
  viewed_at: string | null;
  completed_at: string | null;
  progress_status: 'not_started' | 'in_progress' | 'completed';
}

export interface ResourceListParams {
  category?: string;
  tags?: string[];
  search?: string;
  sortBy?: 'created_at' | 'title' | 'type';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CreateResourceData {
  title: string;
  description?: string;
  type: ResourceType;
  url: string;
  thumbnail_url?: string;
  tags?: string[];
  category?: string;
  duration_minutes?: number;
}

export interface UpdateResourceData {
  title?: string;
  description?: string;
  type?: ResourceType;
  url?: string;
  thumbnail_url?: string;
  tags?: string[];
  category?: string;
  duration_minutes?: number;
}

/**
 * Get all resources for a coach with optional filtering
 */
export async function getCoachLibraryResources(
  coachId: string,
  params: ResourceListParams = {}
): Promise<ResourceWithStats[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('resources_with_stats')
      .select('*')
      .eq('coach_id', coachId);

    // Apply filters
    if (params.category) {
      query = query.eq('category', params.category);
    }

    if (params.tags && params.tags.length > 0) {
      query = query.contains('tags', params.tags);
    }

    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
    }

    // Apply sorting
    const sortBy = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch coach resources', error);
      throw error;
    }

    return data as ResourceWithStats[];
  } catch (error) {
    logger.error('Error in getCoachLibraryResources', error);
    throw error;
  }
}

/**
 * Get a single resource by ID
 */
export async function getResourceById(resourceId: string): Promise<Resource | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', resourceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Resource not found
      }
      logger.error('Failed to fetch resource by ID', error);
      throw error;
    }

    return data as Resource;
  } catch (error) {
    logger.error('Error in getResourceById', error);
    throw error;
  }
}

/**
 * Create a new resource
 */
export async function createResource(
  coachId: string,
  data: CreateResourceData
): Promise<Resource> {
  try {
    const supabase = await createClient();

    const { data: resource, error } = await supabase
      .from('resources')
      .insert({
        coach_id: coachId,
        title: data.title,
        description: data.description || null,
        type: data.type,
        url: data.url,
        thumbnail_url: data.thumbnail_url || null,
        tags: data.tags || [],
        category: data.category || null,
        duration_minutes: data.duration_minutes || null,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create resource', error);
      throw error;
    }

    logger.info('Resource created', { resourceId: resource.id, coachId });
    return resource as Resource;
  } catch (error) {
    logger.error('Error in createResource', error);
    throw error;
  }
}

/**
 * Update a resource
 */
export async function updateResource(
  resourceId: string,
  coachId: string,
  data: UpdateResourceData
): Promise<Resource> {
  try {
    const supabase = await createClient();

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.url !== undefined) updateData.url = data.url;
    if (data.thumbnail_url !== undefined) updateData.thumbnail_url = data.thumbnail_url;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.duration_minutes !== undefined) updateData.duration_minutes = data.duration_minutes;

    const { data: resource, error } = await supabase
      .from('resources')
      .update(updateData)
      .eq('id', resourceId)
      .eq('coach_id', coachId) // Ensure coach owns the resource
      .select()
      .single();

    if (error) {
      logger.error('Failed to update resource', error);
      throw error;
    }

    logger.info('Resource updated', { resourceId, coachId });
    return resource as Resource;
  } catch (error) {
    logger.error('Error in updateResource', error);
    throw error;
  }
}

/**
 * Delete a resource
 */
export async function deleteResource(resourceId: string, coachId: string): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', resourceId)
      .eq('coach_id', coachId); // Ensure coach owns the resource

    if (error) {
      logger.error('Failed to delete resource', error);
      throw error;
    }

    logger.info('Resource deleted', { resourceId, coachId });
  } catch (error) {
    logger.error('Error in deleteResource', error);
    throw error;
  }
}

/**
 * Assign a resource to a client
 */
export async function assignResourceToClient(
  resourceId: string,
  clientId: string,
  coachId: string,
  notes?: string
): Promise<ResourceAssignment> {
  try {
    const supabase = await createClient();

    const { data: assignment, error } = await supabase
      .from('resource_assignments')
      .insert({
        resource_id: resourceId,
        client_id: clientId,
        assigned_by: coachId,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to assign resource', error);
      throw error;
    }

    logger.info('Resource assigned to client', { resourceId, clientId, coachId });
    return assignment as ResourceAssignment;
  } catch (error) {
    logger.error('Error in assignResourceToClient', error);
    throw error;
  }
}

/**
 * Unassign a resource from a client
 */
export async function unassignResourceFromClient(
  assignmentId: string,
  coachId: string
): Promise<void> {
  try {
    const supabase = await createClient();

    // Verify the coach owns the resource before unassigning
    const { error } = await supabase
      .from('resource_assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('assigned_by', coachId);

    if (error) {
      logger.error('Failed to unassign resource', error);
      throw error;
    }

    logger.info('Resource unassigned from client', { assignmentId, coachId });
  } catch (error) {
    logger.error('Error in unassignResourceFromClient', error);
    throw error;
  }
}

/**
 * Get all resources assigned to a client
 */
export async function getClientResources(
  clientId: string
): Promise<ClientResourceWithProgress[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('client_resources_with_progress')
      .select('*')
      .eq('client_id', clientId)
      .order('assigned_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch client resources', error);
      throw error;
    }

    return data as ClientResourceWithProgress[];
  } catch (error) {
    logger.error('Error in getClientResources', error);
    throw error;
  }
}

/**
 * Mark a resource as viewed by a client
 */
export async function markResourceAsViewed(
  assignmentId: string,
  clientId: string
): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('resource_assignments')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .eq('client_id', clientId)
      .is('viewed_at', null); // Only update if not already viewed

    if (error) {
      logger.error('Failed to mark resource as viewed', error);
      throw error;
    }

    logger.info('Resource marked as viewed', { assignmentId, clientId });
  } catch (error) {
    logger.error('Error in markResourceAsViewed', error);
    throw error;
  }
}

/**
 * Mark a resource as completed by a client
 */
export async function markResourceAsCompleted(
  assignmentId: string,
  clientId: string
): Promise<void> {
  try {
    const supabase = await createClient();

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('resource_assignments')
      .update({
        completed_at: now,
        viewed_at: now, // Ensure viewed_at is set if not already
      })
      .eq('id', assignmentId)
      .eq('client_id', clientId);

    if (error) {
      logger.error('Failed to mark resource as completed', error);
      throw error;
    }

    logger.info('Resource marked as completed', { assignmentId, clientId });
  } catch (error) {
    logger.error('Error in markResourceAsCompleted', error);
    throw error;
  }
}

/**
 * Get resource assignments for a specific resource (for coaches to see who has access)
 */
export async function getResourceAssignments(
  resourceId: string,
  coachId: string
): Promise<ResourceAssignment[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('resource_assignments')
      .select('*')
      .eq('resource_id', resourceId)
      .eq('assigned_by', coachId)
      .order('assigned_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch resource assignments', error);
      throw error;
    }

    return data as ResourceAssignment[];
  } catch (error) {
    logger.error('Error in getResourceAssignments', error);
    throw error;
  }
}

/**
 * Get library analytics for a coach
 */
export async function getLibraryAnalytics(coachId: string): Promise<{
  total_resources: number;
  total_assignments: number;
  total_views: number;
  total_completions: number;
  by_type: Record<ResourceType, number>;
}> {
  try {
    const supabase = await createClient();

    // Get total resources and breakdown by type
    const { data: resources, error: resourcesError } = await supabase
      .from('resources')
      .select('type')
      .eq('coach_id', coachId);

    if (resourcesError) {
      throw resourcesError;
    }

    const total_resources = resources.length;
    const by_type: Record<string, number> = {
      video: 0,
      audio: 0,
      pdf: 0,
      link: 0,
    };

    resources.forEach((r) => {
      by_type[r.type] = (by_type[r.type] || 0) + 1;
    });

    // Get assignment statistics
    const { data: assignments, error: assignmentsError } = await supabase
      .from('resource_assignments')
      .select('viewed_at, completed_at')
      .eq('assigned_by', coachId);

    if (assignmentsError) {
      throw assignmentsError;
    }

    const total_assignments = assignments.length;
    const total_views = assignments.filter((a) => a.viewed_at !== null).length;
    const total_completions = assignments.filter((a) => a.completed_at !== null).length;

    return {
      total_resources,
      total_assignments,
      total_views,
      total_completions,
      by_type: by_type as Record<ResourceType, number>,
    };
  } catch (error) {
    logger.error('Error in getLibraryAnalytics', error);
    throw error;
  }
}

/**
 * Create a collection (placeholder for future implementation)
 * Currently returns empty array - collections feature is planned
 */
export async function createCollection(_coachId: string, _name: string): Promise<any[]> {
  logger.warn('createCollection called but collections feature not yet implemented');
  return [];
}
