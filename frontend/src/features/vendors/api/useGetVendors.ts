import { queryOptions, useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { VendorsApiResponse } from '../types'

export const getVendorsQueryOptions = queryOptions({
  queryKey: ['vendors'],
  queryFn: async () => {
    const response = await api.get<VendorsApiResponse>('/vendors')
    return response.data.data
  },
})

export const useGetVendors = () => {
  return useQuery(getVendorsQueryOptions)
}
