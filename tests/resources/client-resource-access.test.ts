/**
 * Client Resource Access RLS Tests
 *
 * Verifies that RLS policies correctly enforce:
 * 1. Clients can only see resources shared with them
 * 2. Clients cannot access other coaches' resources
 * 3. Progress tracking is client-specific
 * 4. Collections are filtered to only show accessible resources
 *
 * @module tests/resources/client-resource-access
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

describe('Client Resource Access RLS', () => {
  let coachClient: ReturnType<typeof createClient>;
  let clientAClient: ReturnType<typeof createClient>;
  let clientBClient: ReturnType<typeof createClient>;

  let coachId: string;
  let clientAId: string;
  let clientBId: string;

  let sharedResourceId: string;
  let privateResourceId: string;

  beforeAll(async () => {
    // Setup: Create test users and resources
    // This assumes test users already exist or uses Supabase test helpers

    // For this test, we'll use service role to set up data
    const serviceClient = createClient(
      SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Create test coach
    const { data: coach, error: coachError } = await serviceClient.auth.admin.createUser({
      email: 'test-coach@example.com',
      password: 'testpassword123',
      user_metadata: { role: 'coach', name: 'Test Coach' },
    });

    if (coachError) throw coachError;
    coachId = coach.user.id;

    // Create test clients
    const { data: clientA, error: clientAError } = await serviceClient.auth.admin.createUser({
      email: 'test-client-a@example.com',
      password: 'testpassword123',
      user_metadata: { role: 'client', name: 'Client A' },
    });

    if (clientAError) throw clientAError;
    clientAId = clientA.user.id;

    const { data: clientB, error: clientBError } = await serviceClient.auth.admin.createUser({
      email: 'test-client-b@example.com',
      password: 'testpassword123',
      user_metadata: { role: 'client', name: 'Client B' },
    });

    if (clientBError) throw clientBError;
    clientBId = clientB.user.id;

    // Create authenticated clients for each user
    coachClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await coachClient.auth.signInWithPassword({
      email: 'test-coach@example.com',
      password: 'testpassword123',
    });

    clientAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await clientAClient.auth.signInWithPassword({
      email: 'test-client-a@example.com',
      password: 'testpassword123',
    });

    clientBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await clientBClient.auth.signInWithPassword({
      email: 'test-client-b@example.com',
      password: 'testpassword123',
    });

    // Create test resources as coach
    const { data: sharedResource, error: sharedError } = await coachClient
      .from('file_uploads')
      .insert({
        user_id: coachId,
        filename: 'shared-resource.pdf',
        original_filename: 'shared-resource.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        storage_path: 'test/shared-resource.pdf',
        bucket_name: 'resources',
        is_library_resource: true,
        category: 'worksheet',
      })
      .select()
      .single();

    if (sharedError) throw sharedError;
    sharedResourceId = sharedResource.id;

    const { data: privateResource, error: privateError } = await coachClient
      .from('file_uploads')
      .insert({
        user_id: coachId,
        filename: 'private-resource.pdf',
        original_filename: 'private-resource.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        storage_path: 'test/private-resource.pdf',
        bucket_name: 'resources',
        is_library_resource: true,
        category: 'guide',
      })
      .select()
      .single();

    if (privateError) throw privateError;
    privateResourceId = privateResource.id;

    // Share the shared resource with Client A only
    await coachClient.from('file_shares').insert({
      file_id: sharedResourceId,
      shared_by: coachId,
      shared_with: clientAId,
      permission_type: 'download',
    });
  });

  afterAll(async () => {
    // Cleanup: Delete test data and users
    const serviceClient = createClient(
      SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Delete resources (cascade will delete shares and progress)
    await serviceClient.from('file_uploads').delete().in('id', [sharedResourceId, privateResourceId]);

    // Delete users
    await serviceClient.auth.admin.deleteUser(coachId);
    await serviceClient.auth.admin.deleteUser(clientAId);
    await serviceClient.auth.admin.deleteUser(clientBId);
  });

  describe('Resource Visibility', () => {
    it('Client A can see shared resource', async () => {
      const { data } = await clientAClient
        .from('file_uploads')
        .select('*')
        .eq('id', sharedResourceId)
        .eq('is_library_resource', true)
        .single();

      expect(data).toBeDefined();
      expect(data?.id).toBe(sharedResourceId);
    });

    it('Client A cannot see private resource', async () => {
      const { data } = await clientAClient
        .from('file_uploads')
        .select('*')
        .eq('id', privateResourceId)
        .eq('is_library_resource', true)
        .single();

      // Should return null or error (RLS blocks access)
      expect(data).toBeNull();
    });

    it('Client B cannot see shared resource (shared with A only)', async () => {
      const { data } = await clientBClient
        .from('file_uploads')
        .select('*')
        .eq('id', sharedResourceId)
        .eq('is_library_resource', true)
        .single();

      // Should return null or error (RLS blocks access)
      expect(data).toBeNull();
    });

    it('Client B cannot see private resource', async () => {
      const { data } = await clientBClient
        .from('file_uploads')
        .select('*')
        .eq('id', privateResourceId)
        .eq('is_library_resource', true)
        .single();

      // Should return null or error (RLS blocks access)
      expect(data).toBeNull();
    });

    it('Coach can see all their resources', async () => {
      const { data, error } = await coachClient
        .from('file_uploads')
        .select('*')
        .in('id', [sharedResourceId, privateResourceId])
        .eq('is_library_resource', true);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBe(2);
    });
  });

  describe('Progress Tracking RLS', () => {
    it('Client A can track progress on shared resource', async () => {
      const { data, error } = await clientAClient
        .from('resource_client_progress')
        .insert({
          file_id: sharedResourceId,
          client_id: clientAId,
          viewed_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
          access_count: 1,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.file_id).toBe(sharedResourceId);
      expect(data.client_id).toBe(clientAId);
    });

    it('Client A can view their own progress', async () => {
      const { data, error } = await clientAClient
        .from('resource_client_progress')
        .select('*')
        .eq('file_id', sharedResourceId)
        .eq('client_id', clientAId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.client_id).toBe(clientAId);
    });

    it('Client B cannot view Client A progress', async () => {
      const { data } = await clientBClient
        .from('resource_client_progress')
        .select('*')
        .eq('file_id', sharedResourceId)
        .eq('client_id', clientAId);

      // Should return empty or error (RLS blocks access)
      expect(data).toEqual([]);
    });

    it('Coach can view progress for their resources', async () => {
      const { data } = await coachClient
        .from('resource_client_progress')
        .select('*')
        .eq('file_id', sharedResourceId);

      expect(data).toBeDefined();
      expect(data?.length).toBeGreaterThan(0);
    });

    it('Client cannot track progress on non-accessible resource', async () => {
      const { error } = await clientBClient
        .from('resource_client_progress')
        .insert({
          file_id: sharedResourceId,
          client_id: clientBId,
          viewed_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
          access_count: 1,
        })
        .select()
        .single();

      // Should fail due to RLS policy
      expect(error).toBeDefined();
    });
  });

  describe('API Endpoint RLS', () => {
    it('GET /api/client/resources returns only accessible resources', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/client/resources`, {
        headers: {
          'Authorization': `Bearer ${(await clientAClient.auth.getSession()).data.session?.access_token}`,
        },
      });

      const json = await response.json();

      expect(response.ok).toBe(true);
      expect(json.success).toBe(true);
      expect(json.data.resources).toBeDefined();

      const resourceIds = json.data.resources.map((r: { id: string }) => r.id);
      expect(resourceIds).toContain(sharedResourceId);
      expect(resourceIds).not.toContain(privateResourceId);
    });

    it('POST /api/client/resources/[id]/progress tracks progress correctly', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/client/resources/${sharedResourceId}/progress`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await clientAClient.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ action: 'completed' }),
        }
      );

      const json = await response.json();

      expect(response.ok).toBe(true);
      expect(json.success).toBe(true);
      expect(json.data.progress).toBeDefined();
      expect(json.data.progress.completedAt).toBeDefined();
    });

    it('POST /api/client/resources/[id]/progress fails for non-accessible resource', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/client/resources/${privateResourceId}/progress`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await clientAClient.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ action: 'viewed' }),
        }
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });
});
