import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

type DashboardSummary = {
  totalEarned: number
  totalPaid: number
  totalPending: number
}

export const useGetDashboardSummary = () => {
  // We don't need to pass vendorId manually if the backend extracts it from the token.
  // However, if we want to be explicit or if the API requires it in path, we might need it.
  // The current backend implementation uses `req.user.sub` (vendorId), so no arg needed.

  // Authorization header is usually handled by a global interceptor or we need to add it.
  // Assuming global interceptor or configured axios instance.
  // I will check `useGetVendors` to see how it's done.

  return useQuery({
    queryKey: ['vendor-dashboard-summary'],
    queryFn: async () => {
      // We use the configured axios instance typically.
      // Assuming there is one.
      // I will use `axios` directly for now but check other files.
      const response = await api.get<DashboardSummary>(
        '/vendor/dashboard/summary'
      )
      return response.data
    },
  })
}
