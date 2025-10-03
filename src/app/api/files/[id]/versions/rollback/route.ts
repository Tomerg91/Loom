import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fileVersionsDatabase } from '@/lib/database/file-versions';
import { fileDatabase } from '@/lib/database/files';
import { fileModificationRateLimit } from '@/lib/security/file-rate-limit';
import { z } from 'zod';

// Validation schema
const rollbackSchema = z.object({
  target_version: z.number().int().min(1),
  description: z.string().max(500).optional(),
});

// POST /api/files/[id]/versions/rollback - Rollback to a specific version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Verify user owns the file
    const file = await fileDatabase.getFileUpload(id);
    
    if (file.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only rollback versions for files you own' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = rollbackSchema.parse(body);

    // Verify target version exists
    const targetVersion = await fileVersionsDatabase.getVersionByNumber(
      id, 
      validatedData.target_version
    );

    if (!targetVersion) {
      return NextResponse.json(
        { error: `Version ${validatedData.target_version} not found` },
        { status: 404 }
      );
    }

    // Perform rollback
    const newVersionId = await fileVersionsDatabase.rollbackToVersion(
      id,
      validatedData.target_version,
      user.id,
      validatedData.description
    );

    // Get the new version details
    const newVersion = await fileVersionsDatabase.getFileVersion(newVersionId);

    // Create notification (optional)
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'file_rollback',
      title: 'File Rolled Back',
      message: `File "${file.filename}" was rolled back to version ${validatedData.target_version}`,
      data: {
        type: 'file_rollback',
        file_id: id,
        target_version: validatedData.target_version,
        new_version: newVersion.version_number,
      },
    });

    return NextResponse.json({
      success: true,
      message: `File rolled back to version ${validatedData.target_version}`,
      new_version: {
        id: newVersion.id,
        version_number: newVersion.version_number,
        filename: newVersion.filename,
        file_type: newVersion.file_type,
        file_size: newVersion.file_size,
        description: newVersion.description,
        change_summary: newVersion.change_summary,
        is_current_version: newVersion.is_current_version,
        created_at: newVersion.created_at,
      },
      rolled_back_from: validatedData.target_version,
    });

  } catch (error) {
    console.error('Rollback file version error:', error);

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