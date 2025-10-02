import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { temporarySharesDatabase } from '@/lib/database/temporary-shares';
import { headers } from 'next/headers';

// GET /api/share/[token] - Access shared file (API endpoint for programmatic access)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password');
    const download = searchParams.get('download') === 'true';

    // Validate access to the share
    const validation = await temporarySharesDatabase.validateShareAccess(
      token,
      password || undefined
    );

    if (!validation.can_access || !validation.file_info || !validation.share_id) {
      // Log failed access attempt
      if (validation.share_id) {
        const headersList = await headers();
        const userAgent = headersList.get('user-agent') || 'Unknown';
        const forwardedFor = headersList.get('x-forwarded-for');
        const realIp = headersList.get('x-real-ip');
        const ipAddress = forwardedFor?.split(',')[0] || realIp || request.ip || 'Unknown';

        await temporarySharesDatabase.logShareAccess({
          share_id: validation.share_id,
          ip_address: ipAddress,
          user_agent: userAgent,
          access_type: download ? 'download' : 'view',
          success: false,
          failure_reason: validation.failure_reason || 'Access denied',
        });
      }

      return NextResponse.json(
        { 
          error: validation.failure_reason || 'Access denied',
          can_access: false,
          password_required: validation.failure_reason === 'Invalid password'
        },
        { status: 403 }
      );
    }

    const fileInfo = validation.file_info;
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || 'Unknown';
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || request.ip || 'Unknown';

    if (download) {
      // Handle file download
      try {
        const supabase = await createClient();
        
        // Get the actual file from storage
        const { data: downloadData, error: downloadError } = await supabase.storage
          .from('uploads')
          .download(fileInfo.storage_path);

        if (downloadError) {
          throw new Error(`Failed to download file: ${downloadError.message}`);
        }

        // Log successful download
        await temporarySharesDatabase.logShareAccess({
          share_id: validation.share_id,
          ip_address: ipAddress,
          user_agent: userAgent,
          access_type: 'download',
          success: true,
          bytes_served: fileInfo.file_size,
        });

        // Convert blob to array buffer
        const fileBuffer = await downloadData.arrayBuffer();

        // Return file with proper headers
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': fileInfo.file_type,
            'Content-Length': fileInfo.file_size.toString(),
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileInfo.original_filename)}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });

      } catch (error) {
        // Log failed download
        await temporarySharesDatabase.logShareAccess({
          share_id: validation.share_id,
          ip_address: ipAddress,
          user_agent: userAgent,
          access_type: 'download',
          success: false,
          failure_reason: error instanceof Error ? error.message : 'Download failed',
        });

        return NextResponse.json(
          { error: 'Failed to download file' },
          { status: 500 }
        );
      }
    } else {
      // Handle file info access (view)
      await temporarySharesDatabase.logShareAccess({
        share_id: validation.share_id,
        ip_address: ipAddress,
        user_agent: userAgent,
        access_type: 'view',
        success: true,
      });

      return NextResponse.json({
        can_access: true,
        file: {
          id: fileInfo.id,
          filename: fileInfo.filename,
          original_filename: fileInfo.original_filename,
          file_type: fileInfo.file_type,
          file_size: fileInfo.file_size,
          created_at: fileInfo.created_at,
          description: fileInfo.description,
        },
        share: {
          expires_at: fileInfo.expires_at,
          max_downloads: fileInfo.max_downloads,
          current_downloads: fileInfo.current_downloads,
        },
      });
    }

  } catch (error) {
    console.error('Share access error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/share/[token] - Access shared file with password in body
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const body = await request.json();
    const { password, download } = body;

    // Create a new URL with the password as a query parameter
    const url = new URL(request.url);
    if (password) url.searchParams.set('password', password);
    if (download) url.searchParams.set('download', 'true');

    // Create a new request object with the updated URL
    const newRequest = new NextRequest(url, {
      method: 'GET',
      headers: request.headers,
    });

    // Reuse the GET logic
    return await GET(newRequest, { params });

  } catch (error) {
    console.error('Share POST access error:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}