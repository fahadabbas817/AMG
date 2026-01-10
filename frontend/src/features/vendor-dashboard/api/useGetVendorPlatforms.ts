import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export interface VendorPlatform {
  id: string
  name: string
}

export const useGetVendorPlatforms = () => {
  return useQuery({
    queryKey: ['vendor-platforms'],
    queryFn: async () => {
      const response = await api.get<VendorPlatform[]>(
        '/vendor/dashboard/platforms'
      )
      return response.data
    },
  })
}
