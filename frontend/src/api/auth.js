import { apiClient } from './client';
import { clearSession, saveRole, saveSession } from './session';

export const authService = {
  /** Signs in and stores the token; returns the current user profile. */
  login: async (email, password, remember = true) => {
    const response = await apiClient.post('/auth/login', { email, password });
    saveSession(response.data.data.access_token, remember);
    const user = await authService.getCurrentUser();
    saveRole(user.role?.name || '');
    return user;
  },

  logout: () => clearSession(),

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data.data;
  },
};
