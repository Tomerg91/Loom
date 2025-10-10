/**
 * Server-Side File Validation Utilities
 *
 * Provides comprehensive file validation for uploads:
 * - File type/MIME type validation
 * - File size limits
 * - Filename sanitization
 * - Security checks (malicious files, path traversal)
 *
 * @module lib/utils/file-validation
 */

/**
 * Allowed MIME types for resource uploads
 */
const ALLOWED_MIME_TYPES = {
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'text/csv': ['.csv'],

  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],

  // Audio
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'audio/mp4': ['.m4a'],

  // Video
  'video/mp4': ['.mp4'],
  'video/mpeg': ['.mpeg'],
  'video/quicktime': ['.mov'],
  'video/webm': ['.webm'],

  // Archives
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/x-7z-compressed': ['.7z'],
} as const;

/**
 * Maximum file size in bytes (100MB)
 */
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Dangerous file extensions that should never be allowed
 */
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.app', '.deb', '.rpm', '.dmg', '.pkg', '.sh', '.bash', '.ps1',
  '.msi', '.dll', '.so', '.dylib',
];

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
  fileExtension?: string;
  mimeType?: string;
}

/**
 * Validate uploaded file
 *
 * Performs comprehensive validation:
 * 1. Checks file size
 * 2. Validates MIME type
 * 3. Checks for dangerous extensions
 * 4. Sanitizes filename
 * 5. Validates filename against MIME type
 *
 * @param file - File to validate
 * @returns Validation result with sanitized filename
 */
export function validateUploadedFile(file: File): FileValidationResult {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Validate file size
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${sizeMB}MB`
    };
  }

  // Validate MIME type
  const mimeType = file.type;
  if (!mimeType) {
    return { valid: false, error: 'File type could not be determined' };
  }

  if (!(mimeType in ALLOWED_MIME_TYPES)) {
    return {
      valid: false,
      error: `File type "${mimeType}" is not allowed. Please upload a supported file type.`
    };
  }

  // Extract and validate file extension
  const originalFilename = file.name;
  const fileExtension = getFileExtension(originalFilename);

  if (!fileExtension) {
    return { valid: false, error: 'File has no extension' };
  }

  // Check for dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(fileExtension.toLowerCase())) {
    return {
      valid: false,
      error: 'File type is not allowed for security reasons'
    };
  }

  // Validate extension matches MIME type
  const allowedExtensions = ALLOWED_MIME_TYPES[mimeType as keyof typeof ALLOWED_MIME_TYPES];
  if (!allowedExtensions.includes(fileExtension.toLowerCase())) {
    return {
      valid: false,
      error: `File extension "${fileExtension}" does not match the file type "${mimeType}"`
    };
  }

  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(originalFilename);
  if (!sanitizedFilename) {
    return { valid: false, error: 'Invalid filename' };
  }

  // All validations passed
  return {
    valid: true,
    sanitizedFilename,
    fileExtension,
    mimeType,
  };
}

/**
 * Sanitize filename to prevent security issues
 *
 * Removes:
 * - Path traversal attempts (../, ..\)
 * - Special characters that could cause issues
 * - Leading/trailing dots and spaces
 * - Control characters
 *
 * @param filename - Original filename
 * @returns Sanitized filename or null if invalid
 */
export function sanitizeFilename(filename: string): string | null {
  if (!filename || typeof filename !== 'string') {
    return null;
  }

  // Remove any path components (prevent path traversal)
  let sanitized = filename.replace(/^.*[\\\/]/, '');

  // Remove or replace dangerous characters
  sanitized = sanitized
    .replace(/\.\./g, '') // Remove .. (path traversal)
    .replace(/[<>:"|?*\x00-\x1F]/g, '') // Remove special chars and control chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .trim();

  // Remove leading/trailing dots and underscores
  sanitized = sanitized.replace(/^[._]+|[._]+$/g, '');

  // Ensure filename is not empty after sanitization
  if (sanitized.length === 0) {
    return null;
  }

  // Ensure filename doesn't exceed reasonable length (255 chars is filesystem limit)
  if (sanitized.length > 255) {
    // Preserve extension while truncating
    const ext = getFileExtension(sanitized);
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    const maxNameLength = 255 - (ext ? ext.length : 0);
    sanitized = nameWithoutExt.substring(0, maxNameLength) + ext;
  }

  return sanitized;
}

/**
 * Get file extension from filename
 *
 * @param filename - Filename to extract extension from
 * @returns File extension (including dot) or empty string
 */
export function getFileExtension(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return '';
  }

  return filename.substring(lastDotIndex);
}

/**
 * Get human-readable file size
 *
 * @param bytes - File size in bytes
 * @returns Formatted file size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Check if file extension is allowed
 *
 * @param extension - File extension (with or without dot)
 * @returns True if extension is allowed
 */
export function isExtensionAllowed(extension: string): boolean {
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  const extLower = ext.toLowerCase();

  // Check if extension is in dangerous list
  if (DANGEROUS_EXTENSIONS.includes(extLower)) {
    return false;
  }

  // Check if extension is in allowed MIME types
  return Object.values(ALLOWED_MIME_TYPES).some(exts =>
    exts.includes(extLower)
  );
}

/**
 * Get allowed file types for display (e.g., in file input accept attribute)
 *
 * @returns Comma-separated list of allowed extensions
 */
export function getAllowedFileTypes(): string {
  const allExtensions = Object.values(ALLOWED_MIME_TYPES).flat();
  return allExtensions.join(',');
}

/**
 * Get allowed MIME types for validation
 *
 * @returns Array of allowed MIME types
 */
export function getAllowedMimeTypes(): string[] {
  return Object.keys(ALLOWED_MIME_TYPES);
}
