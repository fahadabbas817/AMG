import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
  beforeLoad: ({ location }) => {
    const { auth } = useAuthStore.getState()

    // Check if user is vendor
    const isVendor =
      auth.user?.role === 'vendor' ||
      (Array.isArray(auth.user?.role) && auth.user?.role.includes('vendor'))

    // If vendor tries to access non-vendor routes (assuming all admin routes are at root like /users, /settings etc except /vendor)
    // We allow /vendor prefix.
    // We allow /vendor prefix.
    if (isVendor && !location.pathname.startsWith('/vendor')) {
      throw redirect({
        to: '/vendor',
      })
    }
  },
})
