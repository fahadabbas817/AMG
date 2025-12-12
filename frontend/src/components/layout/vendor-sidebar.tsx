import { LayoutDashboard, Settings, HelpCircle, Command } from 'lucide-react'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'

// Simplified sidebar data for vendors
const vendorSidebarData = {
  user: {
    name: 'Vendor',
    email: 'vendor@amg.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'AMG',
      logo: Command,
      plan: 'Vendor Portal',
    },
  ],
  navGroups: [
    {
      title: 'General',
      items: [
        {
          title: 'Dashboard',
          url: '/vendor',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          title: 'Settings',
          url: '/settings',
          icon: Settings,
        },
        {
          title: 'Help Center',
          url: '/help-center',
          icon: HelpCircle,
        },
      ],
    },
  ],
}

export function VendorSidebar() {
  const { collapsible, variant } = useLayout()

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={vendorSidebarData.teams} />
      </SidebarHeader>
      <SidebarContent>
        {vendorSidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={vendorSidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
