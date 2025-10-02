import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fileManagementService } from '@/lib/services/file-management-service';
import { downloadTrackingDatabase } from '@/lib/database/download-tracking';
import { fileDownloadRateLimit } from '@/lib/security/file-rate-limit';
import { getCorsHeadersForPublicEndpoint } from '@/lib/security/cors';
import { headers } from 'next/headers';
import { z } from 'zod';

// Validation schema for download options
const downloadOptionsSchema = z.object({
  inline: z.boolean().default(false),
  track_analytics: z.boolean().default(true),
  generate_preview: z.boolean().default(false),
});

// GET /api/files/[id]/download - Download a file with comprehensive tracking
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let downloadId: string | null = null;

  try {
    const params = await context.params;
    
    // Apply rate limiting for downloads
    const rateLimitResult = await fileDownloadRateLimit(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Get authenticated user (optional for shared files)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const inline = searchParams.get('inline') === 'true';
    const trackAnalytics = searchParams.get('track_analytics') !== 'false';
    const generatePreview = searchParams.get('generate_preview') === 'true';
    const token = searchParams.get('token'); // For temporary shares

    // Get file information
    const fileResult = await fileManagementService.getFile(params.id, user?.id);
    
    if (!fileResult.success) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    const file = fileResult.data;
    
    // Check permissions and determine download type
    let hasAccess = false;
    let downloadType = 'unauthorized';
    let shareId: string | undefined;
    let temporaryShareId: string | undefined;

    // Check temporary share access first (if token provided)
    if (token) {
      const { data: temporaryShare } = await supabase
        .from('temporary_shares')
        .select('*')
        .eq('share_token', token)
        .eq('file_id', params.id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (temporaryShare && temporaryShare.current_downloads < temporaryShare.max_downloads) {
        hasAccess = true;
        downloadType = 'temporary_share';
        temporaryShareId = temporaryShare.id;

        // Increment download count for temporary share
        await supabase
          .from('temporary_shares')
          .update({ 
            current_downloads: supabase.raw('current_downloads + 1'),
            updated_at: new Date().toISOString()
          })
          .eq('id', temporaryShare.id);
      }
    }

    // Check owner access
    if (!hasAccess && user && file.userId === user.id) {
      hasAccess = true;
      downloadType = 'owner';
    }

    // Check permanent share access
    if (!hasAccess && user) {
      const sharedFilesResult = await fileManagementService.getSharedFiles(user.id);
      const validShare = sharedFilesResult.success && sharedFilesResult.data.find(sharedFile =>
        sharedFile.id === params.id
      );
      
      if (validShare && validShare.sharedWith?.[0]) {
        hasAccess = true;
        downloadType = 'permanent_share';
        shareId = validShare.sharedWith[0].id;
        
        // Check if user has download permission
        if (validShare.sharedWith[0].permission_type === 'view') {
          return NextResponse.json(
            { error: 'You only have view permission for this file' },
            { status: 403 }
          );
        }
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      );
    }

    // Get client information for tracking
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || 'Unknown';
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || request.ip || 'Unknown';
    const referer = headersList.get('referer');

    // Start download tracking if enabled
    if (trackAnalytics) {
      downloadId = await downloadTrackingDatabase.startDownload({
        fileId: params.id,
        userId: user?.id || null,
        ipAddress,
        userAgent,
        downloadType,
        shareId,
        temporaryShareId,
        referer: referer || null,
      });
    }

    try {
      // Security check: Validate file path to prevent directory traversal
      if (file.storagePath.includes('..') || file.storagePath.startsWith('/')) {
        throw new Error('Invalid file path detected');
      }

      // Get the actual file from storage
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from(file.bucketName)
        .download(file.storagePath);

      if (downloadError) {
        throw new Error(`Storage error: ${downloadError.message}`);
      }

      // Convert blob to array buffer
      const fileBuffer = await downloadData.arrayBuffer();

      // Verify file integrity (basic check)
      if (fileBuffer.byteLength === 0) {
        throw new Error('Downloaded file is empty');
      }

      if (fileBuffer.byteLength !== file.fileSize) {
        console.warn(`File size mismatch: expected ${file.fileSize}, got ${fileBuffer.byteLength}`);
      }

      // Update download count
      await supabase
        .from('file_uploads')
        .update({ download_count: supabase.raw('download_count + 1') })
        .eq('id', params.id);

      // Complete download tracking
      if (downloadId) {
        const duration = Date.now() - startTime;
        await downloadTrackingDatabase.completeDownload(downloadId, {
          success: true,
          fileSizeBytes: fileBuffer.byteLength,
          durationMs: duration,
        });
      }

      // Generate appropriate Content-Disposition header
      const disposition = inline ? 'inline' : 'attachment';
      const filename = file.originalFilename || file.filename;
      const encodedFilename = encodeURIComponent(filename);

      // Set security headers
      const responseHeaders = new Headers({
        'Content-Type': file.fileType,
        'Content-Length': fileBuffer.byteLength.toString(),
        'Content-Disposition': `${disposition}; filename*=UTF-8''${encodedFilename}; filename="${encodedFilename}"`,
        'Cache-Control': 'private, max-age=300, no-cache, no-store, must-revalidate', // 5 min cache for inline
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-Download-Stats': trackAnalytics ? 'tracked' : 'not-tracked',
        'X-Download-Type': downloadType,
      });

      // Add CSP for inline content
      if (inline) {
        responseHeaders.set('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'");
      }

      // Add secure CORS headers for temporary shares (restricted to allowed origins)
      if (downloadType === 'temporary_share') {
        const corsHeaders = getCorsHeadersForPublicEndpoint();
        Object.entries(corsHeaders).forEach(([key, value]) => {
          responseHeaders.set(key, value);
        });
      }

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: responseHeaders,
      });

    } catch (storageError) {
      const duration = Date.now() - startTime;
      const errorMessage = storageError instanceof Error ? storageError.message : 'Storage error';
      
      // Track failed download
      if (downloadId) {
        await downloadTrackingDatabase.completeDownload(downloadId, {
          success: false,
          failureReason: errorMessage,
          durationMs: duration,
        });
      }

      console.error('Storage error during download:', storageError);
      throw new Error(`Download failed: ${errorMessage}`);
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Track failed download if we have a download ID
    if (downloadId) {
      await downloadTrackingDatabase.completeDownload(downloadId, {
        success: false,
        failureReason: errorMessage,
        durationMs: duration,
      });
    }

    console.error('File download error:', error);

    // Return appropriate error response
    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    if (errorMessage.includes('access denied') || errorMessage.includes('permission')) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    );
  }
}

// POST /api/files/[id]/download - Enhanced download endpoint with additional options
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();
    const validatedOptions = downloadOptionsSchema.parse(body);

    // Create a modified request for GET with query parameters
    const url = new URL(request.url);
    if (validatedOptions.inline) {
      url.searchParams.set('inline', 'true');
    }
    if (!validatedOptions.track_analytics) {
      url.searchParams.set('track_analytics', 'false');
    }
    if (validatedOptions.generate_preview) {
      url.searchParams.set('generate_preview', 'true');
    }

    const newRequest = new NextRequest(url, {
      method: 'GET',
      headers: request.headers,
    });

    // Call the GET method with the modified request
    const getResponse = await GET(newRequest, { params });
    
    return getResponse;

  } catch (error) {
    console.error('File download POST error:', error);

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
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}