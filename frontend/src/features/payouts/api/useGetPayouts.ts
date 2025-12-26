import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export const useGetPayouts = () => {
  return useQuery({
    queryKey: ['payouts'],
    queryFn: async () => {
      const response = await api.get('/payout')
      return response.data
    },
  })
}
