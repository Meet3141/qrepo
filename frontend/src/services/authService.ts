import { api } from './api';

export interface User {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
  role?: {
    id: number;
    name: string;
  };
}

export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export const authService = {
  async login(email: string, password: string): Promise<APIResponse<TokenResponse>> {
    const { data } = await api.post<APIResponse<TokenResponse>>('/auth/login', { email, password });
    return data;
  },

  async register(email: string, password: string): Promise<APIResponse<User>> {
    const { data } = await api.post<APIResponse<User>>('/auth/register', { email, password });
    return data;
  },

  async getMe(): Promise<APIResponse<User>> {
    const { data } = await api.get<APIResponse<User>>('/auth/me');
    return data;
  }
};
