import { createLazyFileRoute } from '@tanstack/react-router'
import { Payouts } from '@/features/payouts'

export const Route = createLazyFileRoute('/_authenticated/payouts/')({
  component: Payouts,
})
