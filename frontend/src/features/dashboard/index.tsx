import { useNavigate } from '@tanstack/react-router'
import { CreditCard, Layers, UploadCloud, UserPlus } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

export function Dashboard() {
  const navigate = useNavigate()
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
        <div className='mb-8 flex items-center justify-between space-y-2'>
          <div>
            <h1 className='from-primary bg-gradient-to-r to-blue-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent'>
              Admin Dashboard
            </h1>
            <p className='text-muted-foreground mt-2'>
              Welcome back, manage your platform efficiently.
            </p>
          </div>
        </div>

        <div className='mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
          {/* Action 1: Add Vendor */}
          <Card
            className='group from-background to-muted/50 relative cursor-pointer overflow-hidden border-none bg-gradient-to-br shadow-md transition-all duration-300 hover:shadow-xl'
            onClick={() => navigate({ to: '/vendors' })}
          >
            <div className='absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-blue-500/10 blur-3xl transition-all group-hover:bg-blue-500/20' />
            <CardHeader className='pb-2'>
              <div className='mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-sm transition-transform duration-300 group-hover:scale-110 dark:bg-blue-900/30 dark:text-blue-400'>
                <UserPlus size={28} strokeWidth={2} />
              </div>
              <CardTitle className='text-lg font-bold transition-colors group-hover:text-blue-600'>
                Add Vendor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Register and onboard new vendors.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Action 2: Add New Platform */}
          <Card
            className='group from-background to-muted/50 relative cursor-pointer overflow-hidden border-none bg-gradient-to-br shadow-md transition-all duration-300 hover:shadow-xl'
            onClick={() => navigate({ to: '/platforms' })}
          >
            <div className='absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-purple-500/10 blur-3xl transition-all group-hover:bg-purple-500/20' />
            <CardHeader className='pb-2'>
              <div className='mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 shadow-sm transition-transform duration-300 group-hover:scale-110 dark:bg-purple-900/30 dark:text-purple-400'>
                <Layers size={28} strokeWidth={2} />
              </div>
              <CardTitle className='text-lg font-bold transition-colors group-hover:text-purple-600'>
                Add New Platform
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Configure new platform integrations.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Action 3: Upload Report */}
          <Card
            className='group from-background to-muted/50 relative cursor-pointer overflow-hidden border-none bg-gradient-to-br shadow-md transition-all duration-300 hover:shadow-xl'
            onClick={() => navigate({ to: '/revenue/upload' })}
          >
            <div className='absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-emerald-500/10 blur-3xl transition-all group-hover:bg-emerald-500/20' />
            <CardHeader className='pb-2'>
              <div className='mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm transition-transform duration-300 group-hover:scale-110 dark:bg-emerald-900/30 dark:text-emerald-400'>
                <UploadCloud size={28} strokeWidth={2} />
              </div>
              <CardTitle className='text-lg font-bold transition-colors group-hover:text-emerald-600'>
                Upload Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload platform performance reports.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Action 4: Payment Tracking */}
          <Card
            className='group from-background to-muted/50 relative cursor-pointer overflow-hidden border-none bg-gradient-to-br shadow-md transition-all duration-300 hover:shadow-xl'
            onClick={() => navigate({ to: '/payouts' })}
          >
            <div className='absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-orange-500/10 blur-3xl transition-all group-hover:bg-orange-500/20' />
            <CardHeader className='pb-2'>
              <div className='mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 shadow-sm transition-transform duration-300 group-hover:scale-110 dark:bg-orange-900/30 dark:text-orange-400'>
                <CreditCard size={28} strokeWidth={2} />
              </div>
              <CardTitle className='text-lg font-bold transition-colors group-hover:text-orange-600'>
                Payment Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Monitor payments and transactions.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity / Overview Placeholder */}
        {/* <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
          <Card className='col-span-1 shadow-sm'>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest actions performed in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className='flex items-center gap-4 border-b pb-4 last:border-0 last:pb-0'
                  >
                    <div className='h-2 w-2 rounded-full bg-blue-500' />
                    <div className='flex-1 space-y-1'>
                      <p className='text-sm leading-none font-medium'>
                        New Vendor Added
                      </p>
                      <p className='text-muted-foreground text-xs'>Just now</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className='col-span-1 shadow-sm'>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Overview of system performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='text-muted-foreground text-sm'>
                Stats visualization will go here.
              </div>
            </CardContent>
          </Card>
        </div> */}
      </Main>
    </>
  )
}
