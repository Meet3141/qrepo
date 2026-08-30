/**
 * TypeScript interfaces that mirror the backend Pydantic schemas
 * in app/subject/schemas.py.
 *
 * All id / subject_id / faculty_id fields are UUIDs serialized as strings
 * by FastAPI.  created_at / updated_at are ISO-8601 strings.
 */

// ---------------------------------------------------------------------------
// Unit
// ---------------------------------------------------------------------------

export interface Unit {
  id: string;
  subject_id: string;
  unit_number: number;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnitCreate {
  unit_number: number;
  title: string;
  description?: string;
}

export interface UnitUpdate {
  unit_number?: number;
  title?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Subject
// ---------------------------------------------------------------------------

export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string | null;
  /** UUID of the assigned Faculty user, or null if unassigned. */
  faculty_id: string | null;
  created_at: string;
  updated_at: string;
  /** Eagerly-loaded units returned by the backend SubjectResponse schema. */
  units: Unit[];
}

export interface SubjectCreate {
  name: string;
  code: string;
  description?: string;
  /** Optional: UUID of a Faculty user to assign this subject to. */
  faculty_id?: string;
}

export interface SubjectUpdate {
  name?: string;
  code?: string;
  description?: string;
  faculty_id?: string;
}
