import { LayoutDashboard, Command, BarChart3, CreditCard } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
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

        {
          title: 'Stats',
          url: '/vendor/stats',
          icon: BarChart3,
        },
        {
          title: 'Payouts',
          url: '/vendor/payouts',
          icon: CreditCard,
        },
      ],
    },
  ],
}

export function VendorSidebar() {
  const { collapsible, variant } = useLayout()
  const { user } = useAuthStore((state) => state.auth)

  const sidebarUser = {
    name: user?.name || 'Vendor',
    email: user?.email || '',
    avatar: '', // You might want to generate this from name
    profileUrl: '/vendor/profile',
  }

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
        <NavUser user={sidebarUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
