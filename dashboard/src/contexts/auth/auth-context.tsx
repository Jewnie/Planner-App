import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { authClient } from '@/lib/auth-client';
import posthog from 'posthog-js';
import { AuthContext, type AuthContextType } from './auth-context-value';

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const sessionQuery = authClient.useSession();

  useEffect(() => {
    if (sessionQuery.data?.session && sessionQuery.data?.user) {
      posthog.identify(sessionQuery.data.user.id, {
        email: sessionQuery.data.user.email,
        name: sessionQuery.data.user.name,
      });
    }
  });

  const value: AuthContextType = {
    session: sessionQuery.data?.session,
    user: sessionQuery.data?.user,
    isLoading: sessionQuery.isPending,
    isAuthenticated: !!sessionQuery.data?.session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
