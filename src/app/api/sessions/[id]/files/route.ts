import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fileDatabase } from '@/lib/database/files';
import { sessionFilesDatabase } from '@/lib/database/session-files';
import { fileModificationRateLimit } from '@/lib/security/file-rate-limit';
import { z } from 'zod';

// Validation schemas
const attachFileSchema = z.object({
  fileId: z.string().uuid('Invalid file ID format'),
  category: z.enum(['preparation', 'notes', 'recording', 'resource']).default('resource'),
  isRequired: z.boolean().default(false),
  description: z.string().max(500).optional(),
});

const updateSessionFileSchema = z.object({
  category: z.enum(['preparation', 'notes', 'recording', 'resource']).optional(),
  isRequired: z.boolean().optional(),
  description: z.string().max(500).optional(),
});

// Helper function to check session access
async function checkSessionAccess(
  supabase: any,
  sessionId: string,
  userId: string,
  requiredRole?: 'coach' | 'client'
): Promise<{ hasAccess: boolean; session: any; userRole: string }> {
  // Get session with participant details
  const { data: session, error } = await supabase
    .from('sessions')
    .select(`
      *,
      coach:users!coach_id (
        id, first_name, last_name, role
      ),
      client:users!client_id (
        id, first_name, last_name, role
      )
    `)
    .eq('id', sessionId)
    .single();

  if (error || !session) {
    return { hasAccess: false, session: null, userRole: '' };
  }

  // Check if user is a participant
  const isCoach = session.coach_id === userId;
  const isClient = session.client_id === userId;
  
  if (!isCoach && !isClient) {
    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (user?.role !== 'admin') {
      return { hasAccess: false, session, userRole: '' };
    }
  }

  const userRole = isCoach ? 'coach' : isClient ? 'client' : 'admin';

  // Check role requirement if specified
  if (requiredRole && userRole !== requiredRole && userRole !== 'admin') {
    return { hasAccess: false, session, userRole };
  }

  return { hasAccess: true, session, userRole };
}

