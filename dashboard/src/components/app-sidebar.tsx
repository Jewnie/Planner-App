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
    url: '/dashboard/settings/integrations',
    icon: Settings,
    subItems: [
      {
        title: 'Integrations',
        url: '/dashboard/settings/integrations',
      },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const sessionQuery = authClient.useSession();
  const user = sessionQuery.data?.user;

  return (
    <Sidebar className="w-52" collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plnnr-app</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = item.exact
                  ? location.pathname === item.url
                  : location.pathname.startsWith(item.url);
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isSettingsPage = location.pathname.startsWith('/dashboard/settings');

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {hasSubItems && isSettingsPage && (
                      <SidebarMenuSub>
                        {item.subItems.map((subItem) => {
                          const isSubItemActive = location.pathname === subItem.url;

                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={isSubItemActive}>
                                <Link to={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
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
