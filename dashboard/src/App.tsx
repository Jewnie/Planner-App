import { Routes, Route, Outlet, Navigate } from 'react-router-dom';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import HomePage from '@/pages/dashboard';
import InboxPage from '@/pages/inbox';
import CalendarPage from '@/pages/calendar';
import SearchPage from '@/pages/search';
import SettingsPage from '@/pages/settings';
import LoginPage from '@/pages/login';
import { authClient } from './lib/auth-client';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const sessionQuery = authClient.useSession();

  // Wait for the session query to finish loading before making redirect decisions
  if (sessionQuery.isPending) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Plnnr is loading...
        </div>
      </div>
    );
  }

  // Only redirect if session query is done and there's no session
  if (!sessionQuery.data?.session) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <ProtectedRoute>
          {/* <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
            <div className="flex overflow-hidden items-center gap-2">
              <SidebarTrigger className="-ml-1 md:hidden" />
              <Separator orientation="vertical" className="h-6 bg-border md:hidden" />
            </div>
            <div className="flex flex-1 items-center justify-between">
              <h1 className="text-lg font-semibold">Planner app</h1>
            </div>
          </header> */}
          <div className="flex flex-1 flex-col h-full max-h-screen">
            <Outlet />
          </div>
        </ProtectedRoute>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Login — no sidebar */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Main app layout */}
      <Route path="/dashboard" element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
