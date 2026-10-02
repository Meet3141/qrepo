import { apiClient, unwrap } from './client';

export const unitService = {
  /** POST /subjects/{subject_id}/units — Admin, HOD, or the subject's assigned Faculty. */
  createUnit: (subjectId, data) => unwrap(apiClient.post(`/subjects/${subjectId}/units`, data)),
  getUnitsBySubject: (subjectId) => unwrap(apiClient.get(`/subjects/${subjectId}/units`)),
  getUnit: (unitId) => unwrap(apiClient.get(`/units/${unitId}`)),
  updateUnit: (unitId, data) => unwrap(apiClient.put(`/units/${unitId}`, data)),
  deleteUnit: (unitId) => unwrap(apiClient.delete(`/units/${unitId}`)),
};
