import { describe, it, expect, beforeEach } from 'vitest';

import { useAuthStore } from '@/lib/store/auth-store';

describe('Zustand auth store', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().clearAuth();
  });

  it('initializes with expected defaults', () => {
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.isLoading).toBe(false);
    expect(s.error).toBeNull();
    expect(s.mfaRequired).toBe(false);
    expect(s.mfaVerified).toBe(false);
    expect(s.mfaSessionToken).toBeNull();
    expect(s.isMfaSession).toBe(false);
  });

  it('sets and updates user and clears auth', () => {
    const { setUser, updateUser, clearAuth } = useAuthStore.getState();

    setUser({
      id: 'u1',
      email: 'a@b.com',
      role: 'client',
      firstName: 'A',
      lastName: 'B',
      language: 'en',
      status: 'active',
      createdAt: 'now',
      updatedAt: 'now',
      mfaEnabled: false,
    } as unknown);

    expect(useAuthStore.getState().user?.id).toBe('u1');

    updateUser({ firstName: 'Alice' });
    expect(useAuthStore.getState().user?.firstName).toBe('Alice');

    clearAuth();
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.error).toBeNull();
    expect(s.isLoading).toBe(false);
  });

  it('MFA flags set/clear correctly', () => {
    const { setMfaRequired, setMfaVerified, setMfaSessionToken, setMfaSession, clearMfaState } = useAuthStore.getState();

    setMfaRequired(true);
    setMfaVerified(true);
    setMfaSessionToken('token');
    setMfaSession(true);

    const s1 = useAuthStore.getState();
    expect(s1.mfaRequired).toBe(true);
    expect(s1.mfaVerified).toBe(true);
    expect(s1.mfaSessionToken).toBe('token');
    expect(s1.isMfaSession).toBe(true);

    clearMfaState();
    const s2 = useAuthStore.getState();
    expect(s2.mfaRequired).toBe(false);
    expect(s2.mfaVerified).toBe(false);
    expect(s2.mfaSessionToken).toBeNull();
    expect(s2.isMfaSession).toBe(false);
  });

  it('persists only user in localStorage', () => {
    // set some state
    useAuthStore.getState().setUser({ id: 'p1' } as unknown);
    useAuthStore.getState().setMfaRequired(true);
    
    const raw = localStorage.getItem('auth-storage');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state).toBeTruthy();
    // Partialized: only user should exist
    expect(Object.keys(parsed.state)).toEqual(['user']);
    expect(parsed.state.user.id).toBe('p1');
  });
});

