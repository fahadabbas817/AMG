import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { PlatformFormSchema } from '../data/schema'
import { Platform } from '../types'

export const useUpdatePlatform = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<PlatformFormSchema>
    }) => {
      const response = await api.patch<Platform>(`/admin/platforms/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] })
    },
  })
}
