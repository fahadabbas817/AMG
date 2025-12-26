import { useState } from 'react'
import { format } from 'date-fns'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  Loader2,
  ArrowLeft,
  Download,
  Save,
  Printer,
  Building2,
  Hash,
  Calendar,
  CheckCircle2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { useExportPayout } from '@/features/payouts/api/useExportPayout'
import { useGetPayout } from '@/features/payouts/api/useGetPayout'
import { useSettlePayout } from '@/features/payouts/api/useSettlePayout'

export const Route = createFileRoute('/_authenticated/payouts/$payoutId')({
  component: PayoutDetailsPage,
})

function PayoutDetailsPage() {
  const { payoutId } = Route.useParams()
  const { data: payout, isLoading } = useGetPayout(payoutId)
  const exportMutation = useExportPayout()
  const settleMutation = useSettlePayout()
  const [paymentDate, setPaymentDate] = useState('')

  if (isLoading) {
    return (
      <div className='flex h-96 items-center justify-center'>
        <Loader2 className='text-primary h-8 w-8 animate-spin' />
      </div>
    )
  }

  if (!payout) {
    return <div>Payout not found</div>
  }

  // Calculate Grouped Summary (Monies Owed)
  const summaryMap = new Map<
    string,
    {
      platform: string
      month: string
      gross: number
      commission: number
      net: number
    }
  >()

  payout.items.forEach((item: any) => {
    const key = `${item.platform.name}-${item.periodStart}`
    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        platform: item.platform.name,
        month: item.periodStart,
        gross: 0,
        commission: 0,
        net: 0,
      })
    }
    const entry = summaryMap.get(key)!
    entry.gross += Number(item.grossRevenue)
    entry.commission += Number(item.amgCommission)
    entry.net += Number(item.vendorNet)
  })

  const summary = Array.from(summaryMap.values())
  const totalGross = summary.reduce((acc, curr) => acc + curr.gross, 0)
  const totalNet = summary.reduce((acc, curr) => acc + curr.net, 0)

  // Group Details by Platform
  const detailsByPlatform = new Map<string, any[]>()
  payout.items.forEach((item: any) => {
    const key = `${item.platform.name}: ${format(new Date(item.periodStart), `MMMM yyyy`)}`
    if (!detailsByPlatform.has(key)) {
      detailsByPlatform.set(key, [])
    }
    detailsByPlatform.get(key)!.push(item)
  })

  return (
    <div className='container mx-auto max-w-5xl space-y-8 py-8'>
      {/* Top Navigation & Actions */}
      <div className='flex flex-col items-start justify-between gap-4 md:flex-row md:items-center'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='sm' asChild>
            <Link to='/payouts'>
              <ArrowLeft className='mr-2 h-4 w-4' /> Back to Payouts
            </Link>
          </Button>
          <h1 className='text-2xl font-bold tracking-tight'>
            Payout #{payout.payoutNumber}
          </h1>
          <Badge
            variant={payout.status === 'PAID' ? 'default' : 'secondary'}
            className={payout.status === 'PAID' ? 'bg-green-600' : ''}
          >
            {payout.status}
          </Badge>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={exportMutation.isPending}
            onClick={() =>
              exportMutation.mutate({ id: payout.id, format: 'xlsx' })
            }
          >
            {exportMutation.isPending &&
            exportMutation.variables?.format === 'xlsx' ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Download className='mr-2 h-4 w-4' />
            )}
            Excel
          </Button>
          <Button
            variant='outline'
            size='sm'
            disabled={exportMutation.isPending}
            onClick={() =>
              exportMutation.mutate({ id: payout.id, format: 'pdf' })
            }
          >
            {exportMutation.isPending &&
            exportMutation.variables?.format === 'pdf' ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Printer className='mr-2 h-4 w-4' />
            )}
            PDF
          </Button>

          {payout.status !== 'PAID' && (
            <div className='ml-2 flex items-center gap-2 rounded-md border p-1 pl-3'>
              <Input
                type='date'
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className='bg-background h-8 w-36'
              />
              <Button
                size='sm'
                disabled={!paymentDate || settleMutation.isPending}
                onClick={() =>
                  settleMutation.mutate({ id: payout.id, paymentDate })
                }
              >
                {settleMutation.isPending ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <>
                    <Save className='mr-2 h-4 w-4' /> Settle
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Vendor Header Card */}
      <Card>
        <CardHeader className='pb-4'>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <Building2 className='text-muted-foreground h-5 w-5' />
            {payout.vendor.companyName}
          </CardTitle>
          <CardDescription className='flex items-center gap-4 pt-1'>
            <span className='flex items-center gap-1'>
              <Hash className='h-3 w-3' /> ID: {payout.vendor.vendorNumber}
            </span>
            <span className='flex items-center gap-1'>
              <Calendar className='h-3 w-3' /> Generated:{' '}
              {format(new Date(payout.createdAt), 'PP')}
            </span>
            {payout.status === 'PAID' && (
              <span className='flex items-center gap-1 text-green-600'>
                <CheckCircle2 className='h-3 w-3' /> Paid:{' '}
                {format(new Date(payout.paymentDate), 'PP')}
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Monies Owed Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className='text-lg'>Monies Owed Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/50'>
                <TableHead>Platform</TableHead>
                <TableHead>Month</TableHead>
                <TableHead className='text-right'>Amount (Gross)</TableHead>
                <TableHead className='text-right'>Commission</TableHead>
                <TableHead className='text-primary text-right font-bold'>
                  Net Payout
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.map((row) => (
                <TableRow key={`${row.platform}-${row.month}`}>
                  <TableCell className='font-medium'>{row.platform}</TableCell>
                  <TableCell>
                    {format(new Date(row.month), 'MMMM yyyy')}
                  </TableCell>
                  <TableCell className='text-right font-mono'>
                    ${row.gross.toFixed(2)}
                  </TableCell>
                  <TableCell className='text-muted-foreground text-right font-mono'>
                    ${row.commission.toFixed(2)}
                  </TableCell>
                  <TableCell className='text-right font-mono font-bold'>
                    ${row.net.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className='bg-muted/20 border-t-2 font-bold'>
                <TableCell colSpan={2} className='text-right'>
                  Totals:
                </TableCell>
                <TableCell className='text-right'>
                  ${totalGross.toFixed(2)}
                </TableCell>
                <TableCell className='text-right'>-</TableCell>
                <TableCell className='text-primary text-right'>
                  ${totalNet.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <div className='space-y-6'>
        <h2 className='pl-1 text-xl font-semibold'>Payout Details</h2>

        {Array.from(detailsByPlatform.entries()).map(([subHeader, items]) => {
          // 1. Identify all unique metadata keys for this group
          const metadataKeys = Array.from(
            new Set(
              items.flatMap((item: any) =>
                item.metadata ? Object.keys(item.metadata) : []
              )
            )
          ).sort()

          return (
            <Card key={subHeader} className='overflow-hidden'>
              <CardHeader className='bg-secondary/20 py-3'>
                <CardTitle className='text-base font-medium'>
                  {subHeader}
                </CardTitle>
              </CardHeader>
              <CardContent className='p-0'>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='min-w-[200px] pl-6'>
                          Title
                        </TableHead>
                        {/* Dynamic Headers */}
                        {metadataKeys.map((key) => (
                          <TableHead
                            key={key}
                            className='text-center whitespace-nowrap'
                          >
                            {key}
                          </TableHead>
                        ))}
                        <TableHead className='text-right'>Total</TableHead>
                        <TableHead className='text-right'>Commission</TableHead>
                        <TableHead className='pr-6 text-right'>Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item: any) => (
                        <TableRow key={item.id} className='hover:bg-muted/40'>
                          <TableCell className='text-muted-foreground pl-6 font-medium'>
                            {item.lineItemName || 'N/A'}
                          </TableCell>
                          {/* Dynamic Metadata Cells */}
                          {metadataKeys.map((key) => (
                            <TableCell
                              key={key}
                              className='text-muted-foreground text-center text-xs'
                            >
                              {item.metadata?.[key] !== undefined &&
                              item.metadata?.[key] !== null
                                ? String(item.metadata[key])
                                : '-'}
                            </TableCell>
                          ))}
                          <TableCell className='text-right font-mono'>
                            ${Number(item.grossRevenue).toFixed(2)}
                          </TableCell>
                          <TableCell className='text-muted-foreground py-2 text-right font-mono text-xs'>
                            ${Number(item.amgCommission).toFixed(2)}
                          </TableCell>
                          <TableCell className='pr-6 text-right font-mono font-medium'>
                            ${Number(item.vendorNet).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className='bg-muted/10 font-medium'>
                        {/* ColSpan = Title (1) + Metadata Keys length */}
                        <TableCell
                          className='pl-6'
                          colSpan={1 + metadataKeys.length}
                        >
                          Subtotal
                        </TableCell>
                        <TableCell className='text-right'>
                          $
                          {items
                            .reduce((acc, i) => acc + Number(i.grossRevenue), 0)
                            .toFixed(2)}
                        </TableCell>
                        <TableCell className='text-right'>-</TableCell>
                        <TableCell className='pr-6 text-right'>
                          $
                          {items
                            .reduce((acc, i) => acc + Number(i.vendorNet), 0)
                            .toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
