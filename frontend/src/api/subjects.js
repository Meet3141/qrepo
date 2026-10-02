import { apiClient, unwrap } from './client';

export const subjectService = {
  getSubjects: () => unwrap(apiClient.get('/subjects')),
  getSubject: (id) => unwrap(apiClient.get(`/subjects/${id}`)),
  createSubject: (data) => unwrap(apiClient.post('/subjects', data)),
  updateSubject: (id, data) => unwrap(apiClient.put(`/subjects/${id}`, data)),
  deleteSubject: (id) => unwrap(apiClient.delete(`/subjects/${id}`)),
};
