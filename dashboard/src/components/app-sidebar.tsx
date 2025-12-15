import { Calendar, Home, Settings, LayoutDashboard } from 'lucide-react';
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
import { trpc } from '@/lib/trpc';
import { useMemo } from 'react';

export function AppSidebar() {
  const location = useLocation();
  const sessionQuery = authClient.useSession();
  const user = sessionQuery.data?.user;

  const householdResponse = trpc.household.listHouseholds.useQuery();

  const householdItems = useMemo(() => {
    return householdResponse.data?.map((household) => ({
      title: household.name,
      url: `/dashboard/households/${household.id}`,
    }));
  }, [householdResponse.data]);

  // Menu items.
  const items: {
    title: string;
    url: string;
    icon: React.JSX.Element;
    exact?: boolean;
    subItems?: { title: string; url: string; icon?: React.ReactNode }[];
  }[] = [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: <LayoutDashboard />,
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
      icon: <Calendar />,
    },
    {
      title: 'Households',
      url: '/dashboard/households',
      icon: <Home />,
      subItems: householdItems?.map((household) => ({
        title: household.title,
        url: household.url,
      })),
    },
    {
      title: 'Settings',
      url: '/dashboard/settings/integrations',
      icon: <Settings />,
      subItems: [
        {
          title: 'Integrations',
          url: '/dashboard/settings/integrations',
        },
        // {
        //   title: 'Households',
        //   url: '/dashboard/settings/households', TODO: ADD HOUSEHOLD SETTINGS
        // },
      ],
    },
  ];

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

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.url}>
                        {item.icon}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {hasSubItems && isActive && (
                      <SidebarMenuSub>
                        {item.subItems?.map((subItem) => {
                          const isSubItemActive = location.pathname === subItem.url;

                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={isSubItemActive}>
                                <Link to={subItem.url}>
                                  <span className="flex items-center gap-2 text-xs">
                                    {subItem.icon} {subItem.title}
                                  </span>
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
