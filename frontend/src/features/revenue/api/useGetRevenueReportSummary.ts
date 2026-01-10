import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export const useGetRevenueReportSummary = (reportId: string | undefined) => {
  return useQuery({
    queryKey: ['revenue-report-summary', reportId],
    queryFn: async () => {
      if (!reportId) return null
      const response = await api.get(`/revenue/${reportId}/summary`)
      return response.data as any // Cast to any to avoid strict type issues for now
    },
    enabled: !!reportId,
  })
}
