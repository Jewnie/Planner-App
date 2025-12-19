import { createContext } from 'react';
import { authClient } from '@/lib/auth-client';

// Define the context type
export type AuthContextType = {
  session: NonNullable<ReturnType<typeof authClient.useSession>['data']>['session'] | undefined;
  user: NonNullable<ReturnType<typeof authClient.useSession>['data']>['user'] | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
};

// Create the context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

