import { apiClient, unwrap } from './client';

/** Mirrors backend app/document/storage.py (ALLOWED_MIME_TYPES, MAX_DOCUMENT_SIZE). */
export const DOCUMENT_RULES = {
  extensions: ['.pdf', '.docx', '.txt'],
  accept: '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain',
  maxBytes: 10 * 1024 * 1024,
};

export const documentService = {
  /** POST /units/{unit_id}/documents (multipart/form-data). */
  uploadDocument: (unitId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return unwrap(apiClient.post(`/units/${unitId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }));
  },
  getDocumentsByUnit: (unitId) => unwrap(apiClient.get(`/units/${unitId}/documents`)),
  getDocument: (documentId) => unwrap(apiClient.get(`/documents/${documentId}`)),
  updateDocument: (documentId, data) => unwrap(apiClient.put(`/documents/${documentId}`, data)),
  deleteDocument: (documentId) => unwrap(apiClient.delete(`/documents/${documentId}`)),
  /** Extracts text so the AI engine can use the document as context. */
  processDocument: (documentId) => unwrap(apiClient.post(`/documents/${documentId}/process`)),

  /**
   * Downloads the physical file for a document.
   * Uses a Blob response so the Authorization header is sent (plain <a href> can't do that).
   */
  downloadDocument: async (documentId, fileName) => {
    const response = await apiClient.get(`/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
