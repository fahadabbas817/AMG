import { useState } from 'react'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import api from '@/services/api'
import { CalendarIcon, Download, Loader2 } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useGetVendorPlatforms } from '@/features/vendor-dashboard/api/useGetVendorPlatforms'
import { useGetVendorStats } from '@/features/vendor-dashboard/api/useGetVendorStats'

export const Route = createFileRoute('/_authenticated/vendor/stats/')({
  component: VendorStatsPage,
})

function VendorStatsPage() {
  const navigate = useNavigate()
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'xlsx' | null>(
    null
  )

  const handleExport = (format: 'pdf' | 'xlsx') => {
    setExportingFormat(format)
    const filename = `stats-report.${format}`
    const params = new URLSearchParams()
    if (selectedPlatform !== 'all')
      params.append('platformId', selectedPlatform)
    if (date?.from) params.append('startDate', date.from.toISOString())
    if (date?.to) params.append('endDate', date.to.toISOString())
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

  const { data: platforms } = useGetVendorPlatforms()
  const { data: stats, isLoading } = useGetVendorStats({
    platformId: selectedPlatform === 'all' ? undefined : selectedPlatform,
    startDate: date?.from?.toISOString(),
    endDate: date?.to?.toISOString(),
  })

  // Calculate totals
  const totalRevenue = stats?.reduce((sum, item) => sum + item.total, 0) || 0

  return (
    <>
      <Header>
        <div className='flex items-center gap-4'>
          {/* Breadcrumb or Title placeholder */}
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <div className='flex flex-1 flex-col gap-4 p-8 pt-6'>
        <div className='flex items-center justify-between space-y-2'>
          <h2 className='text-3xl font-bold tracking-tight'>
            Performance Stats
          </h2>
        </div>

        <div className='flex flex-col gap-4 space-y-2 md:flex-row md:items-center md:space-y-0'>
          {/* Date Range Picker */}
          <div className={cn('grid gap-2')}>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id='date'
                  variant={'outline'}
                  className={cn(
                    'w-[300px] justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, 'LLL dd, y')} -{' '}
                        {format(date.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(date.from, 'LLL dd, y')
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  initialFocus
                  mode='range'
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Platform Selector */}
          <div className='w-[200px]'>
            <Select
              value={selectedPlatform}
              onValueChange={setSelectedPlatform}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select Platform' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Platforms</SelectItem>
                {platforms?.map((platform) => (
                  <SelectItem key={platform.id} value={platform.id}>
                    {platform.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='ml-auto flex gap-2'>
            <Button
              variant='secondary'
              onClick={() =>
                navigate({
                  to: '/vendor/stats/report',
                  search: {
                    platformId:
                      selectedPlatform === 'all' ? undefined : selectedPlatform,
                    startDate: date?.from?.toISOString(),
                    endDate: date?.to?.toISOString(),
                  },
                })
              }
            >
              View Detailed Report
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline'>
                  <Download className='mr-2 h-4 w-4' />
                  Export
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

        {/* Stats Table */}
        <Card className='h-full'>
          <CardHeader>
            <CardTitle>Detailed Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Studio</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className='text-right'>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className='h-24 text-center'>
                        Loading stats...
                      </TableCell>
                    </TableRow>
                  ) : stats && stats.length > 0 ? (
                    stats.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className='font-medium'>
                          {item.title}
                        </TableCell>
                        <TableCell>{item.studio}</TableCell>
                        <TableCell>
                          <span className='focus:ring-ring bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none'>
                            {item.platform}
                          </span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(item.periodStart), 'MMM yyyy')}
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
                        <TableCell className='text-right'>
                          ${item.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className='h-24 text-center'>
                        No records found for selected filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {/* Footer Total */}
                {stats && stats.length > 0 && (
                  <TableBody>
                    <TableRow className='bg-muted/50 font-bold'>
                      <TableCell colSpan={4} className='text-right'>
                        Total:
                      </TableCell>
                      <TableCell className='text-right'>
                        ${totalRevenue.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
