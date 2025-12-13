import api from './api'

export const AuthService = {
  // Admin Login
  loginAdmin: async (credentials: any) => {
    const response = await api.post('/auth/login/admin', credentials)
    return response.data
  },

  // Vendor Login
  loginVendor: async (credentials: any) => {
    const response = await api.post('/auth/login/vendor', credentials)
    return response.data
  },

  // Get Profile
  getProfile: async () => {
    const response = await api.get('/auth/profile')
    return response.data
  },

  // Logout
  //   logout: () => {
  //     localStorage.removeItem('token');
  //     localStorage.removeItem('role');
  //     window.location.href = '/login';
  //   }
}
