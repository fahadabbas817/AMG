import { useMutation } from '@tanstack/react-query'
import api from '@/services/api'

export type ManualRow = {
  vendorName?: string
  vendorId: string
  grossRevenue: number
  lineItemName?: string
}

export type SaveManualPayload = {
  platformId: string
  month: string
  totalAmount: number
  rows: ManualRow[]
}

export const useSaveManualReport = () => {
  return useMutation({
    mutationFn: async (payload: SaveManualPayload) => {
      const response = await api.post('/revenue/manual', payload)
      return response.data
    },
  })
}
