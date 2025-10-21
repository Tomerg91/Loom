import { NextRequest, NextResponse } from 'next/server';

import { checkRateLimit, getRateLimitKey } from '@/lib/security/rate-limit';

// Rate limiting configurations for different file operations
export async function fileUploadRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const key = getRateLimitKey(request);
  const result = checkRateLimit(key, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 uploads per 15 minutes per user
    message: 'Too many file uploads. Please wait before uploading more files.',
  });

  if (!result.allowed) {
    return NextResponse.json(
      { success: false, error: result.message },
      { status: 429 }
    );
  }
  
  return null;
}

export async function fileDownloadRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const key = getRateLimitKey(request);
  const result = checkRateLimit(key, {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 200, // 200 downloads per 5 minutes per user
    message: 'Too many file downloads. Please wait before downloading more files.',
  });

  if (!result.allowed) {
    return NextResponse.json(
      { success: false, error: result.message },
      { status: 429 }
    );
  }
  
  return null;
}

export async function fileModificationRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const key = getRateLimitKey(request);
  const result = checkRateLimit(key, {
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // 100 modifications per 10 minutes per user
    message: 'Too many file modifications. Please wait before making more changes.',
  });

  if (!result.allowed) {
    return NextResponse.json(
      { success: false, error: result.message },
      { status: 429 }
    );
  }
  
  return null;
}

export async function fileDeletionRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const key = getRateLimitKey(request);
  const result = checkRateLimit(key, {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 deletions per 5 minutes per user
    message: 'Too many file deletions. Please wait before deleting more files.',
  });

  if (!result.allowed) {
    return NextResponse.json(
      { success: false, error: result.message },
      { status: 429 }
    );
  }
  
  return null;
}