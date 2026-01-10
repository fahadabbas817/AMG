import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'

export interface ProfileChangeRequest {
  id: string
  vendorId: string
  vendor: {
    companyName: string
    email: string
  }
  oldData: any
  newData: any
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

export const useCreateProfileRequest = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post('/vendor/profile-requests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-requests'] })
    },
  })
}

export const useGetProfileRequests = () => {
  return useQuery({
    queryKey: ['profile-requests'],
    queryFn: async () => {
      const response = await api.get<ProfileChangeRequest[]>(
        '/admin/profile-requests'
      )
      return response.data
    },
  })
}

export const useApproveProfileRequest = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/admin/profile-requests/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-requests'] })
      // Invalidate vendors list or specific vendor too if possible
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

export const useRejectProfileRequest = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/admin/profile-requests/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-requests'] })
    },
  })
}
