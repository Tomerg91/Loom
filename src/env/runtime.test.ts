import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const loadRuntime = async () => {
  vi.resetModules();
  return await import('./runtime.js');
};

describe('env runtime fallbacks', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_PUBLIC_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('prefers SUPABASE_PUBLISHABLE_KEY when present', async () => {
    process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_key';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    const runtime = await loadRuntime();

    expect(runtime.clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe(
      'sb_publishable_key'
    );
  });

  it('falls back to SUPABASE_ANON_KEY when publishable key is missing', async () => {
    process.env.SUPABASE_ANON_KEY = 'sb_anon_key';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    const runtime = await loadRuntime();

    expect(runtime.clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('sb_anon_key');
  });

  it('falls back to SUPABASE_PUBLIC_ANON_KEY when publishable key is missing', async () => {
    process.env.SUPABASE_PUBLIC_ANON_KEY = 'sb_public_anon_key';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    const runtime = await loadRuntime();

    expect(runtime.clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe(
      'sb_public_anon_key'
    );
  });

  it('falls back to NEXT_PUBLIC_SUPABASE_ANON_KEY when other keys missing', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_next_public_key';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    const runtime = await loadRuntime();

    expect(runtime.clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe(
      'sb_next_public_key'
    );
  });
});
