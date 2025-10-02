import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, setSupabaseCookieStore } from '@/lib/supabase/server';
import { fileVersionsDatabase } from '@/lib/database/file-versions';
import { fileDatabase } from '@/lib/database/files';
import { fileModificationRateLimit } from '@/lib/security/file-rate-limit';
import { z } from 'zod';

// Validation schemas
const createVersionSchema = z.object({
  description: z.string().max(1000).optional(),
  change_summary: z.string().max(500).optional(),
  is_major_version: z.boolean().default(false),
});

const rollbackVersionSchema = z.object({
  target_version: z.number().int().min(1),
  description: z.string().max(500).optional(),
});

// GET /api/files/[id]/versions - Get all versions for a file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = cookies();
  setSupabaseCookieStore(cookieStore);
  const { id } = await params;
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

    // Get all versions for the file
    const versions = await fileVersionsDatabase.getFileVersions(id);
    const stats = await fileVersionsDatabase.getFileVersionStats(id);

    // Format response
    const formattedVersions = versions.map(version => ({
      id: version.id,
      version_number: version.version_number,
      filename: version.filename,
      file_type: version.file_type,
      file_size: version.file_size,
      description: version.description,
      change_summary: version.change_summary,
      is_major_version: version.is_major_version,
      is_current_version: version.is_current_version,
      created_by: version.created_by_user ? {
        id: version.created_by_user.id,
        name: `${version.created_by_user.first_name} ${version.created_by_user.last_name || ''}`.trim(),
      } : null,
      created_at: version.created_at,
      file_hash: version.file_hash,
    }));

    return NextResponse.json({
      file_id: id,
      versions: formattedVersions,
      stats: {
        total_versions: stats.total_versions,
        current_version: stats.current_version,
        latest_version: stats.latest_version,
        total_size: stats.total_size,
        major_versions: stats.major_versions,
        first_version_date: stats.first_version_date,
        latest_version_date: stats.latest_version_date,
      },
    });

  } catch (error) {
    console.error('Get file versions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/files/[id]/versions - Create a new version of a file
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = cookies();
  setSupabaseCookieStore(cookieStore);
  const { id } = await params;
  try {
    // Apply rate limiting
    const rateLimitResult = await fileModificationRateLimit(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns the file
    const file = await fileDatabase.getFileUpload(id);
    
    if (file.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only create versions for files you own' },
        { status: 403 }
      );
    }

    // Handle multipart form data for file upload
    const formData = await request.formData();
    const uploadedFile = formData.get('file') as File;
    const description = formData.get('description') as string;
    const changeSummary = formData.get('change_summary') as string;
    const isMajorVersion = formData.get('is_major_version') === 'true';

    if (!uploadedFile) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    if (uploadedFile.size > 100 * 1024 * 1024) { // 100MB limit
      return NextResponse.json(
        { error: 'File size exceeds 100MB limit' },
        { status: 400 }
      );
    }

    // Generate file hash
    const buffer = await uploadedFile.arrayBuffer();
    const fileHash = fileVersionsDatabase.generateFileHash(Buffer.from(buffer));

    // Check for duplicates
    const duplicate = await fileVersionsDatabase.findDuplicateByHash(fileHash, id);
    if (duplicate) {
      return NextResponse.json(
        { error: 'This file content already exists as a version' },
        { status: 400 }
      );
    }

    // Upload new file version to Supabase Storage
    const timestamp = Date.now();
    const fileExtension = uploadedFile.name.split('.').pop();
    const storagePath = `versions/${id}/${timestamp}.${fileExtension}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(storagePath, buffer, {
        contentType: uploadedFile.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Create new version record
    const newVersion = await fileVersionsDatabase.createFileVersion({
      file_id: id,
      storage_path: uploadData.path,
      filename: uploadedFile.name,
      original_filename: uploadedFile.name,
      file_type: uploadedFile.type,
      file_size: uploadedFile.size,
      file_hash: fileHash,
      description: description || undefined,
      change_summary: changeSummary || undefined,
      is_major_version: isMajorVersion,
      created_by: user.id,
    });

    // Create notification for file watchers (if applicable)
    // This could be expanded to notify users who have access to the file

    return NextResponse.json({
      success: true,
      version: {
        id: newVersion.id,
        version_number: newVersion.version_number,
        filename: newVersion.filename,
        file_type: newVersion.file_type,
        file_size: newVersion.file_size,
        description: newVersion.description,
        change_summary: newVersion.change_summary,
        is_major_version: newVersion.is_major_version,
        is_current_version: newVersion.is_current_version,
        created_at: newVersion.created_at,
      },
    });

  } catch (error) {
    console.error('Create file version error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}