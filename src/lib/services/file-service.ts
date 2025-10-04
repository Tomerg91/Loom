import { ApiError } from '@/lib/api/errors';
import { createClient } from '@/lib/supabase/server';

interface FileValidationOptions {
  maxSize: number;
  allowedTypes: string[];
}

interface FileUploadOptions {
  directory: string;
  userId: string;
  resize?: {
    width: number;
    height: number;
    format: string;
  };
}

interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

interface FileUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  retryable?: boolean;
}

enum StorageErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

class FileService {
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000;

  private classifyStorageError(error: any): {
    type: StorageErrorType;
    retryable: boolean;
  } {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.error_code || error?.code || '';

    // Network-related errors (retryable)
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection')
    ) {
      return { type: StorageErrorType.NETWORK_ERROR, retryable: true };
    }

    // Storage quota exceeded
    if (
      errorMessage.includes('quota') ||
      errorMessage.includes('storage limit') ||
      errorCode === 'INSUFFICIENT_STORAGE'
    ) {
      return { type: StorageErrorType.QUOTA_EXCEEDED, retryable: false };
    }

    // Permission denied
    if (
      errorMessage.includes('permission') ||
      errorMessage.includes('unauthorized') ||
      errorCode === 'UNAUTHORIZED'
    ) {
      return { type: StorageErrorType.PERMISSION_DENIED, retryable: false };
    }

    // File too large
    if (
      errorMessage.includes('file size') ||
      errorMessage.includes('too large') ||
      errorCode === 'PAYLOAD_TOO_LARGE'
    ) {
      return { type: StorageErrorType.FILE_TOO_LARGE, retryable: false };
    }

    // Invalid file type
    if (
      errorMessage.includes('file type') ||
      errorMessage.includes('invalid format') ||
      errorCode === 'INVALID_FILE_TYPE'
    ) {
      return { type: StorageErrorType.INVALID_FILE_TYPE, retryable: false };
    }

    // Storage service unavailable (retryable)
    if (
      errorMessage.includes('service unavailable') ||
      errorMessage.includes('server error') ||
      errorCode === 'SERVICE_UNAVAILABLE'
    ) {
      return { type: StorageErrorType.STORAGE_UNAVAILABLE, retryable: true };
    }

    // Default: unknown error (potentially retryable)
    return { type: StorageErrorType.UNKNOWN_ERROR, retryable: true };
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getUserFriendlyErrorMessage(errorType: StorageErrorType): string {
    switch (errorType) {
      case StorageErrorType.NETWORK_ERROR:
        return 'Network connection error. Please check your internet connection and try again.';
      case StorageErrorType.QUOTA_EXCEEDED:
        return 'Storage quota exceeded. Please contact support or upgrade your plan.';
      case StorageErrorType.PERMISSION_DENIED:
        return 'Permission denied. You do not have access to upload files to this location.';
      case StorageErrorType.FILE_TOO_LARGE:
        return 'File is too large. Please choose a smaller file and try again.';
      case StorageErrorType.INVALID_FILE_TYPE:
        return 'File type not allowed. Please choose a supported file format.';
      case StorageErrorType.STORAGE_UNAVAILABLE:
        return 'Storage service is temporarily unavailable. Please try again in a few moments.';
      case StorageErrorType.UNKNOWN_ERROR:
      default:
        return 'An unexpected error occurred during file upload. Please try again.';
    }
  }

  validateFile(
    file: File,
    options: FileValidationOptions
  ): FileValidationResult {
    try {
      // Check file size
      if (file.size > options.maxSize) {
        return {
          isValid: false,
          error: `File size exceeds ${Math.round(options.maxSize / 1024 / 1024)}MB limit`,
        };
      }

      // Check file type
      const isValidType = options.allowedTypes.some(type => {
        if (type.endsWith('/*')) {
          const category = type.split('/')[0];
          return file.type.startsWith(category + '/');
        }
        return file.type === type;
      });

      if (!isValidType) {
        return {
          isValid: false,
          error: `File type ${file.type} is not allowed`,
        };
      }

      return { isValid: true };
    } catch (_error) {
      return {
        isValid: false,
        error: 'File validation failed',
      };
    }
  }

