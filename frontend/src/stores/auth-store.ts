import { create } from 'zustand'

const ACCESS_TOKEN = 'access_token'

interface AuthUser {
  accountNo?: string // Optional as per user example
  email: string
  name?: string // Added for dashboard greeting
  role: string | string[] // Support both 'admin' or ['admin']
  exp?: number
  userId?: number | string
}

interface AuthState {
  auth: {
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
    accessToken: string
    setAccessToken: (accessToken: string) => void
    resetAccessToken: () => void
    reset: () => void
  }
}

export const useAuthStore = create<AuthState>()((set) => {
  const tokenString = typeof window !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN) : null
  let initToken = tokenString || ''
  
  return {
    auth: {
      user: null,
      setUser: (user) =>
        set((state) => ({ ...state, auth: { ...state.auth, user } })),
      accessToken: initToken,
      setAccessToken: (accessToken) =>
        set((state) => {
          localStorage.setItem(ACCESS_TOKEN, accessToken)
          return { ...state, auth: { ...state.auth, accessToken } }
        }),
      resetAccessToken: () =>
        set((state) => {
          localStorage.removeItem(ACCESS_TOKEN)
          return { ...state, auth: { ...state.auth, accessToken: '' } }
        }),
      reset: () =>
        set((state) => {
          localStorage.removeItem(ACCESS_TOKEN)
          return {
            ...state,
            auth: { ...state.auth, user: null, accessToken: '' },
          }
        }),
    },
  }
})
