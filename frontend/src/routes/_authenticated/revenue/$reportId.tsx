import { useState } from 'react'
import { format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import api from '@/services/api'
import { ArrowLeft, Calendar, FileText, DollarSign, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const Route = createFileRoute('/_authenticated/revenue/$reportId')({
  component: RevenueReportDetailsPage,
})

function RevenueReportDetailsPage() {
  const { reportId } = Route.useParams()
  const { data: report, isLoading } = useQuery({
    queryKey: ['revenue-report', reportId],
    queryFn: async () => {
      const res = await api.get(`/revenue/${reportId}`)
      return res.data
    },
  })

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // Define Columns for Raw Records
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'lineItemName',
      header: 'Title',
      cell: ({ row }) => (
        <div
          className='max-w-[300px] truncate'
          title={row.getValue('lineItemName')}
        >
          {row.getValue('lineItemName') || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: 'rawVendorName',
      header: 'Sub-label (Raw)',
      cell: ({ row }) => (
        <span className='font-mono text-xs'>
          {row.getValue('rawVendorName')}
        </span>
      ),
    },
    {
      accessorKey: 'vendor',
      header: 'Matched Vendor',
      cell: ({ row }) => {
        const vendor = row.original.vendor
        return vendor ? (
          <div className='flex flex-col'>
            <span className='text-xs font-medium'>{vendor.companyName}</span>
            <span className='text-muted-foreground text-[10px]'>
              {vendor.vendorNumber}
            </span>
          </div>
        ) : (
          <span className='text-muted-foreground text-xs italic'>
            Unmatched
          </span>
        )
      },
    },
    {
      accessorKey: 'grossRevenue',
      header: () => <div className='text-right'>Gross</div>,
      cell: ({ row }) => (
        <div className='text-right font-mono'>
          ${Number(row.getValue('grossRevenue')).toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const variant =
          status === 'MATCHED'
            ? 'default'
            : status === 'UNPROCESSED'
              ? 'secondary'
              : 'destructive'
        return (
          <Badge variant={variant} className='text-[10px]'>
            {status}
          </Badge>
        )
      },
    },
  ]

  const table = useReactTable({
    data: report?.records || [],
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        Loading Report...
      </div>
    )
  }

  if (!report) {
    return <div className='p-8'>Report not found.</div>
  }

  return (
    <div className='container mx-auto max-w-6xl space-y-8 py-8'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' asChild>
            <Link to='/revenue/list'>
              <ArrowLeft className='h-5 w-5' />
            </Link>
          </Button>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              {report.filename}
            </h1>
            <div className='text-muted-foreground mt-1 flex items-center gap-2 text-sm'>
              <Badge variant='outline'>{report.platform.name}</Badge>
              <span>•</span>
              <Calendar className='h-3 w-3' />{' '}
              {format(new Date(report.month), 'MMMM yyyy')}
              <span>•</span>
              <span>Uploaded {format(new Date(report.uploadDate), 'PP')}</span>
            </div>
          </div>
        </div>
        <div className='text-right'>
          <div className='text-muted-foreground text-sm'>Total Expected</div>
          <div className='text-primary text-2xl font-bold'>
            {report.totalAmount
              ? `$${Number(report.totalAmount).toLocaleString()}`
              : 'N/A'}
          </div>
        </div>
      </div>

      {/* Generated Payouts Section */}
      <div className='space-y-4'>
        <h2 className='flex items-center gap-2 text-lg font-semibold'>
          <DollarSign className='h-5 w-5 text-green-600' />
          Generated Payouts ({report.payouts?.length || 0})
        </h2>
        {report.payouts?.length > 0 ? (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {report.payouts.map((payout: any) => (
              <Card
                key={payout.id}
                className='hover:border-primary/50 transition-colors'
              >
                <CardHeader className='flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-2'>
                  <div className='text-lg font-bold'>
                    #{payout.payoutNumber}
                  </div>
                  <Badge
                    variant={payout.status === 'PAID' ? 'default' : 'secondary'}
                  >
                    {payout.status}
                  </Badge>
                </CardHeader>
                <CardContent className='px-4 pb-4'>
                  <div
                    className='mb-1 truncate text-sm font-medium'
                    title={payout.vendor.companyName}
                  >
                    {payout.vendor.companyName}
                  </div>
                  <div className='text-2xl font-bold text-green-700'>
                    ${Number(payout.totalAmount).toLocaleString()}
                  </div>
                  <div className='mt-4 flex justify-end'>
                    <Button
                      size='sm'
                      variant='outline'
                      asChild
                      className='w-full'
                    >
                      <Link
                        to='/payouts/$payoutId'
                        params={{ payoutId: payout.id }}
                      >
                        View Payout
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className='bg-muted/20 text-muted-foreground rounded-md border p-8 text-center'>
            No payouts have been generated from this report yet.
          </div>
        )}
      </div>

      {/* Raw Records Section */}
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h2 className='flex items-center gap-2 text-lg font-semibold'>
            <FileText className='h-5 w-5 text-blue-600' />
            Raw Records ({report.records?.length || 0})
          </h2>
          <div className='flex items-center gap-2'>
            <div className='relative'>
              <Search className='text-muted-foreground absolute top-2.5 left-2 h-4 w-4' />
              <Input
                placeholder='Search records...'
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className='w-[250px] pl-8'
              />
            </div>
          </div>
        </div>

        <div className='bg-card rounded-md border'>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='h-24 text-center'
                  >
                    No records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className='flex items-center justify-end space-x-2 py-4'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
