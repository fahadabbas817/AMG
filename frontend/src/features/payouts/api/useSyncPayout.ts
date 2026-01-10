import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { toast } from 'sonner'

export const useSyncPayout = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/quickbooks/sync-payout/${id}`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Payout synced to QuickBooks successfully')
      queryClient.invalidateQueries({ queryKey: ['payouts'] })
      queryClient.invalidateQueries({ queryKey: ['payout'] })
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to sync payout to QuickBooks'
      )
    },
  })
}
