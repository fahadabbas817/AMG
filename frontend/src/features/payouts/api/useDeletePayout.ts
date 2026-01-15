import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { toast } from 'sonner'

export const useDeletePayout = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/payout/${id}`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Payout report deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['payouts'] })
    },
    onError: (error: any) => {
      toast.error('Failed to delete payout: ' + error.message)
    },
  })
}
