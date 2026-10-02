import { apiClient } from './client';

export const unitService = {
  /**
   * Create a unit for a subject.
   * POST /subjects/{subject_id}/units
   */
  createUnit: async (subjectId, data) => {
    const response = await apiClient.post(`/subjects/${subjectId}/units`, data);
    return response.data;
  },

  /**
   * List all units for a subject.
   * GET /subjects/{subject_id}/units
   */
  getUnitsBySubject: async (subjectId) => {
    const response = await apiClient.get(`/subjects/${subjectId}/units`);
    return response.data;
  },

  /**
   * Get a single unit by ID.
   * GET /units/{unit_id}
   */
  getUnit: async (unitId) => {
    const response = await apiClient.get(`/units/${unitId}`);
    return response.data;
  },

  /**
   * Update a unit.
   * PUT /units/{unit_id}
   */
  updateUnit: async (unitId, data) => {
    const response = await apiClient.put(`/units/${unitId}`, data);
    return response.data;
  },

  /**
   * Delete a unit.
   * DELETE /units/{unit_id}
   */
  deleteUnit: async (unitId) => {
    const response = await apiClient.delete(`/units/${unitId}`);
    return response.data;
  },
};
