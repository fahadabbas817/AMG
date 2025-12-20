import { createFileRoute } from '@tanstack/react-router'
import { Platforms } from '@/features/platforms'

export const Route = createFileRoute('/_authenticated/platforms/')({
  component: Platforms,
})
