import { apiClient } from './client';

export const questionsApi = {
  list: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    const response = await apiClient.get(`/questions?${params.toString()}`);
    return response.data;
  },

  get: async (id) => {
    const response = await apiClient.get(`/questions/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/questions', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.patch(`/questions/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/questions/${id}`);
    return response.data;
  },

  generate: async (data) => {
    const response = await apiClient.post('/question-generation/generate', data);
    return response.data;
  }
};
