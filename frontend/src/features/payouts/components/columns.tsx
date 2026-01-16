import { useState } from 'react'
import { format } from 'date-fns'
import { Link } from '@tanstack/react-router'
import { ColumnDef } from '@tanstack/react-table'
import api from '@/services/api'
import {
  Loader2,
  MoreHorizontal,
  Eye,
  FileSpreadsheet,
  FileText,
  Save,
  Trash2,
  AlertCircle,
  UploadCloud,
  CheckCircle2,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { useDeletePayout } from '../api/useDeletePayout'
import { useExportPayout } from '../api/useExportPayout'
import { useSettlePayout } from '../api/useSettlePayout'
import { useSyncPayout } from '../api/useSyncPayout'
import { Payout } from '../types'
import { LinkVendorDialog } from './link-vendor-dialog'

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
    id: 'sync',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='QBO Sync' />
    ),
    cell: ({ row }) => <SyncStatusCell payout={row.original} />,
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row, table }) => {
      return <PayoutActionsCell row={row} table={table} />
    },
  },
]

function SyncStatusCell({ payout }: { payout: Payout }) {
  const syncMutation = useSyncPayout()
  const [showLinkDialog, setShowLinkDialog] = useState(false)

  const isSynced = payout.syncStatus === 'SYNCED' || !!payout.qbBillId
  const isFailed = payout.syncStatus === 'FAILED'
  const isPending =
    payout.syncStatus === 'PENDING_SYNC' || syncMutation.isPending

  const handleSync = () => {
    if (!payout.vendor.qbVendorId) {
      setShowLinkDialog(true)
      return
    }
    syncMutation.mutate(payout.id)
  }

  if (isSynced) {
    return (
      <div className='flex items-center gap-2 text-green-600'>
        <CheckCircle2 className='h-4 w-4' />
        <span className='text-xs font-medium'>Synced</span>
      </div>
    )
  }

  return (
    <>
      <div className='flex items-center gap-2'>
        {isFailed && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className='h-4 w-4 text-red-500' />
              </TooltipTrigger>
              <TooltipContent>
                <p>Sync Failed. Click to retry.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <Button
          size='sm'
          variant={isFailed ? 'destructive' : 'outline'}
          className='h-7 gap-1 text-xs'
          onClick={handleSync}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className='h-3 w-3 animate-spin' />
          ) : (
            <UploadCloud className='h-3 w-3' />
          )}
          {isFailed ? 'Retry' : 'Sync'}
        </Button>
      </div>

      <LinkVendorDialog
        isOpen={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
        vendorId={payout.vendor.id}
        vendorName={payout.vendor.companyName}
      />
    </>
  )
}

function PayoutActionsCell({ row, table }: { row: any; table: any }) {
  const payout = row.original
  const meta = table.options.meta as PayoutsTableMeta
  const dateValue = meta?.dates[payout.id]

  const settleMutation = useSettlePayout()
  const exportMutation = useExportPayout()
  const deleteMutation = useDeletePayout()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleSettle = () => {
    if (!dateValue) return
    settleMutation.mutate({ id: payout.id, paymentDate: dateValue })
  }

  const handleExport = (format: 'pdf' | 'xlsx') => {
    window.open(
      `${api.defaults.baseURL}/payout/${payout.id}/export?format=${format}`,
      '_blank'
    )
  }

  return (
    <>
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
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(payout.id)}
            >
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                to={'/_authenticated/payouts/$payoutId' as any}
                params={{ payoutId: payout.id } as any}
              >
                <Eye className='mr-2 h-4 w-4' />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('xlsx')}>
              <FileSpreadsheet className='mr-2 h-4 w-4' />
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

            <DropdownMenuSeparator />
            {/* DELETE ACTION */}
            {payout.status !== 'PAID' && (
              <DropdownMenuItem
                className='text-red-600 focus:text-red-600'
                onSelect={(e) => e.preventDefault()}
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Delete Report
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title='Delete Payout Report?'
        description='Are you sure you want to delete this payout report? This will revert the revenue records to "Unpaid" status. If synced to QuickBooks, the Bill will also be deleted.'
        onConfirm={() => deleteMutation.mutate(payout.id)}
        isPending={deleteMutation.isPending}
      />
    </>
  )
}
