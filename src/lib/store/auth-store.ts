import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AuthUser } from '@/lib/auth/auth';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  // MFA state
  mfaRequired: boolean;
  mfaVerified: boolean;
  mfaSessionToken: string | null;
  isMfaSession: boolean;
  pendingMfaUser: AuthUser | null;
}

interface AuthActions {
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  // MFA actions
  setMfaRequired: (required: boolean) => void;
  setMfaVerified: (verified: boolean) => void;
  setMfaSessionToken: (token: string | null) => void;
  setMfaSession: (isSession: boolean) => void;
  clearMfaState: () => void;
  setPendingMfaUser: (user: AuthUser | null) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      isLoading: true, // Start as loading until auth state is determined
      error: null,
      // MFA state
      mfaRequired: false,
      mfaVerified: false,
      mfaSessionToken: null,
      isMfaSession: false,
      pendingMfaUser: null,

      // Actions
      setUser: (user) => set({ user, error: null, pendingMfaUser: null }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      clearAuth: () => set({
        user: null,
        error: null,
        isLoading: false,
        mfaRequired: false,
        mfaVerified: false,
        mfaSessionToken: null,
        isMfaSession: false,
        pendingMfaUser: null,
      }),
      
      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },

      // MFA actions
      setMfaRequired: (mfaRequired) => set({ mfaRequired }),
      
      setMfaVerified: (mfaVerified) => set({ mfaVerified }),
      
      setMfaSessionToken: (mfaSessionToken) => set({ mfaSessionToken }),
      
      setMfaSession: (isMfaSession) => set({ isMfaSession }),

      clearMfaState: () => set({
        mfaRequired: false,
        mfaVerified: false,
        mfaSessionToken: null,
        isMfaSession: false,
        pendingMfaUser: null,
      }),

      setPendingMfaUser: (pendingMfaUser) => set({ pendingMfaUser }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user 
        // MFA session data is intentionally not persisted for security
      }),
    }
  )
);

// Selectors for better performance
export const useUser = () => useAuthStore((state) => state.user);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);

// MFA selectors
export const useMfaRequired = () => useAuthStore((state) => state.mfaRequired);
export const useMfaVerified = () => useAuthStore((state) => state.mfaVerified);
export const useMfaSessionToken = () => useAuthStore((state) => state.mfaSessionToken);
export const useIsMfaSession = () => useAuthStore((state) => state.isMfaSession);
export const usePendingMfaUser = () => useAuthStore((state) => state.pendingMfaUser);