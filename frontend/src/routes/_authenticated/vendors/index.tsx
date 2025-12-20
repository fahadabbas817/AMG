import { createFileRoute } from '@tanstack/react-router'
import { Vendors } from '@/features/vendors'

export const Route = createFileRoute('/_authenticated/vendors/')({
  component: Vendors,
})
