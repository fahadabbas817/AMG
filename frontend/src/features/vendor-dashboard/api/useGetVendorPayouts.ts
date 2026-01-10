import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export interface VendorPayout {
  id: string
  payoutNumber: number
  totalAmount: number
  paymentDate: string | null
  status: string
  createdAt: string
}

export const useGetVendorPayouts = () => {
  return useQuery({
    queryKey: ['vendor-payouts'],
    queryFn: async () => {
      const response = await api.get<VendorPayout[]>(
        '/vendor/dashboard/payouts'
      )
      return response.data
    },
  })
}
