import { rateLimit } from '@/lib/security/rate-limit';

// Rate limiting configurations for different file operations
export const fileUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 uploads per 15 minutes per user
  message: 'Too many file uploads. Please wait before uploading more files.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const fileDownloadRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // 200 downloads per 5 minutes per user
  message: 'Too many file downloads. Please wait before downloading more files.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const fileModificationRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // 100 modifications per 10 minutes per user
  message: 'Too many file modifications. Please wait before making more changes.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const fileDeletionRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 deletions per 5 minutes per user
  message: 'Too many file deletions. Please wait before deleting more files.',
  standardHeaders: true,
  legacyHeaders: false,
});