import { createFileRoute } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Main } from '@/components/layout/main'
import { useGetVendorPayouts } from '@/features/vendor-dashboard/api/useGetVendorPayouts'
import { VendorPayoutsTable } from '@/features/vendor-dashboard/components/vendor-payouts-table'

export const Route = createFileRoute('/_authenticated/vendor/payouts/')({
  component: VendorPayoutsPage,
})

function VendorPayoutsPage() {
  const { data: payouts = [], isLoading } = useGetVendorPayouts()

  return (
    <>
      <Main>
        <div className='flex flex-1 flex-col gap-4'>
          <div className='flex items-center justify-between space-y-2'>
            <h2 className='text-3xl font-bold tracking-tight'>
              Payout History
            </h2>
          </div>

          <Card className='h-full'>
            <CardHeader>
              <CardTitle>Settlement Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='flex h-64 items-center justify-center'>
                  <Loader2 className='text-primary h-8 w-8 animate-spin' />
                </div>
              ) : (
                <VendorPayoutsTable data={payouts} />
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
