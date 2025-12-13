import { CreditCard, Layers, UploadCloud, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Analytics } from './components/analytics'
import { Overview } from './components/overview'
import { RecentSales } from './components/recent-sales'

export function Dashboard() {
  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        {/* <TopNav links={topNav} /> */}
        <div className='ms-auto flex items-center space-x-4'>
          {/* <Search /> */}
          <ThemeSwitch />
          {/* <ConfigDrawer /> */}
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>Admin Dashboard</h1>
          <div className='flex items-center space-x-2'>
            {/* <Button>Download</Button> */}
          </div>
        </div>
        <Tabs
          orientation='vertical'
          defaultValue='overview'
          className='space-y-4'
        >
          <div className='w-full overflow-x-auto pb-2'>
            {/* <TabsList>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='analytics'>Analytics</TabsTrigger> */}
            {/* <TabsTrigger value='reports' disabled>
                Reports
              </TabsTrigger> */}
            {/* <TabsTrigger value='notifications' disabled>
                Notifications
              </TabsTrigger> */}
            {/* </TabsList> */}
          </div>
          <TabsContent value='overview' className='space-y-4'>
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
              {/* Action 1: Add Vendor */}
              <Button
                variant='outline'
                className='flex h-32 flex-col items-center justify-center gap-3 border-2 border-dashed text-lg font-medium hover:bg-slate-50'
                onClick={() => console.log('Navigate to Add Vendor')} // Replace with navigation
              >
                <UserPlus className='h-8 w-8 text-blue-600' />
                Add Vendor
              </Button>

              {/* Action 2: Add New Platform */}
              <Button
                variant='outline'
                className='flex h-32 flex-col items-center justify-center gap-3 border-2 border-dashed text-lg font-medium hover:bg-slate-50'
                onClick={() => console.log('Navigate to Add Platform')}
              >
                <Layers className='h-8 w-8 text-purple-600' />
                Add New Platform
              </Button>

              {/* Action 3: Upload Report */}
              <Button
                variant='outline'
                className='flex h-32 flex-col items-center justify-center gap-3 border-2 border-dashed text-lg font-medium hover:bg-slate-50'
                onClick={() => console.log('Navigate to Upload')}
              >
                <UploadCloud className='h-8 w-8 text-green-600' />
                Upload Platform Report
              </Button>

              {/* Action 4: Payment Tracking */}
              <Button
                variant='outline'
                className='flex h-32 flex-col items-center justify-center gap-3 border-2 border-dashed text-lg font-medium hover:bg-slate-50'
                onClick={() => console.log('Navigate to Payments')}
              >
                <CreditCard className='h-8 w-8 text-orange-600' />
                Payment Tracking
              </Button>
            </div>
            {/* <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <Card className='col-span-1 lg:col-span-4'>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent className='ps-2'>
                  <Overview />
                </CardContent>
              </Card>
              <Card className='col-span-1 lg:col-span-3'>
                <CardHeader>
                  <CardTitle>Recent Sales</CardTitle>
                  <CardDescription>
                    You made 265 sales this month.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentSales />
                </CardContent>
              </Card>
            </div> */}
          </TabsContent>
          <TabsContent value='analytics' className='space-y-4'>
            <Analytics />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}

const topNav = [
  {
    title: 'Overview',
    href: 'dashboard/overview',
    isActive: true,
    disabled: false,
  },
  {
    title: 'Customers',
    href: 'dashboard/customers',
    isActive: false,
    disabled: true,
  },
  {
    title: 'Products',
    href: 'dashboard/products',
    isActive: false,
    disabled: true,
  },
  {
    title: 'Settings',
    href: 'dashboard/settings',
    isActive: false,
    disabled: true,
  },
]
