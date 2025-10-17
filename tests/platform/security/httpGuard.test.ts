import { describe, expect, it } from 'vitest';

import {
  ForbiddenSupabaseHttpError,
  ensureNoSupabaseHttpUsage,
  findForbiddenSupabaseHttpReference,
} from '@/modules/platform/security/httpGuard';

describe('Supabase HTTP guard', () => {
  it('returns null when no forbidden references are present', () => {
    const payload = {
      text: 'hello world',
      nested: { value: 'safe' },
      list: ['http://example.com', 42],
    };

    expect(findForbiddenSupabaseHttpReference(payload)).toBeNull();
    expect(() => ensureNoSupabaseHttpUsage(payload)).not.toThrow();
  });

  it('detects forbidden references within nested payloads', () => {
    const payload = {
      params: {
        sql: "select * from net.http_get('https://example.com')",
      },
    };

    const details = findForbiddenSupabaseHttpReference(payload);
    expect(details).not.toBeNull();
    expect(details?.match).toBe('net.http_get');
    expect(details?.path).toEqual(['params', 'sql']);
    expect(() => ensureNoSupabaseHttpUsage(payload)).toThrow(
      ForbiddenSupabaseHttpError
    );
  });

  it('detects forbidden references in arrays', () => {
    const payload = ['safe', 'NET.HTTP_POST'];

    const details = findForbiddenSupabaseHttpReference(payload);
    expect(details).not.toBeNull();
    expect(details?.match).toBe('net.http_post');
    expect(details?.path).toEqual([1]);
  });
});
