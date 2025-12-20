import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { toast } from 'sonner'

export const useDeleteVendor = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (vendorId: string) => {
      return api.delete(`/vendors/${vendorId}`)
    },
    onSuccess: () => {
      toast.success('Vendor deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
    onError: (error: any) => {
      console.error(error)
      const message = error.response?.data?.message || 'Failed to delete vendor'
      toast.error(message)
    },
  })
}
