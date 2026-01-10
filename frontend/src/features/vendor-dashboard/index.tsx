/* eslint-disable @typescript-eslint/no-explicit-any */
import { useNavigate } from '@tanstack/react-router'
import {
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3,
  CreditCard,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useGetDashboardSummary } from './api/useGetDashboardSummary'

export function VendorDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore((state) => state.auth)

  const { data: summary, isLoading } = useGetDashboardSummary()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        {/* Greeting Section */}
        <div className='mb-8 space-y-2'>
          <h1 className='text-4xl font-extrabold tracking-tight lg:text-5xl'>
            <span className='mr-2'>Welcome,</span>
            <span className='from-primary bg-gradient-to-r to-purple-600 bg-clip-text text-transparent'>
              {user?.name || 'Vendor'}
            </span>
          </h1>
        </div>

        {/* Stats Grid */}
        <div className='mb-10 grid gap-6 md:grid-cols-3'>
          {/* Total Earned Card */}
          <Card className='relative overflow-hidden border-none shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl'>
            <div className='absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-green-500/10 blur-xl' />
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                Total Earned
              </CardTitle>
              <div className='rounded-full bg-green-100 p-2 text-green-600 dark:bg-green-900/30 dark:text-green-400'>
                <DollarSign className='h-4 w-4' />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className='h-8 w-24' />
              ) : (
                <div className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
                  {formatCurrency(summary?.totalEarned || 0)}
                </div>
              )}
              <p className='text-muted-foreground mt-1 text-xs'>
                Lifetime earnings
              </p>
            </CardContent>
          </Card>

          {/* Total Paid Card */}
          <Card className='relative overflow-hidden border-none shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl'>
            <div className='absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-blue-500/10 blur-xl' />
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                Total Paid
              </CardTitle>
              <div className='rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'>
                <CheckCircle className='h-4 w-4' />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className='h-8 w-24' />
              ) : (
                <div className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
                  {formatCurrency(summary?.totalPaid || 0)}
                </div>
              )}
              <p className='text-muted-foreground mt-1 text-xs'>
                Successfully settled
              </p>
            </CardContent>
          </Card>

          {/* Total Pending Card */}
          <Card className='relative overflow-hidden border-none shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl'>
            <div className='absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-orange-500/10 blur-xl' />
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                Total Pending
              </CardTitle>
              <div className='rounded-full bg-orange-100 p-2 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'>
                <Clock className='h-4 w-4' />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className='h-8 w-24' />
              ) : (
                <div className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
                  {formatCurrency(summary?.totalPending || 0)}
                </div>
              )}
              <p className='text-muted-foreground mt-1 text-xs'>
                Awaiting payout
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Options Separator */}
        <div className='mb-6 flex items-center gap-4'>
          <div className='bg-muted h-px flex-1' />
          <span className='text-muted-foreground text-sm font-medium tracking-wider uppercase'>
            Options
          </span>
          <div className='bg-muted h-px flex-1' />
        </div>

        {/* Navigation Cards */}
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
          {/* Payouts Option */}
          <Card
            className='group cursor-pointer overflow-hidden border-none shadow-sm transition-all hover:shadow-lg'
            onClick={() => navigate({ to: '/vendor/payouts' })}
          >
            <div className='from-background via-background to-muted/20 group-hover:bg-muted/10 bg-gradient-to-br p-4 transition-colors'>
              <div className='mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:group-hover:bg-emerald-900/50'>
                <CreditCard className='h-5 w-5' />
              </div>
              <h3 className='text-md mb-1 font-bold'>Payouts</h3>
              <p className='text-muted-foreground text-xs'>
                View transaction history.
              </p>
            </div>
          </Card>

          {/* Stats Option */}
          <Card
            className='group cursor-pointer overflow-hidden border-none shadow-sm transition-all hover:shadow-lg'
            onClick={() => navigate({ to: '/vendor/stats/report' })}
          >
            <div className='from-background via-background to-muted/20 group-hover:bg-muted/10 bg-gradient-to-br p-4 transition-colors'>
              <div className='mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:group-hover:bg-indigo-900/50'>
                <BarChart3 className='h-5 w-5' />
              </div>
              <h3 className='text-md mb-1 font-bold'>Statistics</h3>
              <p className='text-muted-foreground text-xs'>
                Performance charts.
              </p>
            </div>
          </Card>
        </div>
      </Main>
    </>
  )
}
