import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { toast } from 'sonner'

export const useCreatePayout = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { vendorId: string; recordIds: string[] }) => {
      const response = await api.post('/payout', data)
      return response.data
    },
    onSuccess: (data, variables) => {
      toast.success(`Payout #${data.payoutNumber} generated successfully`)
      queryClient.invalidateQueries({
        queryKey: ['unpaid-summaries', variables.vendorId],
      })
      // Also invalidate payouts list if we implement it later
      queryClient.invalidateQueries({
        queryKey: ['vendor-payouts', variables.vendorId],
      })
    },
    onError: (error: any) => {
      toast.error(
        'Failed to generate payout: ' +
          (error.response?.data?.message || error.message)
      )
    },
  })
}
