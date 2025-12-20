import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/users/')({
  component: () => <div>Users Placeholder</div>,
})
