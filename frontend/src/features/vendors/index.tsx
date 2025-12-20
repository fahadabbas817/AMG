import { getRouteApi } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useGetVendors } from './api/useGetVendors'
import { VendorsDialogs } from './components/vendors-dialogs'
import { VendorsPrimaryButtons } from './components/vendors-primary-buttons'
import { VendorsProvider } from './components/vendors-provider'
import { VendorsTable } from './components/vendors-table'
import { VendorsTableSkeleton } from './components/vendors-table-skeleton'

const route = getRouteApi('/_authenticated/vendors/')

export function Vendors() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data: vendors = [], isLoading } = useGetVendors()

  return (
    <VendorsProvider>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Vendor List</h2>
            <p className='text-muted-foreground'>
              Manage your vendors and their details here.
            </p>
          </div>
          <VendorsPrimaryButtons />
        </div>
        {isLoading ? (
          <VendorsTableSkeleton />
        ) : (
          <VendorsTable data={vendors} search={search} navigate={navigate} />
        )}
      </Main>

      <VendorsDialogs />
    </VendorsProvider>
  )
}
