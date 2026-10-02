import { apiClient } from './client';

export const authService = {
  login: async (email, password) => {
    const payload = { email, password };
    const response = await apiClient.post('/auth/login', payload);
    
    // Store token
    if (response.data && response.data.data && response.data.data.access_token) {
      localStorage.setItem('token', response.data.data.access_token);
    }
    
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
  },
  
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data.data;
  }
};
