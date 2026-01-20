import { createFileRoute } from '@tanstack/react-router'
import { RequestsTable } from '@/features/vendors/components/requests-table'

export const Route = createFileRoute('/_authenticated/requests/')({
  component: RequestsPage,
})

function RequestsPage() {
  return (
    <>
      <div className='flex flex-1 flex-col gap-6 p-8 pt-6'>
        <h2 className='text-3xl font-bold tracking-tight'>Pending Approvals</h2>
        <div className='grid gap-4'>
          <RequestsTable />
        </div>
      </div>
    </>
  )
}
