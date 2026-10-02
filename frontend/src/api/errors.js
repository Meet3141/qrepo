import { toast } from '../components/Toast';

export const ERROR_MESSAGES = {
  network: 'Unable to connect to the server. Please check your connection and try again.',
  400: 'The request could not be processed. Please check the provided information.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This action conflicts with the current data. Please refresh and try again.',
  422: 'Some of the provided information is invalid.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'The server encountered an error. Please try again later.',
  unknown: 'Something went wrong. Please try again.',
};

// Backend messages too vague to be worth showing over the status default
const GENERIC = new Set(['Insufficient permissions', 'Not authenticated', 'Validation error', 'Not Found', 'Internal server error']);

const fieldName = (loc = []) =>
  loc.filter((part) => !['body', 'query', 'path'].includes(part) && typeof part === 'string').join('.') || null;

function validationDetails(body) {
  const errors = body?.data?.errors || (Array.isArray(body?.detail) ? body.detail : null);
  if (!Array.isArray(errors)) return '';
  return errors.slice(0, 3).map((e) => {
    const msg = String(e.msg || '').replace(/^Value error,\s*/i, '');
    const field = fieldName(e.loc);
    return field ? `${field.replace(/_/g, ' ')}: ${msg}` : msg;
  }).filter(Boolean).join('; ');
}

/**
 * User-facing message for a failed API call. 4xx and AI-service (502-504) messages from the
 * backend are written for users and shown as-is; 500s never expose server details.
 */
export function getErrorMessage(err, fallback) {
  if (!err?.response) {
    if (err?.code === 'ERR_CANCELED') return '';
    return err?.isAxiosError || err?.request ? ERROR_MESSAGES.network : fallback || ERROR_MESSAGES.unknown;
  }
  const { status, data: body } = err.response;
  const backend = typeof body?.message === 'string' ? body.message
    : typeof body?.detail === 'string' ? body.detail : '';
  const useful = backend && !GENERIC.has(backend) ? backend : '';

  if (status === 422) {
    const details = validationDetails(body);
    if (details) return `${ERROR_MESSAGES[422]} ${details}`;
    return useful || ERROR_MESSAGES[422];
  }
  if (status === 401) return useful || ERROR_MESSAGES[401];
  if (status >= 502 && status <= 504) return useful || ERROR_MESSAGES[500];
  if (status >= 500) return ERROR_MESSAGES[500];
  return useful || ERROR_MESSAGES[status] || fallback || ERROR_MESSAGES.unknown;
}

/** Report an API failure as a toast, unless a global handler (e.g. session expiry) already did. */
export function notifyError(err, fallback) {
  if (err?.handled) return;
  const message = getErrorMessage(err, fallback);
  if (message) toast.error(message);
}
