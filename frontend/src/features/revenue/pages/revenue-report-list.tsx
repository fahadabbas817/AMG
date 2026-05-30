import { useState } from 'react'
import { format } from 'date-fns'
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import api from '@/services/api'
import {
  Trash,
  MoreHorizontal,
  Eye,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Main } from '@/components/layout/main'

// Type definitions
interface RevenueReport {
  id: string
  filename: string
  uploadDate: string
  month: string
  status: 'PENDING' | 'PROCESSED' | 'ERROR'
  totalAmount: number | null
  invoiceRef: string | null
  platform: {
    id: string
    name: string
  }
  payoutCount: number // Enhanced field
  _count: {
    records: number
    // payouts: number; // Schema doesn't support this directly, aggregated in backend
  }
}

interface ReportsResponse {
  data: RevenueReport[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface DeleteConfig {
  id: string | null
  payoutCount: number
  open: boolean
  step: 'CONFIRM' | 'STRATEGY'
}

export default function RevenueReportList() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [deleteConfig, setDeleteConfig] = useState<DeleteConfig>({
    id: null,
    payoutCount: 0,
    open: false,
    step: 'CONFIRM',
  })

  // FETCH REPORTS
  const { data, isLoading } = useQuery<ReportsResponse>({
    queryKey: ['revenue-reports', page, search],
    queryFn: async () => {
      const res = await api.get('/revenue', {
        params: { page, limit: 10, search },
      })
      return res.data
    },
    placeholderData: keepPreviousData,
  })

  // DELETE MUTATION
  const deleteMutation = useMutation({
    mutationFn: async ({
      id,
      force = false,
      deletePayouts = false,
    }: {
      id: string
      force?: boolean
      deletePayouts?: boolean
    }) => {
      await api.delete(`/revenue/${id}`, {
        params: { force, deletePayouts },
      })
    },
    onSuccess: () => {
      toast.success('Report deleted successfully')
      setDeleteConfig({ ...deleteConfig, open: false })
      queryClient.invalidateQueries({ queryKey: ['revenue-reports'] })
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || 'Failed to delete report'
      // If 409 Conflict (Linked Payouts), we might want to handle it (though we pre-check now)
      toast.error(message)
    },
  })

  // HANDLERS
  const handleDeleteClick = (report: RevenueReport) => {
    if (report.payoutCount > 0) {
      // Show Strategy Dialog
      setDeleteConfig({
        id: report.id,
        payoutCount: report.payoutCount,
        open: true,
        step: 'STRATEGY',
      })
    } else {
      // Simple Confirm
      setDeleteConfig({
        id: report.id,
        payoutCount: 0,
        open: true,
        step: 'CONFIRM',
      })
    }
  }

  const confirmDelete = (deletePayouts = false) => {
    if (!deleteConfig.id) return
    deleteMutation.mutate({
      id: deleteConfig.id,
      force: deleteConfig.payoutCount > 0, // Force if payouts exist
      deletePayouts: deletePayouts,
    })
  }

  return (
    <>
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>
              Revenue Reports
            </h1>
            <p className='text-muted-foreground'>
              Manage uploaded revenue files and track processing status.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button asChild variant='outline'>
              <Link to='/revenue/upload'>Upload New Report</Link>
            </Button>
          </div>
        </div>

        {/* FILTERS */}
        <div className='flex items-center space-x-2'>
          <div className='relative max-w-sm flex-1'>
            <Search className='text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4' />
            <Input
              placeholder='Search filenames...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='pl-8'
            />
          </div>
        </div>

        {/* TABLE */}
        <div className='bg-card overflow-x-auto rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Invoice/Ref</TableHead>
                <TableHead>Report Month</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='text-right'>Records</TableHead>
                <TableHead className='text-right'>Payouts</TableHead>
                <TableHead className='text-right'>Total Amount</TableHead>
                <TableHead className='w-[70px]'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className='h-24 text-center'>
                    <div className='flex items-center justify-center gap-2'>
                      <Loader2 className='h-4 w-4 animate-spin' /> Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className='h-24 text-center'>
                    No reports found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((report: RevenueReport) => (
                  <TableRow key={report.id}>
                    <TableCell className='font-medium'>
                      <div className='flex flex-col'>
                        <span>{report.filename}</span>
                        <span className='text-muted-foreground text-xs'>
                          {format(new Date(report.uploadDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant='outline'>{report.platform.name}</Badge>
                    </TableCell>
                    <TableCell className='text-muted-foreground'>
                      {report.invoiceRef || report.filename}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1.5'>
                        <Calendar className='text-muted-foreground h-3 w-3' />
                        {report.month
                          ? format(new Date(report.month), 'MMMM yyyy')
                          : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={report.status} />
                    </TableCell>
                    <TableCell className='text-right'>
                      {report._count.records.toLocaleString()}
                    </TableCell>
                    <TableCell className='text-right'>
                      {report.payoutCount > 0 ? (
                        <Badge
                          variant='secondary'
                          className='bg-blue-50 text-blue-700 hover:bg-blue-50'
                        >
                          {report.payoutCount} Linked
                        </Badge>
                      ) : (
                        <span className='text-muted-foreground'>-</span>
                      )}
                    </TableCell>
                    <TableCell className='text-right font-medium'>
                      {report.totalAmount
                        ? `$${Number(report.totalAmount).toLocaleString()}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='icon'>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link
                              to='/revenue/$reportId'
                              params={{ reportId: report.id }}
                            >
                              <Eye className='mr-2 h-4 w-4' /> View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(report)}
                            className='text-destructive focus:text-destructive'
                          >
                            <Trash className='mr-2 h-4 w-4' /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION */}
        {data?.meta && (
          <div className='flex items-center justify-end space-x-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <span className='text-muted-foreground text-sm'>
              Page {page} of {data.meta.totalPages}
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.meta.totalPages || isLoading}
            >
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
        )}

        {/* DELETION DIALOG */}
        <Dialog
          open={deleteConfig.open}
          onOpenChange={(open) =>
            setDeleteConfig((prev) => ({ ...prev, open }))
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {deleteConfig.step === 'STRATEGY'
                  ? 'Warning: Linked Payouts Detected'
                  : 'Delete Revenue Report?'}
              </DialogTitle>
              <DialogDescription asChild>
                <div>
                  {deleteConfig.step === 'STRATEGY' ? (
                    <div className='space-y-4 pt-4'>
                      <div className='flex items-start gap-4 rounded-md bg-amber-50 p-4 text-amber-800'>
                        <AlertTriangle className='mt-0.5 h-5 w-5 shrink-0' />
                        <div className='text-sm'>
                          This report is linked to{' '}
                          <strong>{deleteConfig.payoutCount} payout(s)</strong>.
                          Deleting it will affect these financial records.
                        </div>
                      </div>
                      <p>Please choose an action:</p>
                    </div>
                  ) : (
                    'Are you sure you want to delete this report? This action cannot be undone and will remove all associated revenue records.'
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className='gap-2 sm:gap-0'>
              <Button
                variant='ghost'
                onClick={() =>
                  setDeleteConfig((prev) => ({ ...prev, open: false }))
                }
              >
                Cancel
              </Button>

              {deleteConfig.step === 'STRATEGY' ? (
                <>
                  <Button
                    variant='outline'
                    className='border-amber-200 text-amber-700 hover:bg-amber-50'
                    onClick={() => confirmDelete(false)} // Unlink
                    disabled={deleteMutation.isPending}
                  >
                    Unlink Payouts (Safe)
                  </Button>
                  <Button
                    variant='destructive'
                    onClick={() => confirmDelete(true)} // Cascade Delete
                    disabled={deleteMutation.isPending}
                  >
                    Delete Everything
                  </Button>
                </>
              ) : (
                <Button
                  variant='destructive'
                  onClick={() => confirmDelete(false)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Report'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Main>
    </>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    PROCESSED: 'bg-green-100 text-green-800 border-green-200',
    ERROR: 'bg-red-100 text-red-800 border-red-200',
  }
  return (
    <span
      className={`focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
        styles[status as keyof typeof styles] || styles.PENDING
      }`}
    >
      {status}
    </span>
  )
}
