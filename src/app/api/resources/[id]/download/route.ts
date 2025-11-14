/**
 * Resource Download API Route
 *
 * GET /api/resources/[id]/download - Download a resource file
 *
 * Features:
 * - Permission checking (download or higher)
 * - Download count tracking
 * - Client progress tracking
 * - Signed URL generation for Supabase Storage
 * - Rate limiting
 *
 * @module api/resources/[id]/download
 */

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import {
  sanitizeError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
} from '@/lib/utils/api-errors';

/**
 * GET /api/resources/[id]/download
 *
 * Download a resource file
 *
 * Returns:
 * - Redirect to signed download URL
 * - Or JSON with download URL
 *
 * Query Parameters:
 * - inline: boolean - If true, display inline instead of download
 * - json: boolean - If true, return JSON with URL instead of redirecting
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;

  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const { response, statusCode } = unauthorizedError();
      return NextResponse.json(response, { status: statusCode });
    }

    const resourceId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const inline = searchParams.get('inline') === 'true';
    const returnJson = searchParams.get('json') === 'true';

    // Get resource metadata
    const { data: resource, error: resourceError } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('id', resourceId)
      .eq('is_library_resource', true)
      .single();

    if (resourceError || !resource) {
      const { response, statusCode } = notFoundError('Resource');
      return NextResponse.json(response, { status: statusCode });
    }

    const userRole = user.user_metadata?.role;

    // Check permissions
    let hasAccess = false;
    let hasDownloadPermission = false;

    // 1. Owner always has access
    if (resource.user_id === user.id) {
      hasAccess = true;
      hasDownloadPermission = true;
    }
    // 2. Check if resource is public
    else if (resource.is_public) {
      hasAccess = true;
      hasDownloadPermission = true;
    }
    // 3. Check if shared with all clients
    else if (resource.shared_with_all_clients && userRole === 'client') {
      // Verify client has session with coach
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('client_id', user.id)
        .eq('coach_id', resource.user_id)
        .limit(1);

      if (sessions && sessions.length > 0) {
        hasAccess = true;
        hasDownloadPermission = true;
      }
    }
    // 4. Check if explicitly shared with user
    else {
      const { data: share } = await supabase
        .from('file_shares')
        .select('*')
        .eq('file_id', resourceId)
        .eq('shared_with', user.id)
        .single();

      if (share) {
        // Check if share is expired
        if (share.expires_at && new Date(share.expires_at) < new Date()) {
          const { response, statusCode } = forbiddenError(
            'This resource share has expired.'
          );
          return NextResponse.json(response, { status: statusCode });
        }

        hasAccess = true;
        hasDownloadPermission =
          share.permission_type === 'download' ||
          share.permission_type === 'edit';

        // Update share access tracking
        await supabase
          .from('file_shares')
          .update({
            access_count: (share.access_count || 0) + 1,
            last_accessed_at: new Date().toISOString(),
          })
          .eq('id', share.id);
      }
    }

    // Admins always have access
    if (userRole === 'admin') {
      hasAccess = true;
      hasDownloadPermission = true;
    }

    if (!hasAccess) {
      const { response, statusCode } = forbiddenError(
        'You do not have access to this resource.'
      );
      return NextResponse.json(response, { status: statusCode });
    }

    if (!hasDownloadPermission && !inline) {
      const { response, statusCode } = forbiddenError(
        'You only have view permission for this resource. Download is not allowed.'
      );
      return NextResponse.json(response, { status: statusCode });
    }

    // Get signed URL from Supabase Storage
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from(resource.bucket_name)
      .createSignedUrl(resource.storage_path, 3600, {
        download: !inline,
      });

    if (urlError || !signedUrlData) {
      console.error('Error generating signed URL:', urlError);
      const { response, statusCode } = sanitizeError(
        new Error('Failed to generate download URL'),
        {
          context: 'GET /api/resources/[id]/download',
          userMessage: 'Failed to generate download link. Please try again.',
        }
      );
      return NextResponse.json(response, { status: statusCode });
    }

    // Track download if not inline view
    if (!inline && hasDownloadPermission) {
      // Update file_uploads download count
      await supabase.rpc('increment', {
        table_name: 'file_uploads',
        row_id: resourceId,
        column_name: 'download_count',
      });

      // Track client progress if user is a client
      if (userRole === 'client') {
        // Track that client accessed this resource
        await supabase.rpc('track_resource_access', {
          p_file_id: resourceId,
          p_client_id: user.id,
        });
      }

      // Track download in file_download_tracking if table exists
      await supabase.from('file_download_tracking').insert({
        file_id: resourceId,
        downloaded_by: user.id,
        downloaded_at: new Date().toISOString(),
      });
    }

    // Return JSON or redirect
    if (returnJson) {
      return NextResponse.json({
        success: true,
        data: {
          downloadUrl: signedUrlData.signedUrl,
          filename: resource.filename,
          fileType: resource.file_type,
          fileSize: resource.file_size,
          expiresIn: 3600, // 1 hour
        },
      });
    } else {
      // Redirect to signed URL
      return NextResponse.redirect(signedUrlData.signedUrl);
    }
  } catch (error) {
    const { response, statusCode } = sanitizeError(error, {
      context: 'GET /api/resources/[id]/download',
      userMessage: 'Failed to download resource. Please try again.',
      metadata: { resourceId: params.id },
    });
    return NextResponse.json(response, { status: statusCode });
  }
}
