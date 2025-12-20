import { queryOptions, useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { Platform } from '../types'

export const getPlatformsQueryOptions = queryOptions({
  queryKey: ['platforms'],
  queryFn: async () => {
    const response = await api.get<Platform[]>('/admin/platforms')
    return response.data
  },
})

export const useGetPlatforms = () => {
  return useQuery(getPlatformsQueryOptions)
}
