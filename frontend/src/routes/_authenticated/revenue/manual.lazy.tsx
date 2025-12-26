import { createLazyFileRoute } from '@tanstack/react-router'
import { ManualRevenueForm } from '@/features/revenue/components/manual-revenue-form'

export const Route = createLazyFileRoute('/_authenticated/revenue/manual')({
  component: ManualRevenueForm,
})
