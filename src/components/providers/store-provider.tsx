'use client';

import type { AuthUser } from '@/lib/auth/auth';

interface StoreProviderProps {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}

// Pass-through provider: unified auth sync now handled in AuthProvider/useUnifiedAuth
export function StoreProvider({ children }: StoreProviderProps) {
  return <>{children}</>;
}
