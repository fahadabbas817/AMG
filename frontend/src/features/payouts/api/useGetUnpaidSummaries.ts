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
      console.log('Fetching unpaid summaries for vendor:', vendorId)
      if (!vendorId) return []
      const response = await api.get(`/payout/summary/${vendorId}`)
      console.log('Response:', response.data)
      return response.data
    },
    enabled: !!vendorId,
  })
}
