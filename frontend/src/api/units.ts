import { apiFetch } from './client';
import type { Unit, UnitCreate, UnitUpdate } from '../types/subject';

// POST /api/v1/subjects/{subject_id}/units — Admin, HOD, Faculty (own subjects)
export function createUnit(
  subjectId: string,
  data: UnitCreate,
  token: string | null,
): Promise<Unit> {
  return apiFetch<Unit>(`/api/v1/subjects/${subjectId}/units`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// GET /api/v1/subjects/{subject_id}/units — all authenticated roles
export function listUnits(subjectId: string, token: string | null): Promise<Unit[]> {
  return apiFetch<Unit[]>(`/api/v1/subjects/${subjectId}/units`, token);
}

// GET /api/v1/units/{unit_id} — all authenticated roles
export function getUnit(unitId: string, token: string | null): Promise<Unit> {
  return apiFetch<Unit>(`/api/v1/units/${unitId}`, token);
}

// PUT /api/v1/units/{unit_id} — Admin, HOD, Faculty (own subjects)
export function updateUnit(
  unitId: string,
  data: UnitUpdate,
  token: string | null,
): Promise<Unit> {
  return apiFetch<Unit>(`/api/v1/units/${unitId}`, token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// DELETE /api/v1/units/{unit_id} — Admin, HOD, Faculty (own subjects)
export function deleteUnit(unitId: string, token: string | null): Promise<void> {
  return apiFetch<void>(`/api/v1/units/${unitId}`, token, {
    method: 'DELETE',
  });
}
