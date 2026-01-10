import { format } from 'date-fns'
import { Link } from '@tanstack/react-router'
import { ColumnDef } from '@tanstack/react-table'
import {
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  MoreHorizontal,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { useExportPayout } from '@/features/payouts/api/useExportPayout'
// We can reuse the Payout type from features/payouts or define a minimal one
// assuming we can import it:
// import { Payout } from '@/features/payouts/types'
import { VendorPayout } from '@/features/vendor-dashboard/api/useGetVendorPayouts'

export const columns: ColumnDef<VendorPayout>[] = [
  {
    accessorKey: 'payoutNumber',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Payout #' />
    ),
    cell: ({ row }) => (
      <div className='w-[80px] font-medium'>
        #{row.getValue('payoutNumber')}
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Generated Date' />
    ),
    cell: ({ row }) => {
      return (
        <span className='truncate'>
          {format(new Date(row.getValue('createdAt')), 'MMM d, yyyy')}
        </span>
      )
    },
  },
  {
    accessorKey: 'paymentDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Payment Date' />
    ),
    cell: ({ row }) => {
      const paymentDate = row.getValue('paymentDate') as string
      return paymentDate ? format(new Date(paymentDate), 'MMM d, yyyy') : '-'
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge
          variant={status === 'PAID' ? 'default' : 'secondary'}
          className={status === 'PAID' ? 'bg-green-500 hover:bg-green-600' : ''}
        >
          {status}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'totalAmount',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title='Amount'
        className='justify-end'
      />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('totalAmount'))
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount)

      return <div className='text-right font-bold'>{formatted}</div>
    },
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      return <PayoutActionsCell row={row} />
    },
  },
]

function PayoutActionsCell({ row }: { row: any }) {
  const payout = row.original
  const exportMutation = useExportPayout()

  return (
    <div className='flex items-center justify-end gap-2'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <span className='sr-only'>Open menu</span>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            {/* @ts-ignore */}
            <Link
              to={'/_authenticated/vendor/payouts/$payoutid' as any}
              params={{ payoutid: row.original.id } as any}
              className='flex items-center'
            >
              <Eye className='mr-2 h-4 w-4' />
              View Details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={exportMutation.isPending}
            onSelect={(e) => e.preventDefault()}
            onClick={() =>
              exportMutation.mutate({
                id: payout.id,
                format: 'xlsx',
              })
            }
          >
            {exportMutation.isPending &&
            exportMutation.variables?.id === payout.id &&
            exportMutation.variables?.format === 'xlsx' ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <FileSpreadsheet className='mr-2 h-4 w-4' />
            )}
            Export Excel
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={exportMutation.isPending}
            onSelect={(e) => e.preventDefault()}
            onClick={() =>
              exportMutation.mutate({
                id: payout.id,
                format: 'pdf',
              })
            }
          >
            {exportMutation.isPending &&
            exportMutation.variables?.id === payout.id &&
            exportMutation.variables?.format === 'pdf' ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <FileText className='mr-2 h-4 w-4' />
            )}
            Export PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
