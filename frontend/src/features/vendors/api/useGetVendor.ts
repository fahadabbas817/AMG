import { queryOptions, useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { Vendor } from '../types'

export const getVendorQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['vendors', id],
    queryFn: async () => {
      const response = await api.get<Vendor>(`/vendors/${id}`)
      return response.data
    },
  })

export const useGetVendor = (id: string) => {
  return useQuery({
    ...getVendorQueryOptions(id),
    enabled: !!id,
  })
}
