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
    // Import auth store and service dynamically to avoid circular dependencies
    const { useAuthStore } = await import('@/stores/auth-store')
    const { AuthService } = await import('@/services/auth')
    const { auth } = useAuthStore.getState()

    // Define auth routes
    const isAuthRoute =
      location.pathname.startsWith('/(auth)') ||
      location.pathname.includes('/sign-in') ||
      location.pathname.includes('/sign-up') ||
      location.pathname.includes('/forgot-password') ||
      location.pathname.includes('/otp')

    // If user is already in auth store, they're authenticated
    if (auth.user && auth.accessToken) {
      // If authenticated user tries to access auth routes, redirect to dashboard
      if (isAuthRoute) {
        const role = Array.isArray(auth.user.role)
          ? auth.user.role[0]
          : auth.user.role
        const targetPath = role === 'vendor' ? '/vendor' : '/'
        throw redirect({ to: targetPath })
      }
      return // Allow access to protected routes
    }

    // Try to fetch profile if we have a cookie (auto-login)
    try {
      console.log('🔍 Checking for existing session...')
      const profileData = await AuthService.getProfile()

      console.log('✅ Session found, auto-logging in:', profileData)

      // Profile exists, user is authenticated
      const user = {
        userId: profileData.userId,
        email: profileData.email,
        role: profileData.role.toLowerCase(),
        exp: Date.now() + 2 * 60 * 60 * 1000,
      }

      // Store user in auth store
      auth.setUser(user)
      auth.setAccessToken('token-in-cookie')

      // Redirect to appropriate dashboard if on auth route
      if (isAuthRoute) {
        const targetPath = user.role === 'vendor' ? '/vendor' : '/'
        console.log('🚀 Redirecting authenticated user to:', targetPath)
        throw redirect({ to: targetPath })
      }
    } catch (error) {
      console.log('❌ No valid session found')
      // No valid session, user needs to login
      if (!isAuthRoute) {
        throw redirect({ to: '/sign-in' })
      }
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
