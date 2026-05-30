import { queryOptions, useQuery } from '@tanstack/react-query'
import api from '@/services/api'

interface Payout {
  id: string
  payoutNumber: string
  totalAmount: number
  status: 'PENDING' | 'PAID'
  createdAt: string
  paymentDate?: string
  vendorId: string
  vendor: {
    id: string
    companyName: string
    vendorNumber: string
  }
  items: { id: string }[]
  subLabelSummary?: string
}

export const getVendorPayoutsQueryOptions = (vendorId: string) =>
  queryOptions({
    queryKey: ['payouts', 'vendor', vendorId],
    queryFn: async () => {
      const response = await api.get<Payout[]>(`/payout/vendor/${vendorId}`)
      return response.data
    },
  })

export const useGetVendorPayouts = (vendorId: string) => {
  return useQuery(getVendorPayoutsQueryOptions(vendorId))
}
