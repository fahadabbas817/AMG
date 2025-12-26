import { useMutation } from '@tanstack/react-query'
import api from '@/services/api'

export type SaveResponse = {
  message: string
  reportId: string
  totalRecords: number
}

export type SavePayload = {
  file: File
  platformId: string
  month: string // YYYY-MM-DD
  totalAmount: number
  mapping?: Record<string, string>
  invoiceNumber?: string
  paymentStatus?: string
}

export const useSaveRevenueReport = () => {
  return useMutation({
    mutationFn: async (payload: SavePayload): Promise<SaveResponse> => {
      const formData = new FormData()
      formData.append('file', payload.file)
      formData.append('platformId', payload.platformId)
      formData.append('month', payload.month)
      formData.append('totalAmount', payload.totalAmount.toString())
      if (payload.mapping) {
        formData.append('mapping', JSON.stringify(payload.mapping))
      }
      if (payload.invoiceNumber) {
        formData.append('invoiceNumber', payload.invoiceNumber)
      }
      if (payload.paymentStatus) {
        formData.append('paymentStatus', payload.paymentStatus)
      }

      const response = await api.post('/revenue/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
  })
}
