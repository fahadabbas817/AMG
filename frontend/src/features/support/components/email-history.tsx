import { useState } from 'react'
import { format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { getEmailLogs } from '@/services/api'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function EmailHistory() {
  const [page, setPage] = useState(1)
  const limit = 10

  const { data, isLoading, isError } = useQuery({
    queryKey: ['email-logs', page],
    queryFn: () => getEmailLogs({ page, limit }),
  })

  const logs = data?.data || []
  const meta = data?.meta || { total: 0, lastPage: 1 }

  const columns = [
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }: any) =>
        format(new Date(row.original.createdAt), 'MMM dd, yyyy HH:mm'),
    },
    {
      accessorKey: 'subject',
      header: 'Subject',
    },
    {
      accessorKey: 'recipientCount',
      header: 'Recipients',
      cell: ({ row }: any) => (
        <span className='font-medium'>{row.original.recipientCount}</span>
      ),
    },
    {
      accessorKey: 'sentBy',
      header: 'Sent By',
      cell: ({ row }: any) => (
        <span className='text-muted-foreground text-sm'>
          {row.original.sentBy || 'System'}
        </span>
      ),
    },
  ]

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) {
    return (
      <div className='flex justify-center p-8'>
        <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    )
  }

  if (isError) {
    return (
      <div className='text-destructive p-4'>Failed to load email history.</div>
    )
  }

  return (
    <Card className='border-0 shadow-none'>
      <CardHeader className='px-0 pt-0'>
        <CardTitle>Email History</CardTitle>
      </CardHeader>
      <CardContent className='px-0'>
        <div className='rounded-md border'>
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
                    No emails sent yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className='flex items-center justify-end space-x-2 py-4'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className='h-4 w-4' />
            Previous
          </Button>
          <span className='text-muted-foreground text-sm'>
            Page {page} of {meta.lastPage}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage((p) => Math.min(meta.lastPage, p + 1))}
            disabled={page >= meta.lastPage}
          >
            Next
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
