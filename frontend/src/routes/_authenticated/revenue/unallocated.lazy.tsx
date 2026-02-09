import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createLazyFileRoute } from '@tanstack/react-router'
import api from '@/services/api'
import { useDebounce } from '@/hooks/use-debounce'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { UnallocatedTable } from '@/features/revenue/components/unallocated-table'

export const Route = createLazyFileRoute('/_authenticated/revenue/unallocated')(
  {
    component: UnallocatedFundsPage,
  }
)

function UnallocatedFundsPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)
  const [page] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['unallocated-groups', page, debouncedSearch],
    queryFn: async () => {
      const res = await api.get('/revenue/unallocated', {
        params: {
          page,
          limit: 20,
          search: debouncedSearch,
        },
      })
      return res.data
    },
  })

  return (
    <div className='flex flex-col gap-4 p-4 md:p-8'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>
            Unallocated Funds
          </h1>
          <p className='text-muted-foreground'>
            Manage unmatched revenue records and assign them to vendors.
          </p>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Unallocated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(data?.meta?.totalUnallocatedAmount || 0)}
            </div>
            <p className='text-muted-foreground text-xs'>
              across {data?.meta?.totalUnallocatedCount || 0} records
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Pending Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{data?.meta?.total || 0}</div>
            <p className='text-muted-foreground text-xs'>
              groups requiring assignment
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unmatched Records</CardTitle>
          <CardDescription>
            These records were not automatically matched to any vendor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='mb-4 flex items-center justify-between'>
            <Input
              placeholder='Search by Raw Vendor Name...'
              className='max-w-sm'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <UnallocatedTable data={data?.data || []} isLoading={isLoading} />

          {/* Pagination Controls could go here */}
        </CardContent>
      </Card>
    </div>
  )
}
