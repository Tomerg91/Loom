import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { env } from '@/env';
import {
  HTTP_STATUS,
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
} from '@/lib/api/utils';
import { config } from '@/lib/config';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';

const signRequestSchema = z.object({
  fileName: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name must be 255 characters or fewer'),
  fileSize: z
    .number({ invalid_type_error: 'File size must be a number' })
    .int('File size must be an integer')
    .min(1, 'File size must be greater than zero')
    .max(
      config.file.DOCUMENT_MAX_SIZE,
      `File size must be ${config.file.DOCUMENT_MAX_SIZE} bytes or smaller`
    ),
  contentType: z
    .string()
    .min(1, 'Content type is required')
    .max(120, 'Content type must be 120 characters or fewer'),
});

type AuthActor = { id: string; role: string };

const createUnauthorizedResponse = () =>
  createErrorResponse(
    'Authentication required. Please sign in again.',
    HTTP_STATUS.UNAUTHORIZED
  );

const sanitizeFileName = (fileName: string): string => {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return 'file';
  }

  const segments = trimmed.split('.');
  const extension =
    segments.length > 1 ? `.${segments.pop()!.toLowerCase()}` : '';
  const base = segments.join('.');

  const safeBase = base
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return `${safeBase || 'file'}${extension}`;
};

const resolveBucketName = () => {
  try {
    return (
      env.TASK_ATTACHMENTS_BUCKET ||
      process.env.NEXT_PUBLIC_TASK_ATTACHMENTS_BUCKET ||
      'task-attachments'
    );
  } catch (error) {
    // The env helper throws when server variables are accessed outside a
    // server context (e.g., during isolated unit tests). Falling back to
    // process.env keeps the handler usable in mocked environments while
    // preserving runtime validation in production.
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        'Falling back to process.env for TASK_ATTACHMENTS_BUCKET',
        error
      );
    }
    return (
      process.env.TASK_ATTACHMENTS_BUCKET ||
      process.env.NEXT_PUBLIC_TASK_ATTACHMENTS_BUCKET ||
      'task-attachments'
    );
  }
};

async function getAuthenticatedActor(): Promise<
  { actor: AuthActor } | { response: Response }
> {
  try {
    const supabase = createServerClient();
    const { data: session, error } = await supabase.auth.getUser();

    if (error || !session?.user) {
      return { response: createUnauthorizedResponse() };
    }

    return {
      actor: {
        id: session.user.id,
        role: session.user.role ?? 'client',
      },
    };
  } catch (error) {
    console.error('Attachment sign API authentication error:', error);
    return { response: createUnauthorizedResponse() };
  }
}

export const POST = async (request: NextRequest) => {
  const authResult = await getAuthenticatedActor();
  if ('response' in authResult) {
    return authResult.response;
  }

  const { actor } = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    console.warn('Failed to parse attachment sign payload:', error);
    return createErrorResponse('Invalid JSON body', HTTP_STATUS.BAD_REQUEST);
  }

  const parsed = validateRequestBody(signRequestSchema, body);

  if (!parsed.success) {
    return createErrorResponse(parsed.error, HTTP_STATUS.BAD_REQUEST);
  }

  const bucket = resolveBucketName();
  const adminClient = createAdminClient();
  const sanitizedName = sanitizeFileName(parsed.data.fileName);
  const datePrefix = new Date().toISOString().slice(0, 10);
  const objectPath = `${actor.id}/${datePrefix}/${randomUUID()}-${sanitizedName}`;

  const { data: uploadData, error: uploadError } = await adminClient.storage
    .from(bucket)
    .createSignedUploadUrl(objectPath, { upsert: false });

  if (uploadError || !uploadData?.signedUrl) {
    console.error('Failed to create signed upload URL:', uploadError);
    return createErrorResponse(
      'Unable to generate upload URL. Please try again.',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  const { data: publicUrlData } = adminClient.storage
    .from(bucket)
    .getPublicUrl(objectPath);

  return createSuccessResponse(
    {
      uploadUrl: uploadData.signedUrl,
      token: uploadData.token,
      path: uploadData.path ?? objectPath,
      bucket,
      fileName: sanitizedName,
      publicUrl: publicUrlData?.publicUrl ?? null,
      fileSize: parsed.data.fileSize,
      contentType: parsed.data.contentType,
    },
    'Signed upload URL generated successfully',
    HTTP_STATUS.CREATED
  );
};
