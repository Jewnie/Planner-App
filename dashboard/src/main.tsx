import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App';
import { trpc, createTRPCClient } from './lib/trpc';
import { PostHogProvider } from 'posthog-js/react';
import { AuthProvider } from './contexts/auth-context';

const queryClient = new QueryClient();
const trpcClient = createTRPCClient();

const posthogOptions = {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  defaults: '2025-11-30',
} as const;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <PostHogProvider apiKey={import.meta.env.VITE_POSTHOG_KEY} options={posthogOptions}>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </PostHogProvider>
      </QueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
);
