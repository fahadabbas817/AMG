import { useState } from 'react'
import { format } from 'date-fns'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import api from '@/services/api'
import { ChevronLeft, Download, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import {
  useGetVendorStats,
  VendorStatRecord,
} from '@/features/vendor-dashboard/api/useGetVendorStats'

// Define search params schema
interface StatsSearch {
  platformId?: string
  startDate?: string
  endDate?: string
}

export const Route = createFileRoute('/_authenticated/vendor/stats/report')({
  component: StatsReportPage,
  validateSearch: (search: Record<string, unknown>): StatsSearch => {
    return {
      platformId: (search.platformId as string) || undefined,
      startDate: (search.startDate as string) || undefined,
      endDate: (search.endDate as string) || undefined,
    }
  },
})

function StatsReportPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: Route.id })
  const { data: stats, isLoading } = useGetVendorStats(search)
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'xlsx' | null>(
    null
  )

  // Group data by "Platform: YYYY-MM"
  const groupedData = new Map<string, VendorStatRecord[]>()
  if (stats) {
    stats.forEach((item) => {
      const date = new Date(item.periodStart)
      const key = `${item.platform}: ${format(date, 'yyyy-MM')}`
      if (!groupedData.has(key)) {
        groupedData.set(key, [])
      }
      groupedData.get(key)!.push(item)
    })
  }

  const handleExport = (format: 'pdf' | 'xlsx') => {
    setExportingFormat(format)
    const filename = `stats-report.${format}`
    const params = new URLSearchParams()
    if (search.platformId) params.append('platformId', search.platformId)
    if (search.startDate) params.append('startDate', search.startDate)
    if (search.endDate) params.append('endDate', search.endDate)
    params.append('format', format)

    api
      .get(`/vendor/dashboard/stats/export?${params.toString()}`, {
        responseType: 'blob',
      })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', filename)
        document.body.appendChild(link)
        link.click()
        link.remove()
      })
      .catch((err) => {
        console.error('Export failed', err)
      })
      .finally(() => {
        setExportingFormat(null)
      })
  }

  return (
    <>
      <Main>
        <div className='flex flex-1 flex-col gap-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => navigate({ to: '/vendor' })}
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <h2 className='text-3xl font-bold tracking-tight'>
                Detailed Report
              </h2>
            </div>
            <div className='flex gap-2'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline'>
                    <Download className='mr-2 h-4 w-4' />
                    Export Report
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem
                    disabled={exportingFormat === 'pdf'}
                    onClick={() => handleExport('pdf')}
                  >
                    {exportingFormat === 'pdf' ? (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    ) : null}
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={exportingFormat === 'xlsx'}
                    onClick={() => handleExport('xlsx')}
                  >
                    {exportingFormat === 'xlsx' ? (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    ) : null}
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <Card className='h-full'>
            <CardHeader>
              <CardTitle>Report Data</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
                </div>
              ) : !stats || stats.length === 0 ? (
                <div className='text-muted-foreground py-8 text-center'>
                  No records found for the selected period.
                </div>
              ) : (
                <div className='rounded-md border'>
                  <Table>
                    {Array.from(groupedData.entries()).map(
                      ([groupKey, items]) => {
                        // Determine dynamic headers for this group
                        const metadataKeys = Array.from(
                          new Set(
                            items.flatMap((item) =>
                              item.metadata && typeof item.metadata === 'object'
                                ? Object.keys(item.metadata)
                                : []
                            )
                          )
                        ).sort()

                        const subTotalRevenue = items.reduce(
                          (sum, i) => sum + i.total,
                          0
                        )

                        return (
                          <TableBody
                            key={groupKey}
                            className='border-b-4 border-double last:border-0'
                          >
                            {/* Group Header */}
                            <TableRow className='bg-muted hover:bg-muted'>
                              <TableCell
                                colSpan={metadataKeys.length + 5}
                                className='text-lg font-bold'
                              >
                                {groupKey}
                              </TableCell>
                            </TableRow>

                            {/* Column Headers */}
                            <TableRow className='bg-muted/50'>
                              <TableHead>Title</TableHead>
                              <TableHead>Status</TableHead>
                              {metadataKeys.map((key) => (
                                <TableHead key={key}>{key}</TableHead>
                              ))}
                              <TableHead>Studio</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead className='text-right'>
                                Total
                              </TableHead>
                            </TableRow>

                            {/* Items */}
                            {items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className='font-medium'>
                                  {item.title}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={cn(
                                      'focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none',
                                      item.status === 'PAID' &&
                                        'border-transparent bg-green-500 text-white hover:bg-green-600',
                                      item.status === 'PENDING_PAYMENT' &&
                                        'border-transparent bg-yellow-500 text-white hover:bg-yellow-600',
                                      item.status === 'UNPROCESSED' &&
                                        'border-transparent bg-gray-500 text-white hover:bg-gray-600'
                                    )}
                                  >
                                    {item.status === 'PENDING_PAYMENT'
                                      ? 'PENDING'
                                      : item.status}
                                  </span>
                                </TableCell>
                                {metadataKeys.map((key) => (
                                  <TableCell key={key}>
                                    {(item.metadata as any)?.[key] ?? '-'}
                                  </TableCell>
                                ))}
                                <TableCell>{item.studio}</TableCell>
                                <TableCell>
                                  {format(
                                    new Date(item.periodStart),
                                    'MMM dd, yyyy'
                                  )}
                                </TableCell>
                                <TableCell className='text-right'>
                                  ${item.total.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}

                            {/* Group Subtotal */}
                            <TableRow className='bg-muted/20 font-bold'>
                              <TableCell
                                colSpan={1 + metadataKeys.length + 2}
                                className='text-right'
                              >
                                Subtotal:
                              </TableCell>
                              <TableCell className='text-right'>
                                ${subTotalRevenue.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        )
                      }
                    )}
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
