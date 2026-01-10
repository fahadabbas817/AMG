import { useMutation } from '@tanstack/react-query'
import api from '@/services/api'

interface SyncPayload {
  reportId: string
  invoiceRef?: string
}

export const useSyncRevenueReport = () => {
  return useMutation({
    mutationFn: async ({ reportId, invoiceRef }: SyncPayload) => {
      const response = await api.post(`/revenue/${reportId}/sync`, {
        invoiceRef,
      })
      return response.data as any
    },
  })
}
