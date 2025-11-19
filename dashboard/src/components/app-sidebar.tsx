import { Calendar, Home, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { NavUser } from './nav-user';
import { authClient } from '@/lib/auth-client';

// Menu items.
const items = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: Home,
    exact: true,
  },
  // {
  //   title: "Inbox",
  //   url: "/dashboard/inbox",
  //   icon: Inbox,
  // },
  {
    title: 'Calendar',
    url: '/dashboard/calendar',
    icon: Calendar,
  },
  // {
  //   title: "Search",
  //   url: "/dashboard/search",
  //   icon: Search,
  // },
  {
    title: 'Settings',
    url: '/dashboard/settings',
    icon: Settings,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const sessionQuery = authClient.useSession();
  const user = sessionQuery.data?.user;
  const searchParams = new URLSearchParams(location.search);
  const currentView = searchParams.get('view') || 'month';

  const isCalendarActive = location.pathname.startsWith('/dashboard/calendar');

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plnnr-app</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isCalendar = item.title === 'Calendar';
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        item.exact
                          ? location.pathname === item.url
                          : location.pathname.startsWith(item.url)
                      }
                    >
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {isCalendar && isCalendarActive && (
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={currentView === 'month'}>
                            <Link to="/dashboard/calendar?view=month">Month</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={currentView === 'week'}>
                            <Link to="/dashboard/calendar?view=week">Week</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={currentView === 'day'}>
                            <Link to="/dashboard/calendar?view=day">Day</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {user && (
        <NavUser user={{ name: user.name, email: user.email, avatar: user.image ?? undefined }} />
      )}
    </Sidebar>
  );
}
