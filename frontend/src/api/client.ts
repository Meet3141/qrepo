/**
 * Centralized API client for QRepo.
 *
 * Responsibilities:
 *  - Prepend the base URL (from VITE_API_BASE_URL env var).
 *  - Inject the Authorization: Bearer token on every request.
 *  - Unwrap the standard APIResponse envelope { success, message, data }.
 *  - Throw typed errors (ApiError / AuthError) so callers can handle them
 *    uniformly without repeating envelope-parsing logic.
 *
 * 401 responses throw AuthError. Callers that use useAuth() can catch
 * AuthError, call logout(), then navigate('/login').
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

/**
 * Typed error returned by apiFetch for non-2xx / success:false responses.
 * We use a plain Error with extra properties to remain compatible with
 * TypeScript's `erasableSyntaxOnly` mode (no class parameter properties).
 */
export interface ApiError extends Error {
  readonly status: number;
}

export function createApiError(status: number, message: string): ApiError {
  const err = new Error(message) as ApiError;
  err.name = 'ApiError';
  Object.defineProperty(err, 'status', { value: status, writable: false });
  return err;
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof Error && err.name === 'ApiError';
}

/** Thrown when the server returns HTTP 401 (expired / invalid token). */
export interface AuthError extends ApiError {
  readonly _isAuth: true;
}

export function createAuthError(): AuthError {
  const err = createApiError(401, 'Session expired. Please sign in again.') as AuthError;
  err.name = 'AuthError';
  Object.defineProperty(err, '_isAuth', { value: true, writable: false });
  return err;
}

export function isAuthError(err: unknown): err is AuthError {
  return err instanceof Error && err.name === 'AuthError';
}

// ---------------------------------------------------------------------------
// Envelope type (mirrors backend shared/responses.py APIResponse)
// ---------------------------------------------------------------------------

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

/**
 * apiFetch<T>(path, token, options?)
 *
 * @param path   - API path, e.g. "/api/v1/subjects"
 * @param token  - JWT from AuthContext (null for unauthenticated calls)
 * @param options - Standard RequestInit (method, body, etc.)
 * @returns      - The unwrapped `data` field from the APIResponse envelope
 * @throws AuthError on 401
 * @throws ApiError  on any other non-2xx or success:false response
 */
export async function apiFetch<T>(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Allow callers to override / extend headers if needed
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // 401 — session expired or invalid token
  if (response.status === 401) {
    throw createAuthError();
  }

  const envelope: ApiEnvelope<T> = await response.json();

  if (!response.ok || !envelope.success) {
    throw createApiError(
      response.status,
      envelope.message ?? 'An unexpected error occurred.',
    );
  }

  return envelope.data;
}
