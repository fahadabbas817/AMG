import { createFileRoute } from '@tanstack/react-router'
import { EmailCompose } from '@/features/support/components/email-compose'

export const Route = createFileRoute('/_authenticated/support/')({
  component: SupportPage,
})

function SupportPage() {
  return (
    <div className='flex h-full flex-col gap-6 p-6'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-3xl font-bold tracking-tight'>Support Center</h1>
        <p className='text-muted-foreground'>
          Manage communications with your vendors.
        </p>
      </div>

      <div className='flex-1'>
        <EmailCompose />
      </div>
    </div>
  )
}
