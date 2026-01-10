import { format } from 'date-fns'
import { ColumnDef } from '@tanstack/react-table'
import { getChangedFields } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// Define the shape of our data
export interface ProfileChangeRequest {
  id: string
  vendorId: string
  vendor: {
    companyName: string
    email: string
  }
  oldData: any
  newData: any
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

export const columns: ColumnDef<ProfileChangeRequest>[] = [
  {
    accessorKey: 'vendor',
    header: 'Vendor',
    cell: ({ row }) => {
      const vendor = row.original.vendor
      return (
        <div className='flex flex-col'>
          <span className='font-medium'>{vendor?.companyName}</span>
          <span className='text-muted-foreground text-xs'>{vendor?.email}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Requested Date',
    cell: ({ row }) => format(new Date(row.original.createdAt), 'PPP'),
  },
  {
    id: 'changes',
    header: 'Fields Changed',
    cell: ({ row }) => {
      const changes = getChangedFields(
        row.original.oldData,
        row.original.newData
      )
      const count = Object.keys(changes).length
      return (
        <span className='bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-xs'>
          {count} changes
        </span>
      )
    },
  },
  {
    id: 'actions',
    header: () => <div className='text-right'>Action</div>,
    cell: ({ row, table }) => {
      // We need to access the setSelectedRequest from the parent.
      // We can pass it via table.options.meta
      const meta = table.options.meta as any
      return (
        <div className='text-right'>
          <Button size='sm' onClick={() => meta?.onReview(row.original)}>
            Review
          </Button>
        </div>
      )
    },
  },
]
