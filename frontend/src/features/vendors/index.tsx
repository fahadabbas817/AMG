import { getRouteApi } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
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
  // @ts-expect-error search is unknown
  const page = Number(search?.page) || 1
  // @ts-expect-error search is unknown
  const limit = Number(search?.pageSize) || 10

  const searchObj = search as Record<string, unknown> | undefined
  const searchQuery =
    (searchObj?.companyName as string) ||
    (searchObj?.vendorNumber as string) ||
    undefined

  const { data: vendorsResponse, isLoading } = useGetVendors({
    page,
    limit,
    search: searchQuery,
  })

  const vendors = vendorsResponse?.data || []
  const totalVendors = vendorsResponse?.meta?.total || 0

  return (
    <VendorsProvider>
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
          <VendorsTable
            data={vendors}
            search={search}
            navigate={navigate}
            rowCount={totalVendors}
          />
        )}
      </Main>

      <VendorsDialogs />
    </VendorsProvider>
  )
}
