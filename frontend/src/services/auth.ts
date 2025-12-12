import api from './api'

export const AuthService = {
  // Admin Login
  loginAdmin: async (credentials: any) => {
    const response = await api.post('/auth/admin/login', credentials)
    return response.data
  },

  // Vendor Login
  loginVendor: async (credentials: any) => {
    const response = await api.post('/auth/vendor/login', credentials)
    return response.data
  },

  // Logout
  //   logout: () => {
  //     localStorage.removeItem('token');
  //     localStorage.removeItem('role');
  //     window.location.href = '/login';
  //   }
}
