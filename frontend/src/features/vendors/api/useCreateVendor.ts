import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { CreateVendorDTO, Vendor } from '../types'

export const useCreateVendor = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateVendorDTO) => {
      const response = await api.post<Vendor>('/vendors', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}
