import { useMutation } from '@tanstack/react-query'
import api from '@/services/api'
import { toast } from 'sonner'

export const useExportPayout = () => {
  return useMutation({
    mutationFn: async ({
      id,
      format,
    }: {
      id: string
      format: 'pdf' | 'xlsx'
    }) => {
      const response = await api.get(`/payout/${id}/export`, {
        params: { format },
        responseType: 'blob', // Critical for file download
        timeout: 100000,
      })

      // Trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `payout-${id}.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    },
    onError: (error) => {
      console.error('Export Error:', error)
      toast.error(
        error instanceof Error
          ? `Failed: ${error.message}`
          : 'Failed to export payout'
      )
    },
  })
}
