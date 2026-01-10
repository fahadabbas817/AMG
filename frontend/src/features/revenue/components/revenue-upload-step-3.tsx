import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useGetRevenueReportSummary } from '../api/useGetRevenueReportSummary'
import { useSyncRevenueReport } from '../api/useSyncRevenueReport'

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

interface Props {
  reportId: string
  invoiceNumber?: string
}

export const RevenueUploadStep3 = ({ reportId, invoiceNumber }: Props) => {
  const navigate = useNavigate()
  const {
    data: summary,
    isLoading,
    error,
  } = useGetRevenueReportSummary(reportId)
  const syncMutation = useSyncRevenueReport()

  const [currentInvoiceRef, setCurrentInvoiceRef] = useState(
    invoiceNumber || ''
  )

  useEffect(() => {
    if (summary?.invoiceRef) {
      setCurrentInvoiceRef(summary.invoiceRef)
    } else if (invoiceNumber) {
      setCurrentInvoiceRef(invoiceNumber)
    }
  }, [summary, invoiceNumber])

  const handleSync = async () => {
    try {
      const result = await syncMutation.mutateAsync({
        reportId,
        invoiceRef: currentInvoiceRef,
      })

      const failures = result.failures?.length || 0
      const processed = result.processed || 0

      if (failures > 0) {
        toast.warning(
          `Sync completed with ${failures} errors. ${processed} processed.`
        )
      } else {
        toast.success('Sync completed successfully!')
      }

      // Navigate to dashboard or payouts
      navigate({ to: '/' })
    } catch (err: any) {
      toast.error('Failed to sync: ' + err.message)
    }
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Loader2 className='text-primary h-8 w-8 animate-spin' />
        <span className='text-muted-foreground ml-3'>Loading summary...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className='text-destructive py-10 text-center'>
        <AlertTriangle className='mx-auto mb-2 h-10 w-10' />
        <p>Failed to load report summary.</p>
      </div>
    )
  }

  if (!summary) return null

  const totalNet = summary.vendors.reduce(
    (acc: number, v: any) => acc + Number(v.net),
    0
  )

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Pre-Sync Review</CardTitle>
          <CardDescription>
            Review the calculated payouts for each vendor before syncing to
            QuickBooks.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex flex-col items-end gap-4 md:flex-row'>
            <div className='flex-1 space-y-2'>
              <Label htmlFor='invoice-ref'>
                Platform Invoice Reference Number
              </Label>
              <Input
                id='invoice-ref'
                value={currentInvoiceRef}
                onChange={(e) => setCurrentInvoiceRef(e.target.value)}
                placeholder='e.g. AEBN-2025-05'
              />
              <p className='text-muted-foreground text-xs'>
                This reference will be assigned to the QuickBooks Bills.
              </p>
            </div>
            <div className='bg-muted/20 flex items-center gap-4 rounded-md border p-3'>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Total Payout
                </p>
                <p className='text-xl font-bold'>{formatCurrency(totalNet)}</p>
              </div>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Vendors
                </p>
                <p className='text-xl font-bold'>{summary.vendors.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className='p-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead className='text-right'>Gross Revenue</TableHead>
                <TableHead className='text-right'>AMG Commission</TableHead>
                <TableHead className='text-right'>Net Payout</TableHead>
                <TableHead className='text-center'>QBO Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.vendors.map((vendor: any) => (
                <TableRow key={vendor.vendorId}>
                  <TableCell className='font-medium'>
                    {vendor.vendorName}
                    <div className='text-muted-foreground text-xs'>
                      Rate: {(vendor.rate * 100).toFixed(1)}%
                    </div>
                  </TableCell>
                  <TableCell className='text-right'>
                    {formatCurrency(vendor.gross)}
                  </TableCell>
                  <TableCell className='text-destructive text-right'>
                    {formatCurrency(vendor.commission)}
                  </TableCell>
                  <TableCell className='text-right font-bold text-green-600'>
                    {formatCurrency(vendor.net)}
                  </TableCell>
                  <TableCell className='text-center'>
                    {vendor.qbVendorId ? (
                      <span className='inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800'>
                        Linked
                      </span>
                    ) : (
                      <span className='inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800'>
                        Not Linked
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className='flex justify-end gap-3'>
        <Button variant='outline' onClick={() => navigate({ to: '/' })}>
          Cancel
        </Button>
        <Button
          onClick={handleSync}
          disabled={syncMutation.isPending}
          className='w-40'
        >
          {syncMutation.isPending && (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          )}
          Confirm & Sync
        </Button>
      </div>
    </div>
  )
}
