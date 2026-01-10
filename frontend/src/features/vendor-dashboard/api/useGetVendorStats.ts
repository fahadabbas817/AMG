import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export interface VendorStatRecord {
  id: string
  title: string
  studio: string
  total: number
  platform: string
  periodStart: string
  periodEnd: string
  status: 'PAID' | 'PENDING_PAYMENT' | 'UNPROCESSED'
  metadata: any
}

interface StatsFilters {
  platformId?: string
  startDate?: string
  endDate?: string
}

export const useGetVendorStats = (filters: StatsFilters) => {
  return useQuery({
    queryKey: ['vendor-stats', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.platformId) params.append('platformId', filters.platformId)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const response = await api.get<VendorStatRecord[]>(
        `/vendor/dashboard/stats?${params.toString()}`
      )
      return response.data
    },
  })
}
