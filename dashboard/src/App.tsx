import "./App.css"
import { Routes, Route, Navigate } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import HomePage from "@/pages/home"
import InboxPage from "@/pages/inbox"
import CalendarPage from "@/pages/calendar"
import SearchPage from "@/pages/search"
import SettingsPage from "@/pages/settings"
import LoginPage from "@/pages/login"

function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 md:hidden" />
            <Separator orientation="vertical" className="h-6 bg-border md:hidden" />
          </div>
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-lg font-semibold">Planner app</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Routes>
            {/* Dynamic user routes */}
            <Route path=":userId">
              <Route index element={<HomePage />} />
              <Route path="inbox" element={<InboxPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="." replace />} />
            </Route>
          </Routes>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Login — no sidebar */}
      <Route path="/login" element={<LoginPage />} />

      {/* Main app layout */}
      <Route path="/*" element={<AppLayout />} />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
