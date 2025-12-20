import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { UpdateVendorDTO, Vendor } from '../types'

export const useUpdateVendor = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateVendorDTO }) => {
      const response = await api.patch<Vendor>(`/vendors/${id}`, data)
      return response.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['vendors', id] })
    },
  })
}
