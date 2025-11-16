import { Calendar, Home, Settings } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavUser } from "./nav-user"
import { authClient } from "@/lib/auth-client"

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    exact: true,
  },
  // {
  //   title: "Inbox",
  //   url: "/dashboard/inbox",
  //   icon: Inbox,
  // },
  {
    title: "Calendar",
    url: "/dashboard/calendar",
    icon: Calendar,
  },
  // {
  //   title: "Search",
  //   url: "/dashboard/search",
  //   icon: Search,
  // },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
 const user = authClient.useSession().data?.user
 if(!user){
  navigate("/")
 }


  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
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
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <NavUser user={{name:user!.name, email:user!.email, avatar:user!.image ?? undefined}} />
    </Sidebar>
  )
}