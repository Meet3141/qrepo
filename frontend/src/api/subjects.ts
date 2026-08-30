import { apiFetch } from './client';
import type { Subject, SubjectCreate, SubjectUpdate } from '../types/subject';

// POST /api/v1/subjects — Admin, HOD only
export function createSubject(
  data: SubjectCreate,
  token: string | null,
): Promise<Subject> {
  return apiFetch<Subject>('/api/v1/subjects', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// GET /api/v1/subjects — all authenticated roles
export function listSubjects(token: string | null): Promise<Subject[]> {
  return apiFetch<Subject[]>('/api/v1/subjects', token);
}

// GET /api/v1/subjects/{id} — all authenticated roles
export function getSubject(id: string, token: string | null): Promise<Subject> {
  return apiFetch<Subject>(`/api/v1/subjects/${id}`, token);
}

// PUT /api/v1/subjects/{id} — Admin, HOD only
export function updateSubject(
  id: string,
  data: SubjectUpdate,
  token: string | null,
): Promise<Subject> {
  return apiFetch<Subject>(`/api/v1/subjects/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// DELETE /api/v1/subjects/{id} — Admin, HOD only
export function deleteSubject(id: string, token: string | null): Promise<void> {
  return apiFetch<void>(`/api/v1/subjects/${id}`, token, {
    method: 'DELETE',
  });
}
