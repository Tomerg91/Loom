import crypto from 'crypto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const supabaseServerMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

const databaseMocks = vi.hoisted(() => ({
  createUserService: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => supabaseServerMocks);

vi.mock('@/lib/supabase/client', () => ({
  supabase: {},
}));

vi.mock('@/lib/database', () => databaseMocks);

import { MfaService } from '@/lib/services/mfa-service';

describe('MfaService trusted device helpers', () => {
  let upsertMock: ReturnType<typeof vi.fn>;
  let selectMock: ReturnType<typeof vi.fn>;
  let selectEqMock: ReturnType<typeof vi.fn>;
  let selectSingleMock: ReturnType<typeof vi.fn>;
  let updateMock: ReturnType<typeof vi.fn>;
  let updateEqMock: ReturnType<typeof vi.fn>;
  let deleteMock: ReturnType<typeof vi.fn>;
  let deleteEqMock: ReturnType<typeof vi.fn>;
  let insertMock: ReturnType<typeof vi.fn>;
  let supabaseStub: {
    from: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    upsertMock = vi.fn().mockResolvedValue({ error: null });
    selectSingleMock = vi.fn();
    const eqChain = {
      eq: vi.fn(),
      single: selectSingleMock,
    };
    eqChain.eq.mockReturnValue(eqChain);
    selectEqMock = eqChain.eq;
    selectMock = vi.fn().mockReturnValue(eqChain);
    updateEqMock = vi.fn().mockResolvedValue({ error: null });
    updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });
    deleteEqMock = vi.fn().mockResolvedValue({ error: null });
    deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock });
    insertMock = vi.fn().mockResolvedValue({ error: null });

    supabaseStub = {
      from: vi.fn((table: string) => {
        if (table === 'trusted_devices') {
          return {
            upsert: upsertMock,
            select: selectMock,
            update: updateMock,
            delete: deleteMock,
          };
        }
        if (table === 'security_events') {
          return {
            insert: insertMock,
          };
        }
        if (table === 'user_mfa') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { secret: 'encrypted', is_enabled: true },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn(),
        };
      }),
    };

    supabaseServerMocks.createServerClient.mockReturnValue(supabaseStub);
    databaseMocks.createUserService.mockReturnValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('issues trusted device tokens with hashed fingerprints', async () => {
    const service = new MfaService(false);
    // @ts-expect-error override for testing
    service.supabase = supabaseStub;

    const result = await service.issueTrustedDeviceToken({
      userId: 'user-1',
      ipAddress: '10.0.0.1',
      userAgent: 'Mozilla/5.0 (Macintosh)',
    });

    expect(result.success).toBe(true);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        device_fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        ip_address: '10.0.0.1',
      })
    );
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'device_trusted',
        user_id: 'user-1',
      })
    );
  });

  it('validates trusted device tokens and updates usage metadata', async () => {
    const service = new MfaService(false);
    // @ts-expect-error override for testing
    service.supabase = supabaseStub;

    const future = new Date(Date.now() + 60_000).toISOString();
    selectSingleMock.mockResolvedValue({
      data: { id: 'device-1', expires_at: future },
      error: null,
    });

    const token = 'raw-token';
    const expectedHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const result = await service.verifyTrustedDeviceToken(
      'user-1',
      'device-1',
      token,
      { ipAddress: '10.0.0.2', userAgent: 'TestAgent' }
    );

    expect(result).toBe(true);
    expect(selectEqMock).toHaveBeenNthCalledWith(1, 'id', 'device-1');
    expect(selectEqMock).toHaveBeenNthCalledWith(2, 'user_id', 'user-1');
    expect(selectEqMock).toHaveBeenNthCalledWith(
      3,
      'device_fingerprint',
      expectedHash
    );
    expect(updateMock).toHaveBeenCalled();
    expect(updateEqMock).toHaveBeenCalledWith('id', 'device-1');
  });

  it('removes expired trusted device tokens', async () => {
    const service = new MfaService(false);
    // @ts-expect-error override for testing
    service.supabase = supabaseStub;

    const past = new Date(Date.now() - 60_000).toISOString();
    selectSingleMock.mockResolvedValue({
      data: { id: 'device-2', expires_at: past },
      error: null,
    });

    const result = await service.verifyTrustedDeviceToken(
      'user-1',
      'device-2',
      'another-token'
    );

    expect(result).toBe(false);
    expect(deleteMock).toHaveBeenCalled();
    expect(deleteEqMock).toHaveBeenCalledWith('id', 'device-2');
  });
});
