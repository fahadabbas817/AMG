import { format } from 'date-fns'
import { Link } from '@tanstack/react-router'
import { ColumnDef } from '@tanstack/react-table'
import {
  Loader2,
  MoreHorizontal,
  Eye,
  FileSpreadsheet,
  FileText,
  Save,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { useExportPayout } from '../api/useExportPayout'
import { useSettlePayout } from '../api/useSettlePayout'
import { Payout } from '../types'

// Define the shape of our table meta to include the dates state
interface PayoutsTableMeta {
  dates: Record<string, string>
  setDates: React.Dispatch<React.SetStateAction<Record<string, string>>>
}

export const columns: ColumnDef<Payout>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
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
    id: 'vendor',
    accessorFn: (row) => row.vendor.companyName,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Vendor' />
    ),
    cell: ({ row }) => {
      const vendor = row.original.vendor
      return (
        <div className='flex flex-col space-y-1'>
          <span className='max-w-[200px] truncate font-medium'>
            {vendor.companyName}
          </span>
          <span className='text-muted-foreground text-xs'>
            {vendor.vendorNumber}
          </span>
        </div>
      )
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
    accessorKey: 'paymentDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Payment Date' />
    ),
    cell: ({ row, table }) => {
      const status = row.getValue('status') as string
      const paymentDate = row.getValue('paymentDate') as string

      const meta = table.options.meta as PayoutsTableMeta
      const dateValue = meta?.dates[row.original.id] || ''

      if (status === 'PAID') {
        return paymentDate ? format(new Date(paymentDate), 'MMM d, yyyy') : '-'
      }

      return (
        <Input
          type='date'
          value={dateValue}
          onChange={(e) => {
            meta?.setDates((prev) => ({
              ...prev,
              [row.original.id]: e.target.value,
            }))
          }}
          className='h-8 w-[150px]'
        />
      )
    },
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row, table }) => {
      return <PayoutActionsCell row={row} table={table} />
    },
  },
]

function PayoutActionsCell({ row, table }: { row: any; table: any }) {
  const payout = row.original
  const meta = table.options.meta as PayoutsTableMeta
  const dateValue = meta?.dates[payout.id]

  const settleMutation = useSettlePayout()
  const exportMutation = useExportPayout()

  const handleSettle = () => {
    if (!dateValue) return
    settleMutation.mutate({ id: payout.id, paymentDate: dateValue })
  }

  return (
    <div className='flex items-center justify-end gap-2'>
      {payout.status !== 'PAID' && (
        <Button
          size='sm'
          variant='outline'
          onClick={handleSettle}
          disabled={!dateValue || settleMutation.isPending}
          className='h-8'
        >
          {settleMutation.isPending &&
          settleMutation.variables?.id === payout.id ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <>
              <Save className='mr-2 h-4 w-4' /> Settle
            </>
          )}
        </Button>
      )}

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
            <Link
              to='/payouts/$payoutId'
              params={{ payoutId: payout.id }}
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
