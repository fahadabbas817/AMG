import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

interface Props {
  summary: any // In-memory summary from Dry Run
  onConfirm: () => void
  isSaving: boolean
  invoiceNumber?: string
}

export const RevenueUploadStep3 = ({
  summary,
  onConfirm,
  isSaving,
  invoiceNumber,
}: Props) => {
  const navigate = useNavigate()
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

  if (!summary) return null

  const totalNet = summary.vendors.reduce(
    (acc: number, v: any) => acc + Number(v.net),
    0
  )

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Pre-Save Review</CardTitle>
          <CardDescription>
            Review the calculated payouts. These records have NOT been saved
            yet. Click "Confirm & Sync" to save to database and create bills.
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
                disabled={isSaving}
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

      {/* Unmatched Section */}
      {summary.unmatched && summary.unmatched.length > 0 && (
        <Card className='border-destructive/50'>
          <CardHeader>
            <CardTitle className='text-destructive'>
              Aggregated Unmatched Items ({summary.unmatched.length})
            </CardTitle>
            <CardDescription>
              The following sub-labels/vendors could not be matched. These
              totals represent multiple items.
            </CardDescription>
          </CardHeader>
          <CardContent className='p-0'>
            <div className='max-h-96 overflow-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Raw Vendor Name (Sub-label)</TableHead>
                    <TableHead className='text-right'>Records Count</TableHead>
                    <TableHead className='text-right'>
                      Total Gross Revenue
                    </TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.unmatched.map((item: any, idx: number) => (
                    <TableRow key={idx} className='bg-red-50/50'>
                      <TableCell className='font-mono text-sm font-semibold'>
                        {item.rawVendorName || '(Empty)'}
                      </TableCell>
                      <TableCell className='text-muted-foreground text-right text-sm'>
                        {item.count} items
                      </TableCell>
                      <TableCell className='text-right font-medium'>
                        {formatCurrency(Number(item.grossRevenue))}
                      </TableCell>
                      <TableCell>
                        <span className='inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800'>
                          Unmatched
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className='flex justify-end gap-3'>
        <Button
          variant='outline'
          onClick={() => navigate({ to: '/' })}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={isSaving} className='w-40'>
          {isSaving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
          Confirm & Sync
        </Button>
      </div>
    </div>
  )
}
