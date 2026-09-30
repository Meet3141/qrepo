import { apiClient } from './client';

export const subjectService = {
  getSubjects: async () => {
    const response = await apiClient.get('/subjects');
    return response.data;
  },
  getSubject: async (id) => {
    const response = await apiClient.get(`/subjects/${id}`);
    return response.data;
  },
  createSubject: async (data) => {
    const response = await apiClient.post('/subjects', data);
    return response.data;
  },
  updateSubject: async (id, data) => {
    const response = await apiClient.put(`/subjects/${id}`, data);
    return response.data;
  },
  deleteSubject: async (id) => {
    const response = await apiClient.delete(`/subjects/${id}`);
    return response.data;
  }
};
