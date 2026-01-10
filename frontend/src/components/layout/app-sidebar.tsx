import { useAuthStore } from '@/stores/auth-store'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
// import { AppTitle } from './app-title'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { auth } = useAuthStore()

  const sidebarUser = {
    name: auth.user?.name || 'Admin',
    email: auth.user?.email || '',
    avatar: '',
    profileUrl: '/help-center',
  }
  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />

        {/* Replace <TeamSwitch /> with the following <AppTitle />
         /* if you want to use the normal app title instead of TeamSwitch dropdown */}
        {/* <AppTitle /> */}
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props) => {
          // Skip 'Other' group (Settings, Help Center) as requested to be removed like vendor sidebar
          if (props.title === 'Other') return null

          // RBAC Filtering logic
          if (
            auth.user?.role === 'vendor' ||
            (Array.isArray(auth.user?.role) &&
              auth.user?.role.includes('vendor'))
          ) {
            // Vendor specific filtering
            if (props.title === 'General') {
              // Return modified items for Vendor
              return (
                <NavGroup
                  key={props.title}
                  {...{
                    ...props,
                    items: [
                      {
                        title: 'Dashboard',
                        url: '/vendor', // Vendor dashboard link
                        icon:
                          props.items.find((i) => i.title === 'Dashboard')
                            ?.icon || undefined,
                      },
                    ],
                  }}
                />
              )
            }
            return null // Hide other groups for vendors
          }
          return <NavGroup key={props.title} {...props} />
        })}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
