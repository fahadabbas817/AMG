import { createLazyFileRoute } from '@tanstack/react-router'
import { RevenueUploadWizard } from '@/features/revenue'

export const Route = createLazyFileRoute(
  '/_authenticated/revenue/upload'
)({
  component: RevenueUploadWizard,
})