  async uploadFile(
    file: File,
    options: FileUploadOptions
  ): Promise<FileUploadResult> {
    try {
      // 1. Validate file content and scan for malware
      const virusScanResult = await this.scanForViruses(file);
      if (!virusScanResult.safe) {
        return {
          success: false,
          error: 'File failed security scan',
        };
      }

      // 2. Additional content validation
      const contentValidation = await this.validateFileContent(file);
      if (!contentValidation.isValid) {
        return {
          success: false,
          error: contentValidation.error,
        };
      }

      // 3. Generate secure filename
      const fileName = await this.generateSecureFileName(file, options);

      // 4. Upload to Supabase Storage (production implementation)
      const uploadResult = await this.uploadToSupabaseStorage(
        file,
        fileName,
        options
      );

      return uploadResult;
    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: 'File upload failed',
      };
    }
  }

  private async scanForViruses(
    file: File
  ): Promise<{ safe: boolean; details?: string }> {
    try {
      // Use the comprehensive virus scanning service
      const { virusScanningService } = await import('./virus-scanning-service');

      const scanResult = await virusScanningService.scanFile(file, {
        scanProvider:
          process.env.NODE_ENV === 'production' ? undefined : 'local',
        maxScanTimeMs: 30000, // 30 seconds timeout
      });

      // If file is not safe, quarantine it
      if (!scanResult.safe) {
        try {
          const supabase = await createClient();
          const fileBuffer = await file.arrayBuffer();
          const crypto = await import('crypto');
          const fileHash = crypto
            .createHash('sha256')
            .update(Buffer.from(fileBuffer))
            .digest('hex');

          // Call quarantine function
          await supabase.rpc('quarantine_file', {
            p_file_hash: fileHash,
            p_file_name: file.name,
            p_file_size: file.size,
            p_file_type: file.type,
            p_threat_name: scanResult.threatName || 'Unknown threat',
            p_scan_provider: scanResult.scanProvider || 'local',
            p_scan_details: scanResult.details || 'No details available',
          });

          console.warn(
            `File quarantined: ${file.name} - ${scanResult.threatName}`
          );
        } catch (quarantineError) {
          console.error('Failed to quarantine file:', quarantineError);
        }
      }

      return {
        safe: scanResult.safe,
        details:
          scanResult.details ||
          (scanResult.safe ? 'File passed virus scan' : 'Threat detected'),
      };
    } catch (error) {
      console.error('Virus scan error:', error);

      // In case of scan failure, be conservative and reject the file
      return {
        safe: false,
        details: `Virus scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async validateFileContent(
    file: File
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Validate that image files have proper headers
      if (file.type.startsWith('image/')) {
        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        // Check file signatures (magic numbers)
        const isValidImage = this.validateImageSignature(uint8Array, file.type);
        if (!isValidImage) {
          return { isValid: false, error: 'Invalid image file format' };
        }
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'File content validation failed' };
    }
  }

  private validateImageSignature(bytes: Uint8Array, mimeType: string): boolean {
    // Check common image file signatures
    const signatures = {
      'image/jpeg': [0xff, 0xd8, 0xff],
      'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header
      'image/gif': [0x47, 0x49, 0x46, 0x38], // GIF8
    };

    const signature = signatures[mimeType as keyof typeof signatures];
    if (!signature) return true; // Allow unknown types

    return signature.every((byte, index) => bytes[index] === byte);
  }

  private async generateSecureFileName(
    file: File,
    options: FileUploadOptions
  ): Promise<string> {
    // Generate cryptographically secure filename
    const timestamp = Date.now();
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const randomString = Array.from(randomBytes, byte =>
      byte.toString(16).padStart(2, '0')
    ).join('');

    // Get file extension safely
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const sanitizedExtension = extension.replace(/[^a-z0-9]/g, '');

    return `${options.directory}/${options.userId}/${timestamp}-${randomString}.${sanitizedExtension}`;
  }

  private async uploadToSupabaseStorage(
    file: File,
    fileName: string,
    options: FileUploadOptions
  ): Promise<FileUploadResult> {
    let lastError: any = null;

    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        // Get the Supabase client
        const supabase = await createClient();

        // Convert File to ArrayBuffer for Supabase Storage
        const fileBuffer = await file.arrayBuffer();

        // Determine the bucket name based on file type and directory
        const bucketName = this.getBucketName(options.directory);

        // Upload to Supabase Storage
        const { error } = await supabase.storage
          .from(bucketName)
          .upload(fileName, fileBuffer, {
            contentType: file.type,
            cacheControl: '3600', // Cache for 1 hour
            upsert: false, // Don't overwrite existing files
          });

        if (error) {
          lastError = error;

          // Classify the error to determine if we should retry
          const { type, retryable } = this.classifyStorageError(error);

          console.error(
            `Supabase storage upload error (attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS}):`,
            {
              error,
              type,
              retryable,
            }
          );

          // If error is not retryable, fail immediately
          if (!retryable) {
            return {
              success: false,
              error: this.getUserFriendlyErrorMessage(type),
              retryable: false,
            };
          }

          // If this was the last attempt, fail with the classified error
          if (attempt === this.MAX_RETRY_ATTEMPTS) {
            return {
              success: false,
              error: this.getUserFriendlyErrorMessage(type),
              retryable: retryable,
            };
          }

          // Wait before retrying (exponential backoff)
          await this.sleep(this.RETRY_DELAY_MS * Math.pow(2, attempt - 1));
          continue;
        }

        // Success - get the public URL for the uploaded file
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);

        console.log(
          `File uploaded successfully on attempt ${attempt}:`,
          fileName
        );

        return {
          success: true,
          url: publicUrlData.publicUrl,
          retryable: false,
        };
      } catch (error) {
        lastError = error;

        // Classify the error to determine if we should retry
        const { type, retryable } = this.classifyStorageError(error);

        console.error(
          `Supabase upload error (attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS}):`,
          {
            error,
            type,
            retryable,
          }
        );

        // If error is not retryable, fail immediately
        if (!retryable) {
          return {
            success: false,
            error: this.getUserFriendlyErrorMessage(type),
            retryable: false,
          };
        }

        // If this was the last attempt, fail
        if (attempt === this.MAX_RETRY_ATTEMPTS) {
          return {
            success: false,
            error: this.getUserFriendlyErrorMessage(type),
            retryable: retryable,
          };
        }

        // Wait before retrying (exponential backoff)
        await this.sleep(this.RETRY_DELAY_MS * Math.pow(2, attempt - 1));
      }
    }

    // Fallback (should not reach here)
    const { type } = this.classifyStorageError(lastError);
    return {
      success: false,
      error: this.getUserFriendlyErrorMessage(type),
      retryable: false,
    };
  }

  private getBucketName(directory: string): string {
    // Map directories to appropriate Supabase Storage buckets
    switch (directory) {
      case 'avatars':
        return 'avatars';
      case 'documents':
        return 'documents';
      case 'sessions':
        return 'session-files';
      case 'uploads':
      default:
        return 'uploads';
    }
  }

  async deleteFile(url: string): Promise<void> {
    try {
      // Extract bucket name and file path from the URL
      const urlParts = new URL(url);
      const pathParts = urlParts.pathname.split('/');

      // Expected format: /storage/v1/object/public/{bucketName}/{filePath}
      const bucketIndex = pathParts.indexOf('public') + 1;
      if (bucketIndex === 0 || bucketIndex >= pathParts.length) {
        throw new Error('Invalid storage URL format');
      }

      const bucketName = pathParts[bucketIndex];
      const filePath = pathParts.slice(bucketIndex + 1).join('/');

      // Get the Supabase client
      const supabase = await createClient();

      // Delete the file from Supabase Storage
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        console.error('Supabase storage deletion error:', error);
        throw new ApiError(
          'FILE_DELETE_FAILED',
          error.message || 'Failed to delete file from storage'
        );
      }

      console.log('File deleted successfully:', filePath);
    } catch (error) {
      console.error('File deletion error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        'FILE_DELETE_FAILED',
        error instanceof Error ? error.message : 'Failed to delete file'
      );
    }
  }

  async getFileMetadata(
    url: string
  ): Promise<{ size: number; lastModified: Date } | null> {
    try {
      // Extract bucket name and file path from the URL
      const urlParts = new URL(url);
      const pathParts = urlParts.pathname.split('/');

      const bucketIndex = pathParts.indexOf('public') + 1;
      if (bucketIndex === 0 || bucketIndex >= pathParts.length) {
        return null;
      }

      const bucketName = pathParts[bucketIndex];
      const filePath = pathParts.slice(bucketIndex + 1).join('/');

      // Get the Supabase client
      const supabase = await createClient();

      // Get file info from Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(filePath.split('/').slice(0, -1).join('/'), {
          search: filePath.split('/').pop(),
        });

      if (error || !data || data.length === 0) {
        return null;
      }

      const fileInfo = data[0];
      return {
        size: fileInfo.metadata?.size || 0,
        lastModified: new Date(fileInfo.updated_at || fileInfo.created_at),
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return null;
    }
  }

  async createSignedUrl(
    url: string,
    expiresIn: number = 3600
  ): Promise<string | null> {
    try {
      // Extract bucket name and file path from the URL
      const urlParts = new URL(url);
      const pathParts = urlParts.pathname.split('/');

      const bucketIndex = pathParts.indexOf('public') + 1;
      if (bucketIndex === 0 || bucketIndex >= pathParts.length) {
        return null;
      }

      const bucketName = pathParts[bucketIndex];
      const filePath = pathParts.slice(bucketIndex + 1).join('/');

      // Get the Supabase client
      const supabase = await createClient();

      // Create a signed URL for secure access
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
  }
}

export const fileService = new FileService();
