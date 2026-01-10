import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export interface PayoutDetail {
  id: string
  payoutNumber: number
  vendorId: string
  vendor: {
    companyName: string
  }
  items: {
    id: string
    lineItemName: string | null
    platform: {
      name: string
    }
    grossRevenue: number
    vendorNet: number
    amgCommission: number
    metadata: any
    periodStart: string
  }[]
  totalAmount: number
  status: string
  paymentDate: string | null
  createdAt: string
}

export const useGetVendorPayout = (payoutId: string) => {
  return useQuery({
    queryKey: ['vendor-payout', payoutId],
    queryFn: async () => {
      const response = await api.get<PayoutDetail>(
        `/vendor/dashboard/payouts/${payoutId}`
      )
      return response.data
    },
    enabled: !!payoutId,
  })
}
