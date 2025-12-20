import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import api from '@/services/api'
import { Platform } from '@/features/platforms/types'

export interface PlatformSplit {
  id: string
  vendorId: string
  platformId: string
  commissionRate: number
  platform: Platform
}

export interface AddSplitDTO {
  platformId: string
  commissionRate: number
}

export interface UpdateSplitDTO {
  commissionRate: number
}

// --- Query Options for Fetching ---
export const getSplitsQueryOptions = (vendorId: string) =>
  queryOptions({
    queryKey: ['vendor-splits', vendorId],
    queryFn: async () => {
      const response = await api.get<PlatformSplit[]>(
        `/vendors/${vendorId}/splits`
      )
      return response.data
    },
  })

// --- Hook to Get Splits ---
export const useGetSplits = (vendorId: string) => {
  return useQuery({
    ...getSplitsQueryOptions(vendorId),
    enabled: !!vendorId,
  })
}

// --- Hook to Add Split ---
export const useAddSplit = (vendorId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: AddSplitDTO) => {
      return api.post(`/vendors/${vendorId}/splits`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-splits', vendorId] })
      // Also invalidate vendor details as it includes nested splits
      queryClient.invalidateQueries({ queryKey: ['vendors', vendorId] })
    },
  })
}

// --- Hook to Update Split ---
export const useUpdateSplit = (vendorId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      splitId,
      data,
    }: {
      splitId: string
      data: UpdateSplitDTO
    }) => {
      return api.patch(`/vendors/splits/${splitId}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-splits', vendorId] })
      queryClient.invalidateQueries({ queryKey: ['vendors', vendorId] })
    },
  })
}

// --- Hook to Remove Split ---
export const useRemoveSplit = (vendorId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (splitId: string) => {
      return api.delete(`/vendors/splits/${splitId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-splits', vendorId] })
      queryClient.invalidateQueries({ queryKey: ['vendors', vendorId] })
    },
  })
}
