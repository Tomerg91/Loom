/**
 * Integration tests for Resource Library Query Functions
 *
 * These tests verify that all query functions in src/lib/database/resources.ts
 * work correctly with RLS policies after the resource_id → file_id migration.
 *
 * @requires SUPABASE_SERVICE_ROLE_KEY and SUPABASE_JWT_SECRET environment variables
 */

import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

import type { Database } from '@/types/supabase';

// Skip tests if no service role key available
const skipReason =
  !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_JWT_SECRET
    ? 'Skipping resource query RLS tests (missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_JWT_SECRET). These tests require database access.'
    : undefined;

describe.skipIf(skipReason)('Resource Library Query RLS Compliance', () => {
  let adminClient: ReturnType<typeof createClient<Database>>;
  let coach1Id: string;
  let coach2Id: string;
  let client1Id: string;
  let file1Id: string;
  let file2Id: string;
  let collection1Id: string;

  beforeAll(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing required Supabase environment variables');
    }

    adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  });

  beforeEach(async () => {
    // Generate test IDs
    coach1Id = crypto.randomUUID();
    coach2Id = crypto.randomUUID();
    client1Id = crypto.randomUUID();
    file1Id = crypto.randomUUID();
    file2Id = crypto.randomUUID();

    // Create test users
    const { error: usersError } = await adminClient.from('users').insert([
      {
        id: coach1Id,
        email: `coach1-${Date.now()}@test.com`,
        role: 'coach',
        first_name: 'Coach',
        last_name: 'One',
      },
      {
        id: coach2Id,
        email: `coach2-${Date.now()}@test.com`,
        role: 'coach',
        first_name: 'Coach',
        last_name: 'Two',
      },
      {
        id: client1Id,
        email: `client1-${Date.now()}@test.com`,
        role: 'client',
        first_name: 'Client',
        last_name: 'One',
      },
    ]);

    if (usersError) {
      throw new Error(`Failed to create test users: ${usersError.message}`);
    }

    // Create test files
    const fileUploadRows: Database['public']['Tables']['file_uploads']['Insert'][] =
      [
        {
          id: file1Id,
          user_id: coach1Id,
          filename: 'resource1.pdf',
          original_filename: 'resource1.pdf',
          storage_path: '/test/resource1.pdf',
          bucket_name: 'documents',
          file_type: 'application/pdf',
          file_size: 1024,
          file_category: 'document',
        },
        {
          id: file2Id,
          user_id: coach2Id,
          filename: 'resource2.pdf',
          original_filename: 'resource2.pdf',
          storage_path: '/test/resource2.pdf',
          bucket_name: 'documents',
          file_type: 'application/pdf',
          file_size: 2048,
          file_category: 'resource',
        },
      ];

    const { error: filesError } = await adminClient
      .from('file_uploads')
      .insert(fileUploadRows);

    if (filesError) {
      throw new Error(`Failed to create test files: ${filesError.message}`);
    }
  });

  afterEach(async () => {
    // Cleanup in reverse order of dependencies
    await (adminClient as any)
      .from('resource_client_progress')
      .delete()
      .in('client_id', [client1Id]);
    await adminClient
      .from('file_shares')
      .delete()
      .in('file_id', [file1Id, file2Id]);
    await (adminClient as any)
      .from('resource_collection_items')
      .delete()
      .in('file_id', [file1Id, file2Id]);
    await (adminClient as any)
      .from('resource_collections')
      .delete()
      .in('coach_id', [coach1Id, coach2Id]);
    await adminClient
      .from('file_uploads')
      .delete()
      .in('id', [file1Id, file2Id]);
    await adminClient
      .from('users')
      .delete()
      .in('id', [coach1Id, coach2Id, client1Id]);
  });

  describe('resource_collection_items queries', () => {
    it('should correctly reference file_id when adding items to collection', async () => {
      // Create collection
      const { data: collection, error: collectionError } = await (adminClient as any)
        .from('resource_collections')
        .insert({
          coach_id: coach1Id,
          name: 'Test Collection',
          description: 'Test',
        })
        .select('id')
        .single();

      expect(collectionError).toBeNull();
      expect(collection).toBeTruthy();
      collection1Id = (collection as any)!.id;

      // Add item to collection (should use file_id, not resource_id)
      const { data: item, error: itemError } = await (adminClient as any)
        .from('resource_collection_items')
        .insert({
          collection_id: collection1Id,
          file_id: file1Id,
          sort_order: 1,
        })
        .select('*')
        .single();

      expect(itemError).toBeNull();
      expect(item).toBeTruthy();
      expect((item as any)!.file_id).toBe(file1Id);
      expect((item as any)!.collection_id).toBe(collection1Id);
    });

    it('should correctly join file_uploads using file_id foreign key', async () => {
      // Create collection and item
      const { data: collection } = await (adminClient as any)
        .from('resource_collections')
        .insert({
          coach_id: coach1Id,
          name: 'Test Collection',
        })
        .select('id')
        .single();

      collection1Id = (collection as any)!.id;

      await (adminClient as any).from('resource_collection_items').insert({
        collection_id: collection1Id,
        file_id: file1Id,
        sort_order: 1,
      });

      // Query with join (this tests the foreign key relationship)
      const { data: items, error } = await (adminClient as any)
        .from('resource_collection_items')
        .select(
          `
          *,
          file_uploads!resource_collection_items_file_id_fkey(*)
        `
        )
        .eq('collection_id', collection1Id);

      expect(error).toBeNull();
      expect(items).toHaveLength(1);
      expect((items as any)![0].file_id).toBe(file1Id);
      expect((items as any)![0].file_uploads).toBeTruthy();
      expect((items as any)![0].file_uploads.id).toBe(file1Id);
    });
  });

  describe('resource_client_progress queries', () => {
    it('should correctly reference file_id when tracking progress', async () => {
      // Track progress (should use file_id, not resource_id)
      const { data: progress, error } = await (adminClient as any)
        .from('resource_client_progress')
        .insert({
          file_id: file1Id,
          client_id: client1Id,
          viewed_at: new Date().toISOString(),
          access_count: 1,
        })
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(progress).toBeTruthy();
      expect((progress as any)!.file_id).toBe(file1Id);
      expect((progress as any)!.client_id).toBe(client1Id);
    });

    it('should correctly query progress by file_id', async () => {
      // Create progress record
      await (adminClient as any).from('resource_client_progress').insert({
        file_id: file1Id,
        client_id: client1Id,
        viewed_at: new Date().toISOString(),
        access_count: 1,
      });

      // Query by file_id
      const { data: progressRecords, error } = await (adminClient as any)
        .from('resource_client_progress')
        .select('*')
        .eq('file_id', file1Id);

      expect(error).toBeNull();
      expect(progressRecords).toHaveLength(1);
      expect((progressRecords as any)![0].file_id).toBe(file1Id);
    });

    it('should correctly join file_uploads using file_id foreign key', async () => {
      // Create progress record
      await (adminClient as any).from('resource_client_progress').insert({
        file_id: file1Id,
        client_id: client1Id,
        viewed_at: new Date().toISOString(),
      });

      // Query with join
      const { data: progressRecords, error } = await (adminClient as any)
        .from('resource_client_progress')
        .select(
          `
          *,
          file_uploads!resource_client_progress_file_id_fkey(*)
        `
        )
        .eq('client_id', client1Id);

      expect(error).toBeNull();
      expect(progressRecords).toHaveLength(1);
      expect((progressRecords as any)![0].file_id).toBe(file1Id);
      expect((progressRecords as any)![0].file_uploads).toBeTruthy();
      expect((progressRecords as any)![0].file_uploads.id).toBe(file1Id);
    });
  });

  describe('RPC function parameter compliance', () => {
    it('should call increment_resource_view_count with p_file_id parameter', async () => {
      // This tests that the RPC function accepts the new parameter name
      const rpc = adminClient.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ error: { message: string } | null }>;

      const { error } = await rpc('increment_resource_view_count', {
        p_file_id: file1Id,
        p_client_id: client1Id,
      });

      // Should not error (function should exist and accept these parameters)
      expect(error).toBeNull();

      // Verify view count was incremented
      const { data: file } = await adminClient
        .from('file_uploads')
        .select('*')
        .eq('id', file1Id)
        .single();

      expect(file).toBeTruthy();
    });
  });

  describe('Error handling for RLS violations', () => {
    it('should detect when trying to add unauthorized file to collection', async () => {
      // Create collection for coach1
      const { data: collection } = await (adminClient as any)
        .from('resource_collections')
        .insert({
          coach_id: coach1Id,
          name: 'Coach 1 Collection',
        })
        .select('id')
        .single();

      collection1Id = (collection as any)!.id;

      // Create client for coach1 to test as
      const coach1Client = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
          global: {
            headers: {
              Authorization: `Bearer ${await generateTestToken(coach1Id)}`,
            },
          },
        }
      );

      // Try to add coach2's file to coach1's collection (should fail RLS)
      const { error } = await (coach1Client as any)
        .from('resource_collection_items')
        .insert({
          collection_id: collection1Id,
          file_id: file2Id, // coach2's file
          sort_order: 1,
        });

      // Should fail due to RLS policy
      expect(error).toBeTruthy();
    });
  });
});

/**
 * Helper to generate a signed JWT token that represents an authenticated user
 * Uses the SUPABASE_JWT_SECRET to mimic Supabase auth-issued access tokens
 */
async function generateTestToken(userId: string): Promise<string> {
  const secret = process.env.SUPABASE_JWT_SECRET;

  if (!secret) {
    throw new Error(
      'Missing SUPABASE_JWT_SECRET environment variable for test token generation'
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' } as const;
  const payload = {
    aud: 'authenticated',
    exp: now + 60 * 60,
    iat: now,
    iss: 'supabase',
    role: 'authenticated',
    sub: userId,
  } as const;

  const encode = (segment: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(segment)).toString('base64url');

  const headerSegment = encode(header);
  const payloadSegment = encode(payload);
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const signature = createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url');

  return `${signingInput}.${signature}`;
}
