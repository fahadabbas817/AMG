import { queryOptions, useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { VendorsApiResponse } from '../types'

interface GetVendorsParams {
  page?: number
  limit?: number
}

export const getVendorsQueryOptions = (params?: GetVendorsParams) =>
  queryOptions({
    queryKey: ['vendors', params],
    queryFn: async () => {
      const response = await api.get<VendorsApiResponse>('/vendors', { params })
      return response.data
    },
  })

export const useGetVendors = (params?: GetVendorsParams) => {
  return useQuery(getVendorsQueryOptions(params))
}
