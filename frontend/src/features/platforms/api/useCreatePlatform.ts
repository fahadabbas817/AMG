import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { PlatformFormSchema } from '../data/schema'
import { Platform } from '../types'

export const useCreatePlatform = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: PlatformFormSchema) => {
      // Backend expects 'defaultSplit' as number, handled by schema coercion
      const response = await api.post<Platform>('/admin/platforms', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] })
    },
  })
}
