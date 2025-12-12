import axios from 'axios'
import { redirect } from '@tanstack/react-router'

// 1. Create the instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000', // Backend URL
  headers: {
    'Content-Type': 'application/json',
  },
})

// 2. The "Interceptor"
// Before every request, check if we have a token and attach it.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
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
      localStorage.removeItem('token')
      redirect({ to: '/sign-in' })
    }
    return Promise.reject(error)
  }
)

export default api
