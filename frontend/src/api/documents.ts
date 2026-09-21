import { apiFetch } from './client';
import type { Document, DocumentUpdate } from '../types/document';

export async function uploadDocument(
  unitId: string,
  file: File,
  token: string | null
): Promise<Document> {
  const formData = new FormData();
  formData.append('file', file);

  // We do NOT set Content-Type manually; browser sets it automatically with the correct boundary for multipart/form-data
  return apiFetch<Document>(`/api/v1/units/${unitId}/documents`, token, {
    method: 'POST',
    body: formData,
    // Provide empty headers to prevent apiFetch from setting 'Content-Type': 'application/json'
    headers: { 'Content-Type': '' },
  }).catch((err) => {
    throw err;
  });
}

export async function getDocumentsByUnit(
  unitId: string,
  token: string | null
): Promise<Document[]> {
  return apiFetch<Document[]>(`/api/v1/units/${unitId}/documents`, token, {
    method: 'GET',
  });
}

export async function getDocument(
  documentId: string,
  token: string | null
): Promise<Document> {
  return apiFetch<Document>(`/api/v1/documents/${documentId}`, token, {
    method: 'GET',
  });
}

export async function updateDocument(
  documentId: string,
  data: DocumentUpdate,
  token: string | null
): Promise<Document> {
  return apiFetch<Document>(`/api/v1/documents/${documentId}`, token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteDocument(
  documentId: string,
  token: string | null
): Promise<void> {
  await apiFetch<null>(`/api/v1/documents/${documentId}`, token, {
    method: 'DELETE',
  });
}
