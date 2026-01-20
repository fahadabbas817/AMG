import { createFileRoute } from '@tanstack/react-router'
import RevenueReportList from '@/features/revenue/pages/revenue-report-list'

export const Route = createFileRoute('/_authenticated/revenue/list')({
  component: RevenueReportList,
})
