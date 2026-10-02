import axios from 'axios';
import { ERROR_MESSAGES } from './errors';
import { expireSession, getToken } from './session';
import { toast } from '../components/Toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Endpoints where a 401 means "wrong credentials", not "session expired"
const CREDENTIAL_ENDPOINTS = ['/auth/login', '/auth/register'];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const response = error.response;
    // File downloads request a Blob; decode JSON error bodies so callers can read `message`
    if (response?.data instanceof Blob && response.data.type?.includes('json')) {
      try { response.data = JSON.parse(await response.data.text()); } catch { /* keep the Blob */ }
    }
    const isCredentialCall = CREDENTIAL_ENDPOINTS.some((path) => error.config?.url?.endsWith(path));
    if (response?.status === 401 && !isCredentialCall) {
      // Parallel requests can all fail with 401; only the first one notifies and signs out
      error.handled = true;
      if (getToken()) {
        toast.error(ERROR_MESSAGES[401]);
        expireSession();
      }
    }
    return Promise.reject(error);
  }
);

/** Unwraps the backend APIResponse envelope ({ success, message, data }). */
export const unwrap = (request) => request.then((res) => res.data.data);
