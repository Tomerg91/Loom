import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fileManagementService } from '@/lib/services/file-management-service';
import { headers } from 'next/headers';

// GET /api/files/[id]/download - Download a file with tracking
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let downloadTracker: ((ip?: string, userAgent?: string, fileSize?: number, success?: boolean, failureReason?: string, durationMs?: number) => Promise<string>) | null = null;

  try {
    const params = await context.params;
    // Get authenticated user (optional for shared files)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Get file information
    const fileResult = await fileManagementService.getFile(params.id);
    
    if (!fileResult.success) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    const file = fileResult.data;
    
    // Check permissions
    let hasAccess = false;
    let downloadType = 'direct';
    let shareId: string | undefined;

    if (user && file.userId === user.id) {
      // Owner access
      hasAccess = true;
      downloadType = 'direct';
    } else if (user) {
      // Check if file is shared with user - use shared files method
      const sharedFilesResult = await fileManagementService.getSharedFiles(user.id);
      const validShare = sharedFilesResult.success && sharedFilesResult.data.find(sharedFile => 
        sharedFile.id === params.id
      );
      
      if (validShare) {
        hasAccess = true;
        downloadType = 'permanent_share';
        shareId = validShare.sharedWith?.[0]?.id;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      );
    }

    // Simple download tracking - just increment the download count
    const supabaseClient = await createClient();
    await supabaseClient
      .from('file_uploads')
      .update({ download_count: supabaseClient.raw('download_count + 1') })
      .eq('id', params.id);
    
    downloadTracker = async () => params.id; // Simple stub

    // Get client information
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || 'Unknown';
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || request.ip || 'Unknown';

    try {
      // Get the actual file from storage  
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from(file.bucketName)
        .download(file.storagePath);

      if (downloadError) {
        const duration = Date.now() - startTime;
        // Simplified error tracking
        console.error('Storage download error:', downloadError.message);
        
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      // Log successful download
      console.log('File downloaded successfully:', file.filename);

      // Convert blob to array buffer
      const fileBuffer = await downloadData.arrayBuffer();

      // Return file with proper headers
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': file.fileType,
          'Content-Length': file.fileSize.toString(),
          'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalFilename)}"`,
          'Cache-Control': 'private, max-age=0, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Download-Stats': 'tracked', // Indicates this download was tracked
        },
      });

    } catch (storageError) {
      const duration = Date.now() - startTime;
      if (downloadTracker) {
        // Log storage error
        console.error('Storage error during download:', storageError);
      }
      throw storageError;
    }

  } catch (error) {
    console.error('File download error:', error);

    // Log failed download
    console.error('File download failed:', error);

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