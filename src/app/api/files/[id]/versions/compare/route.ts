import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { fileVersionsDatabase } from '@/lib/database/file-versions';
import { fileDatabase } from '@/lib/database/files';
import { createClient } from '@/lib/supabase/server';


// Validation schema
const compareSchema = z.object({
  version_a: z.number().int().min(1),
  version_b: z.number().int().min(1),
});

// POST /api/files/[id]/versions/compare - Compare two versions of a file
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify user has access to the file
    const file = await fileDatabase.getFileUpload(id);
    
    // Check if user owns the file or it's shared with them
    if (file.user_id !== user.id) {
      const userShares = await fileDatabase.getFileShares(id, user.id);
      const hasFileAccess = userShares.some(share => 
        share.shared_with === user.id && 
        (!share.expires_at || new Date(share.expires_at) > new Date())
      );

      if (!hasFileAccess) {
        return NextResponse.json(
          { error: 'File not found or access denied' },
          { status: 404 }
        );
      }
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = compareSchema.parse(body);

    // Verify both versions exist
    const [versionA, versionB] = await Promise.all([
      fileVersionsDatabase.getVersionByNumber(id, validatedData.version_a),
      fileVersionsDatabase.getVersionByNumber(id, validatedData.version_b),
    ]);

    if (!versionA) {
      return NextResponse.json(
        { error: `Version ${validatedData.version_a} not found` },
        { status: 404 }
      );
    }

    if (!versionB) {
      return NextResponse.json(
        { error: `Version ${validatedData.version_b} not found` },
        { status: 404 }
      );
    }

    // Get comparison data
    const comparison = await fileVersionsDatabase.compareVersions(
      id,
      validatedData.version_a,
      validatedData.version_b
    );

    // Get download URLs for both versions
    const [urlA, urlB] = await Promise.all([
      supabase.storage.from('uploads').createSignedUrl(versionA.storage_path, 3600),
      supabase.storage.from('uploads').createSignedUrl(versionB.storage_path, 3600),
    ]);

    return NextResponse.json({
      file_id: id,
      comparison: {
        ...comparison.comparison,
        download_urls: {
          version_a: urlA.data?.signedUrl,
          version_b: urlB.data?.signedUrl,
        },
      },
      metadata: {
        file_name: file.filename,
        comparison_performed_at: new Date().toISOString(),
        compared_by: {
          id: user.id,
          name: `${file.user.first_name} ${file.user.last_name || ''}`.trim(),
        },
      },
    });

  } catch (error) {
    console.error('Compare file versions error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/files/[id]/versions/compare?version_a=X&version_b=Y - Compare via query params
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const versionA = parseInt(searchParams.get('version_a') || '');
    const versionB = parseInt(searchParams.get('version_b') || '');

    if (!versionA || !versionB) {
      return NextResponse.json(
        { error: 'Both version_a and version_b query parameters are required' },
        { status: 400 }
      );
    }

    // Create a fake request with the query params in the body
    const fakeRequest = {
      json: async () => ({ version_a: versionA, version_b: versionB })
    } as unknown;

    // Reuse the POST logic
    return await POST(fakeRequest, { params });

  } catch (error) {
    console.error('Compare file versions GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}