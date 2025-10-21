import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mfaServiceMocks = vi.hoisted(() => ({
  createMfaService: vi.fn(),
  getClientIP: vi.fn(),
  getUserAgent: vi.fn(),
}));

const rateLimitMocks = vi.hoisted(() => ({
  rateLimit: vi.fn(
    () => (handler: (request: NextRequest) => Promise<Response>) => handler
  ),
}));

vi.mock('@/lib/services/mfa-service', () => mfaServiceMocks);
vi.mock('@/lib/security/rate-limit', () => rateLimitMocks);

import { POST } from '@/app/api/auth/mfa/verify/route';

describe('/api/auth/mfa/verify remember device', () => {
  const baseRequest = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    code: 'ABC123',
    method: 'totp' as const,
    rememberDevice: true,
  };

  let mockMfaServiceInstance: {
    requiresMFA: ReturnType<typeof vi.fn>;
    verifyMFA: ReturnType<typeof vi.fn>;
    getMFAStatus: ReturnType<typeof vi.fn>;
    issueTrustedDeviceToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockMfaServiceInstance = {
      requiresMFA: vi.fn(),
      verifyMFA: vi.fn(),
      getMFAStatus: vi.fn(),
      issueTrustedDeviceToken: vi.fn(),
    };

    mfaServiceMocks.createMfaService.mockReturnValue(mockMfaServiceInstance);
    mfaServiceMocks.getClientIP.mockReturnValue('198.51.100.1');
    mfaServiceMocks.getUserAgent.mockReturnValue('Mozilla/5.0');
    rateLimitMocks.rateLimit.mockImplementation(() => handler => handler);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('sets a trusted device cookie when rememberDevice is true', async () => {
    mockMfaServiceInstance.requiresMFA.mockResolvedValue(true);
    mockMfaServiceInstance.verifyMFA.mockResolvedValue({ success: true });
    mockMfaServiceInstance.getMFAStatus.mockResolvedValue({
      backupCodesRemaining: 5,
    });
    mockMfaServiceInstance.issueTrustedDeviceToken.mockResolvedValue({
      success: true,
      deviceId: 'device123',
      token: 'rawtoken456',
      expiresAt: '2099-01-01T00:00:00.000Z',
      maxAgeSeconds: 3600,
    });

    const request = new NextRequest(
      'http://localhost:3000/api/auth/mfa/verify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseRequest),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.success).toBe(true);

    expect(mockMfaServiceInstance.verifyMFA).toHaveBeenCalledWith(
      baseRequest.userId,
      baseRequest.code,
      'totp',
      '198.51.100.1',
      'Mozilla/5.0'
    );

    expect(mockMfaServiceInstance.issueTrustedDeviceToken).toHaveBeenCalledWith(
      {
        userId: baseRequest.userId,
        ipAddress: '198.51.100.1',
        userAgent: 'Mozilla/5.0',
      }
    );

    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('mfa_trusted_device=device123.rawtoken456');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Max-Age=3600');
  });

  it('clears the trusted device cookie when rememberDevice is false', async () => {
    const requestPayload = { ...baseRequest, rememberDevice: false };
    mockMfaServiceInstance.requiresMFA.mockResolvedValue(true);
    mockMfaServiceInstance.verifyMFA.mockResolvedValue({ success: true });
    mockMfaServiceInstance.getMFAStatus.mockResolvedValue({
      backupCodesRemaining: 3,
    });

    const request = new NextRequest(
      'http://localhost:3000/api/auth/mfa/verify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('mfa_trusted_device=');
    expect(setCookie).toContain('Max-Age=0');
    expect(
      mockMfaServiceInstance.issueTrustedDeviceToken
    ).not.toHaveBeenCalled();
  });
});
