import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fileDatabase } from '@/lib/database/files';
import { fileOptimizationService } from '@/lib/services/file-optimization';
import { fileModificationRateLimit } from '@/lib/security/file-rate-limit';
import { z } from 'zod';

// Validation schema
const optimizeSchema = z.object({
  maxWidth: z.number().int().min(100).max(4096).optional(),
  maxHeight: z.number().int().min(100).max(4096).optional(),
  quality: z.number().int().min(1).max(100).optional(),
  format: z.enum(['jpeg', 'png', 'webp']).optional(),
  stripMetadata: z.boolean().optional(),
  createNewVersion: z.boolean().default(true),
  description: z.string().max(500).optional(),
});

// POST /api/files/[id]/optimize - Optimize a file
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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
        { error: 'You can only optimize files you own' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = optimizeSchema.parse(body);

    // Get the current file from storage
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('uploads')
      .download(file.storage_path);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    const fileBuffer = Buffer.from(await downloadData.arrayBuffer());

    // Check if file type is optimizable
    const optimizableTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain', 'text/html', 'text/css', 'text/javascript',
    ];

    if (!optimizableTypes.includes(file.file_type)) {
      return NextResponse.json(
        { error: 'File type is not optimizable' },
        { status: 400 }
      );
    }

    // Get optimization recommendations first
    const recommendations = await fileOptimizationService.getOptimizationRecommendations(
      file.file_size,
      file.file_type
    );

    if (!recommendations.shouldOptimize && recommendations.priority === 'low') {
      return NextResponse.json({
        optimized: false,
        message: 'File is already well optimized',
        recommendations: recommendations.recommendations,
        original_size: file.file_size,
        estimated_savings: recommendations.estimatedSavings,
      });
    }

    // Perform optimization
    const optimizationOptions = {
      maxWidth: validatedData.maxWidth,
      maxHeight: validatedData.maxHeight,
      quality: validatedData.quality,
      format: validatedData.format,
      stripMetadata: validatedData.stripMetadata,
    };

    const result = await fileOptimizationService.optimizeFile(
      fileBuffer,
      file.file_type,
      optimizationOptions
    );

    // If optimization didn't reduce size significantly, return original
    if (!result.optimized || result.compressionRatio < 0.05) {
      return NextResponse.json({
        optimized: false,
        message: 'No significant optimization possible',
        original_size: result.originalSize,
        potential_size: result.optimizedSize,
        compression_ratio: result.compressionRatio,
        recommendations: recommendations.recommendations,
      });
    }

    // Upload optimized file to storage
    const timestamp = Date.now();
    const fileExtension = file.filename.split('.').pop();
    const optimizedStoragePath = `optimized/${id}/${timestamp}.${fileExtension}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(optimizedStoragePath, result.optimizedBuffer, {
        contentType: file.file_type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload optimized file: ${uploadError.message}`);
    }

    let versionId: string | null = null;

    // Create new version if requested
    if (validatedData.createNewVersion) {
      const { fileVersionsDatabase } = await import('@/lib/database/file-versions');
      
      const newVersion = await fileVersionsDatabase.createFileVersion({
        file_id: id,
        storage_path: uploadData.path,
        filename: file.filename,
        original_filename: file.original_filename,
        file_type: file.file_type,
        file_size: result.optimizedSize,
        description: validatedData.description || 'Optimized version',
        change_summary: `File optimized: ${(result.compressionRatio * 100).toFixed(1)}% size reduction`,
        is_major_version: false,
        created_by: user.id,
      });

      versionId = newVersion.id;
    } else {
      // Update existing file record
      await fileDatabase.updateFileUpload(id, {
        filename: file.filename,
        file_type: file.file_type,
        file_size: result.optimizedSize,
        storage_path: uploadData.path,
      });
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'file_optimized',
      title: 'File Optimized',
      message: `File "${file.filename}" was optimized, saving ${(result.compressionRatio * 100).toFixed(1)}% in size`,
      data: {
        type: 'file_optimization',
        file_id: id,
        version_id: versionId,
        original_size: result.originalSize,
        optimized_size: result.optimizedSize,
        compression_ratio: result.compressionRatio,
      },
    });

    return NextResponse.json({
      success: true,
      optimized: true,
      original_size: result.originalSize,
      optimized_size: result.optimizedSize,
      compression_ratio: result.compressionRatio,
      size_saved: result.originalSize - result.optimizedSize,
      format: result.format,
      metadata: result.metadata,
      version_created: validatedData.createNewVersion,
      version_id: versionId,
      message: `File optimized successfully! Saved ${((result.compressionRatio) * 100).toFixed(1)}% in size.`,
    });

  } catch (error) {
    console.error('File optimization error:', error);

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

// GET /api/files/[id]/optimize - Get optimization recommendations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // Get optimization recommendations
    const recommendations = await fileOptimizationService.getOptimizationRecommendations(
      file.file_size,
      file.file_type
    );

    // Get file metadata if it's an image
    let metadata = {};
    if (file.file_type.startsWith('image/')) {
      try {
        const { data: downloadData } = await supabase.storage
          .from('uploads')
          .download(file.storage_path);

        if (downloadData) {
          const sharp = (await import('sharp')).default;
          const fileBuffer = Buffer.from(await downloadData.arrayBuffer());
          const imageMetadata = await sharp(fileBuffer).metadata();
          metadata = {
            width: imageMetadata.width,
            height: imageMetadata.height,
            format: imageMetadata.format,
            channels: imageMetadata.channels,
            hasAlpha: imageMetadata.hasAlpha,
          };
        }
      } catch (error) {
        console.error('Failed to get image metadata:', error);
      }
    }

    return NextResponse.json({
      file_id: id,
      filename: file.filename,
      file_type: file.file_type,
      file_size: file.file_size,
      metadata,
      recommendations: {
        should_optimize: recommendations.shouldOptimize,
        suggestions: recommendations.recommendations,
        estimated_savings: recommendations.estimatedSavings,
        priority: recommendations.priority,
        potential_size_reduction: Math.round(file.file_size * recommendations.estimatedSavings),
      },
      optimization_options: {
        available_formats: file.file_type.startsWith('image/') 
          ? ['jpeg', 'png', 'webp'] 
          : [],
        supports_resizing: file.file_type.startsWith('image/'),
        supports_quality_adjustment: file.file_type.startsWith('image/') || file.file_type === 'application/pdf',
        supports_metadata_stripping: file.file_type.startsWith('image/') || file.file_type === 'application/pdf',
      },
    });

  } catch (error) {
    console.error('Get optimization recommendations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}