import { useState } from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'
import { Table } from '@tanstack/react-table'
import api from '@/services/api'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableFacetedFilter } from '@/components/data-table/faceted-filter'
import { DataTableViewOptions } from '@/components/data-table/view-options'

interface PayoutsTableToolbarProps<TData> {
  table: Table<TData>
}

export function PayoutsTableToolbar<TData>({
  table,
}: PayoutsTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0
  const { handleSync, isLoading } = useSyncPaymentStatus()

  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2'>
        <Input
          placeholder='Filter vendors...'
          value={(table.getColumn('vendor')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('vendor')?.setFilterValue(event.target.value)
          }
          className='h-8 w-[150px] lg:w-[250px]'
        />
        <div className='flex gap-x-2'>
          {table.getColumn('status') && (
            <DataTableFacetedFilter
              column={table.getColumn('status')}
              title='Status'
              options={[
                { label: 'Paid', value: 'PAID' },
                { label: 'Pending', value: 'PENDING' },
              ]}
            />
          )}
        </div>
        {isFiltered && (
          <Button
            variant='ghost'
            onClick={() => table.resetColumnFilters()}
            className='h-8 px-2 lg:px-3'
          >
            Reset
            <Cross2Icon className='ml-2 h-4 w-4' />
          </Button>
        )}
      </div>
      <div className='flex items-center gap-2'>
        <Button
          variant='outline'
          size='sm'
          className='ml-auto h-8 lg:flex'
          onClick={handleSync}
          disabled={isLoading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
          />
          Sync QBO Status
        </Button>
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}

function useSyncPaymentStatus() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSync = async () => {
    setIsLoading(true)
    try {
      const res = await api.post('/quickbooks/sync/payment-status')
      const { updated, message } = res.data
      if (updated > 0) {
        toast.success(`Synced! ${updated} payouts marked as paid.`)
        // Ideally invalidate queries here, but we don't have access to queryClient easily
        // User can refresh page or we can reload
        window.location.reload()
      } else {
        toast.info(message || 'No new payments found.')
      }
    } catch (error: any) {
      toast.error('Failed to sync payment status')
    } finally {
      setIsLoading(false)
    }
  }

  return { handleSync, isLoading }
}
