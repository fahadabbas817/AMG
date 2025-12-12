import { type QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from '@/components/ui/sonner'
import { NavigationProgress } from '@/components/navigation-progress'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  beforeLoad: async ({ location }) => {
    // Import auth store dynamically to avoid circular dependencies
    const { useAuthStore } = await import('@/stores/auth-store')
    const { auth } = useAuthStore.getState()

    // Check if user is authenticated (has token and user data)
    const isAuthenticated = auth.accessToken && auth.user

    // Allow access to auth routes without authentication
    const isAuthRoute =
      location.pathname.startsWith('/(auth)') ||
      location.pathname.includes('/sign-in') ||
      location.pathname.includes('/sign-up') ||
      location.pathname.includes('/forgot-password') ||
      location.pathname.includes('/otp')

    // If not authenticated and trying to access protected route, redirect to sign-in
    if (!isAuthenticated && !isAuthRoute) {
      throw redirect({ to: '/sign-in' })
    }
  },
  component: () => {
    return (
      <>
        <NavigationProgress />
        <Outlet />
        <Toaster duration={5000} />
        {import.meta.env.MODE === 'development' && (
          <>
            <ReactQueryDevtools buttonPosition='bottom-left' />
            <TanStackRouterDevtools position='bottom-right' />
          </>
        )}
      </>
    )
  },
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
