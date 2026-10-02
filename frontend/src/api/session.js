/**
 * Client-side session state: the access token and the signed-in user's role.
 * "Remember me" keeps the token in localStorage; otherwise it lives in sessionStorage
 * and is dropped when the browser closes. The backend remains the authority on access.
 */
const TOKEN_KEY = 'token';
const ROLE_KEY = 'user_role';

const stores = () => [window.localStorage, window.sessionStorage];

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function saveSession(token, remember = true) {
  clearSession();
  (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

export function getRole() {
  return localStorage.getItem(ROLE_KEY) || sessionStorage.getItem(ROLE_KEY) || '';
}

export function saveRole(role) {
  // Keep the role next to the token so both share the same lifetime
  const store = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
  store.setItem(ROLE_KEY, role);
}

export function clearSession() {
  for (const store of stores()) {
    store.removeItem(TOKEN_KEY);
    store.removeItem(ROLE_KEY);
  }
}

/** Permission keys from backend app/permissions/catalog.py (editable in the Admin permission matrix). */
export const PERMISSIONS = {
  DOCUMENTS_UPLOAD: 'documents.upload',
  DOCUMENTS_DELETE: 'documents.delete',
  PAPERS_CREATE: 'papers.create',
  PAPERS_SUBMIT_REVIEW: 'papers.submit_review',
  PAPERS_APPROVE: 'papers.approve',
  ANALYTICS_VIEW: 'analytics.view',
  AI_GENERATE_QUESTIONS: 'ai.generate_questions',
};

export const ROLES = { ADMIN: 'Admin', HOD: 'HOD', FACULTY: 'Faculty', STUDENT: 'Student' };
export const STAFF = [ROLES.ADMIN, ROLES.HOD, ROLES.FACULTY];

const DASHBOARDS = {
  [ROLES.ADMIN]: '/dashboard/admin',
  [ROLES.HOD]: '/dashboard/hod',
  [ROLES.FACULTY]: '/dashboard/faculty',
  [ROLES.STUDENT]: '/dashboard/student',
};

export const dashboardFor = (role) => DASHBOARDS[role] || DASHBOARDS[ROLES.STUDENT];

/** Fired when the API rejects the token, so the app can return to the login screen. */
const listeners = new Set();
export function onSessionExpired(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function expireSession() {
  clearSession();
  listeners.forEach((listener) => listener());
}
