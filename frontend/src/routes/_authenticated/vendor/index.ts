import { createFileRoute } from '@tanstack/react-router'
import { VendorDashboard } from '@/features/vendor-dashboard'

export const Route = createFileRoute('/_authenticated/vendor/')({
  component: VendorDashboard,
})