// GET /api/sessions/[id]/files - Get all files associated with a session
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Check session access
    const { hasAccess, session } = await checkSessionAccess(
      supabase,
      params.id,
      user.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Get session files with file details
    const sessionFiles = await sessionFilesDatabase.getSessionFiles(params.id);

    // Format response
    const formattedFiles = sessionFiles.map(sf => ({
      id: sf.id,
      file: {
        id: sf.file.id,
        filename: sf.file.filename,
        fileType: sf.file.file_type,
        fileSize: sf.file.file_size,
        description: sf.file.description,
        tags: sf.file.tags,
      },
      category: sf.file_category,
      isRequired: sf.is_required,
      uploadedBy: sf.uploaded_by_user ? {
        id: sf.uploaded_by_user.id,
        name: `${sf.uploaded_by_user.first_name} ${sf.uploaded_by_user.last_name || ''}`.trim(),
      } : null,
      attachedAt: sf.created_at,
    }));

    // Group files by category
    const filesByCategory = {
      preparation: formattedFiles.filter(f => f.category === 'preparation'),
      notes: formattedFiles.filter(f => f.category === 'notes'),
      recording: formattedFiles.filter(f => f.category === 'recording'),
      resource: formattedFiles.filter(f => f.category === 'resource'),
    };

    return NextResponse.json({
      sessionId: params.id,
      sessionTitle: session.title,
      files: formattedFiles,
      filesByCategory,
      stats: {
        totalFiles: formattedFiles.length,
        requiredFiles: formattedFiles.filter(f => f.isRequired).length,
        preparationFiles: filesByCategory.preparation.length,
        notesFiles: filesByCategory.notes.length,
        recordingFiles: filesByCategory.recording.length,
        resourceFiles: filesByCategory.resource.length,
      },
    });

  } catch (error) {
    console.error('Get session files error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sessions/[id]/files - Attach a file to a session
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Check session access
    const { hasAccess, session, userRole } = await checkSessionAccess(
      supabase,
      params.id,
      user.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = attachFileSchema.parse(body);

    // Verify the file exists and user has access to it
    const file = await fileDatabase.getFileUpload(validatedData.fileId);
    
    // Check if user owns the file or it's shared with them
    if (file.user_id !== user.id) {
      const userShares = await fileDatabase.getFileShares(validatedData.fileId, user.id);
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

    // Check if file is already attached to this session
    const isAlreadyAttached = await sessionFilesDatabase.isFileAttachedToSession(params.id, validatedData.fileId);

    if (isAlreadyAttached) {
      return NextResponse.json(
        { error: 'File is already attached to this session' },
        { status: 400 }
      );
    }

    // Create session-file association
    const sessionFile = await sessionFilesDatabase.createSessionFile({
      session_id: params.id,
      file_id: validatedData.fileId,
      file_category: validatedData.category,
      uploaded_by: user.id,
      is_required: validatedData.isRequired,
    });

    // Create notification for other session participant
    const otherParticipantId = session.coach_id === user.id ? session.client_id : session.coach_id;
    
    await supabase.from('notifications').insert({
      user_id: otherParticipantId,
      type: 'new_message', // Using existing type, could create 'session_file_added' type
      title: 'New File Added to Session',
      message: `${file.user.first_name} attached a file to "${session.title}": ${file.filename}`,
      data: {
        type: 'session_file_added',
        session_id: params.id,
        file_id: validatedData.fileId,
        added_by: user.id,
        category: validatedData.category,
      },
    });

    return NextResponse.json({
      success: true,
      sessionFile: {
        id: sessionFile.id,
        file: {
          id: sessionFile.file.id,
          filename: sessionFile.file.filename,
          fileType: sessionFile.file.file_type,
          fileSize: sessionFile.file.file_size,
          description: sessionFile.file.description,
        },
        category: sessionFile.file_category,
        isRequired: sessionFile.is_required,
        attachedAt: sessionFile.created_at,
      },
    });

  } catch (error) {
    console.error('Attach session file error:', error);

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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/sessions/[id]/files/[fileId] - Update session file metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Check session access
    const { hasAccess, userRole } = await checkSessionAccess(
      supabase,
      params.id,
      user.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { fileId, ...updateData } = body;
    const validatedData = updateSessionFileSchema.parse(updateData);

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Get the session file to check permissions
    const { data: sessionFile, error: sessionFileError } = await supabase
      .from('session_files')
      .select('*')
      .eq('session_id', params.id)
      .eq('file_id', fileId)
      .single();

    if (sessionFileError || !sessionFile) {
      return NextResponse.json(
        { error: 'Session file not found' },
        { status: 404 }
      );
    }

    // Only allow the person who attached the file or coaches to modify it
    if (sessionFile.uploaded_by !== user.id && userRole !== 'coach' && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'You can only modify files you attached or if you are the coach' },
        { status: 403 }
      );
    }

    // Update the session file
    const updateFields: any = {};
    if (validatedData.category !== undefined) {
      updateFields.file_category = validatedData.category;
    }
    if (validatedData.isRequired !== undefined) {
      updateFields.is_required = validatedData.isRequired;
    }

    const updatedSessionFile = await sessionFilesDatabase.updateSessionFile(
      params.id, 
      fileId, 
      updateFields
    );

    return NextResponse.json({
      success: true,
      sessionFile: {
        id: updatedSessionFile.id,
        file: {
          id: updatedSessionFile.file.id,
          filename: updatedSessionFile.file.filename,
          fileType: updatedSessionFile.file.file_type,
          fileSize: updatedSessionFile.file.file_size,
          description: updatedSessionFile.file.description,
        },
        category: updatedSessionFile.file_category,
        isRequired: updatedSessionFile.is_required,
        attachedAt: updatedSessionFile.created_at,
      },
    });

  } catch (error) {
    console.error('Update session file error:', error);

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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions/[id]/files/[fileId] - Remove file from session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Check session access
    const { hasAccess, session, userRole } = await checkSessionAccess(
      supabase,
      params.id,
      user.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Parse file ID from request body or URL
    const { fileId } = await request.json().catch(() => ({}));
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Get the session file to check permissions
    const { data: sessionFile, error: sessionFileError } = await supabase
      .from('session_files')
      .select(`
        *,
        file:file_uploads!file_id (
          filename
        )
      `)
      .eq('session_id', params.id)
      .eq('file_id', fileId)
      .single();

    if (sessionFileError || !sessionFile) {
      return NextResponse.json(
        { error: 'Session file not found' },
        { status: 404 }
      );
    }

    // Only allow the person who attached the file or coaches to remove it
    if (sessionFile.uploaded_by !== user.id && userRole !== 'coach' && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'You can only remove files you attached or if you are the coach' },
        { status: 403 }
      );
    }

    // Remove the session file association
    await sessionFilesDatabase.deleteSessionFile(params.id, fileId);

    // Create notification for other session participant
    const otherParticipantId = session.coach_id === user.id ? session.client_id : session.coach_id;
    const currentUserName = userRole === 'coach' ? session.coach.first_name : session.client.first_name;
    
    await supabase.from('notifications').insert({
      user_id: otherParticipantId,
      type: 'system_update',
      title: 'File Removed from Session',
      message: `${currentUserName} removed "${sessionFile.file.filename}" from "${session.title}"`,
      data: {
        type: 'session_file_removed',
        session_id: params.id,
        file_id: fileId,
        removed_by: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'File removed from session successfully',
    });

  } catch (error) {
    console.error('Remove session file error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}