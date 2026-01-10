import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export type UnpaidSummary = {
  platformId: string
  platformName: string
  month: string
  grossAmount: number
  commissionRate: number
  commissionAmount: number
  netPayout: number
  status: string
  recordIds: string[]
}

export const useGetUnpaidSummaries = (vendorId: string) => {
  return useQuery({
    queryKey: ['unpaid-summaries', vendorId],
    queryFn: async (): Promise<UnpaidSummary[]> => {
      if (!vendorId) return []
      const response = await api.get(`/payout/summary/${vendorId}`)
      return response.data
    },
    enabled: !!vendorId,
  })
}
