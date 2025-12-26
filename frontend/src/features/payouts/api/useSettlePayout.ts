import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { toast } from 'sonner'

export const useSettlePayout = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      paymentDate,
    }: {
      id: string
      paymentDate: string
    }) => {
      const response = await api.patch(`/payout/${id}/settle`, { paymentDate })
      return response.data
    },
    onSuccess: (data) => {
      toast.success(`Payout #${data.payoutNumber} marked as PAID`)
      queryClient.invalidateQueries({ queryKey: ['payouts'] })
      // Also invalidate summary queries as items are no longer unpaid
      queryClient.invalidateQueries({ queryKey: ['unpaid-summaries'] })
    },
    onError: (error: any) => {
      toast.error(
        'Failed to settle payout: ' +
          (error.response?.data?.message || error.message)
      )
    },
  })
}
