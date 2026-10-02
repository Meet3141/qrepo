import { apiClient } from './client';

export const documentService = {
  /**
   * Upload a document to a unit.
   * POST /units/{unit_id}/documents (multipart/form-data)
   */
  uploadDocument: async (unitId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/units/${unitId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * List all documents for a unit.
   * GET /units/{unit_id}/documents
   */
  getDocumentsByUnit: async (unitId) => {
    const response = await apiClient.get(`/units/${unitId}/documents`);
    return response.data;
  },

  /**
   * Get a single document by ID.
   * GET /documents/{document_id}
   */
  getDocument: async (documentId) => {
    const response = await apiClient.get(`/documents/${documentId}`);
    return response.data;
  },

  /**
   * Update a document (file_name, processing_status).
   * PUT /documents/{document_id}
   */
  updateDocument: async (documentId, data) => {
    const response = await apiClient.put(`/documents/${documentId}`, data);
    return response.data;
  },

  /**
   * Delete a document.
   * DELETE /documents/{document_id}
   */
  deleteDocument: async (documentId) => {
    const response = await apiClient.delete(`/documents/${documentId}`);
    return response.data;
  },

  /**
   * Trigger ingestion/processing for a document.
   * POST /documents/{document_id}/process
   */
  processDocument: async (documentId) => {
    const response = await apiClient.post(`/documents/${documentId}/process`);
    return response.data;
  },
};
