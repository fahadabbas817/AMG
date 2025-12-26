import { Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useGetPayouts } from './api/useGetPayouts'
import { PayoutsTable } from './components/payouts-table'

export function Payouts() {
  const { data: payouts = [], isLoading } = useGetPayouts()

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Payment Tracking
            </h2>
            <p className='text-muted-foreground'>
              Manage payout reports and settlements.
            </p>
          </div>
        </div>
        {isLoading ? (
          <div className='flex h-96 items-center justify-center'>
            <Loader2 className='text-primary h-8 w-8 animate-spin' />
          </div>
        ) : (
          <PayoutsTable data={payouts} />
        )}
      </Main>
    </>
  )
}
