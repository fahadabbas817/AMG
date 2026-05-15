import axios from 'axios'

// 1. Create the instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000', // Backend URL
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 2. The "Interceptor"
// Before every request, check if we have a token and attach it.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 3. Global Error Handling (Optional but recommended)
// If the token is expired (401), kick them out automatically.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      // Only redirect if not already on sign-in page to prevent loops
      if (window.location.pathname !== '/sign-in') {
        window.location.href = '/sign-in'
      }
    }
    return Promise.reject(error)
  }
)

export const sendBroadcastEmail = async (data: {
  vendorIds: string[]
  subject: string
  body: string
  type: 'CUSTOM' | 'WELCOME'
}) => {
  const response = await api.post('/email/broadcast', data)
  return response.data
}

export const getEmailLogs = async (params: {
  page?: number
  limit?: number
}) => {
  const response = await api.get('/email/logs', { params })
  return response.data
}

export default api
