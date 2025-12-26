import { useMutation } from '@tanstack/react-query'
import api from '@/services/api'

export type PreviewResponse = {
  message: string
  platform: string
  fileName: string
  headerRowIndex: number
  detectedHeaders: string[]
  sampleRows: any[]
  suggestedMapping: Record<string, string>
}

export const usePreviewRevenueReport = () => {
  return useMutation({
    mutationFn: async ({
      file,
      platformId,
    }: {
      file: File
      platformId: string
    }): Promise<PreviewResponse> => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('platformId', platformId)

      const response = await api.post('/revenue/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
  })
}
