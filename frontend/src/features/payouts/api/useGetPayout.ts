import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export const useGetPayout = (id: string) => {
  return useQuery({
    queryKey: ['payout', id],
    queryFn: async () => {
      const response = await api.get(`/payout/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}
