import { useMutation } from '@tanstack/react-query'
import api from '@/services/api'

interface DryRunDto {
  file: File
  platformId: string
  month: string
  totalAmount?: number | null
  mapping?: Record<string, string>
  invoiceNumber?: string
  headerRowIndex?: number
}

export const useDryRunRevenueReport = () => {
  return useMutation({
    mutationFn: async (data: DryRunDto) => {
      const formData = new FormData()
      formData.append('file', data.file)
      formData.append('platformId', data.platformId)
      formData.append('month', data.month)
      if (data.totalAmount !== undefined && data.totalAmount !== null) {
        formData.append('totalAmount', data.totalAmount.toString())
      }
      if (data.mapping) {
        formData.append('mapping', JSON.stringify(data.mapping))
      }
      if (data.invoiceNumber) {
        formData.append('invoiceNumber', data.invoiceNumber)
      }
      if (data.headerRowIndex !== undefined) {
        formData.append('headerRowIndex', data.headerRowIndex.toString())
      }

      const response = await api.post('/revenue/dry-run', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
  })
}
