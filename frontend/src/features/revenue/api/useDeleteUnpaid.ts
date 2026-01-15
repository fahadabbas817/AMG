import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { toast } from 'sonner'

export function useDeleteUnpaid(vendorId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return api.delete(`/revenue/unpaid/${vendorId}`)
    },
    onSuccess: () => {
      toast.success('Unpaid records deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['vendors', vendorId] })
      queryClient.invalidateQueries({
        queryKey: ['unpaid-summaries', vendorId],
      })
    },
    onError: (error: any) => {
      toast.error('Failed to delete unpaid records', {
        description: error.response?.data?.message || 'Unknown error occurred',
      })
    },
  })
}
