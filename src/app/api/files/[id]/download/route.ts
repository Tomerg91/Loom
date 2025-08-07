import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fileDatabase } from '@/lib/database/files';
import { downloadTrackingDatabase } from '@/lib/database/download-tracking';
import { headers } from 'next/headers';

// GET /api/files/[id]/download - Download a file with tracking
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  let downloadTracker: ((ip?: string, userAgent?: string, fileSize?: number, success?: boolean, failureReason?: string, durationMs?: number) => Promise<string>) | null = null;

  try {
    // Get authenticated user (optional for shared files)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Get file information
    const file = await fileDatabase.getFileUpload(params.id);
    
    // Check permissions
    let hasAccess = false;
    let downloadType = 'direct';
    let shareId: string | undefined;

    if (user && file.user_id === user.id) {
      // Owner access
      hasAccess = true;
      downloadType = 'direct';
    } else if (user) {
      // Check if file is shared with user
      const shares = await fileDatabase.getFileShares(params.id, user.id);
      const validShare = shares.find(share => 
        share.shared_with === user.id && 
        (!share.expires_at || new Date(share.expires_at) > new Date())
      );
      
      if (validShare) {
        hasAccess = true;
        downloadType = 'permanent_share';
        shareId = validShare.id;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      );
    }

    // Create download tracker
    downloadTracker = await downloadTrackingDatabase.createDownloadTracker({
      file_id: params.id,
      user_id: user?.id,
      download_type: downloadType,
      share_id: shareId,
    });

    // Get client information
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || 'Unknown';
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || request.ip || 'Unknown';

    try {
      // Get the actual file from storage
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('uploads')
        .download(file.storage_path);

      if (downloadError) {
        const duration = Date.now() - startTime;
        await downloadTracker(
          ipAddress,
          userAgent,
          file.file_size,
          false,
          `Storage error: ${downloadError.message}`,
          duration
        );
        
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      // Log successful download
      const duration = Date.now() - startTime;
      await downloadTracker(
        ipAddress,
        userAgent,
        file.file_size,
        true,
        undefined,
        duration
      );

      // Convert blob to array buffer
      const fileBuffer = await downloadData.arrayBuffer();

      // Return file with proper headers
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': file.file_type,
          'Content-Length': file.file_size.toString(),
          'Content-Disposition': `attachment; filename="${encodeURIComponent(file.original_filename)}"`,
          'Cache-Control': 'private, max-age=0, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Download-Stats': 'tracked', // Indicates this download was tracked
        },
      });

    } catch (storageError) {
      const duration = Date.now() - startTime;
      if (downloadTracker) {
        await downloadTracker(
          ipAddress,
          userAgent,
          file.file_size,
          false,
          storageError instanceof Error ? storageError.message : 'Storage error',
          duration
        );
      }
      throw storageError;
    }

  } catch (error) {
    console.error('File download error:', error);

    // Log failed download if tracker was created
    if (downloadTracker) {
      try {
        const headersList = await headers();
        const userAgent = headersList.get('user-agent') || 'Unknown';
        const forwardedFor = headersList.get('x-forwarded-for');
        const realIp = headersList.get('x-real-ip');
        const ipAddress = forwardedFor?.split(',')[0] || realIp || request.ip || 'Unknown';
        const duration = Date.now() - startTime;
        
        await downloadTracker(
          ipAddress,
          userAgent,
          undefined,
          false,
          error instanceof Error ? error.message : 'Download failed',
          duration
        );
      } catch (trackingError) {
        console.error('Failed to log download failure:', trackingError);
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Download failed' },
      { status: 500 }
    );
  }
}

// POST /api/files/[id]/download - Alternative download endpoint with additional options
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { inline = false } = body;

    // Create a modified request for GET with inline parameter
    const url = new URL(request.url);
    if (inline) url.searchParams.set('inline', 'true');

    const newRequest = new NextRequest(url, {
      method: 'GET',
      headers: request.headers,
    });

    // Get the file first to modify headers
    const getResponse = await GET(newRequest, { params });
    
    if (getResponse.ok && inline) {
      // Modify Content-Disposition for inline viewing
      const headers = new Headers(getResponse.headers);
      const contentDisposition = headers.get('Content-Disposition');
      
      if (contentDisposition) {
        const newDisposition = contentDisposition.replace('attachment;', 'inline;');
        headers.set('Content-Disposition', newDisposition);
      }

      // Create new response with modified headers
      const arrayBuffer = await getResponse.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        status: getResponse.status,
        headers: headers,
      });
    }

    return getResponse;

  } catch (error) {
    console.error('File download POST error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}