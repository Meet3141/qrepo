import { apiClient, unwrap as data } from './client';

/** Download a file endpoint (CSV/PDF) using the filename the server suggests. */
export async function downloadFile(url, params = {}, fallbackName = 'download') {
  const res = await apiClient.get(url, { params, responseType: 'blob' });
  const disposition = res.headers['content-disposition'] || '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const href = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = href;
  link.download = match ? match[1] : fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export const usersApi = {
  list: (params) => data(apiClient.get('/users', { params })),
  create: (body) => data(apiClient.post('/users', body)),
  update: (id, body) => data(apiClient.put(`/users/${id}`, body)),
  remove: (id) => data(apiClient.delete(`/users/${id}`)),
  roles: () => data(apiClient.get('/roles')),
  exportCsv: () => downloadFile('/users/export', {}, 'qrepo-users.csv'),
};

export const departmentsApi = {
  list: (search) => data(apiClient.get('/departments', { params: search ? { search } : {} })),
  create: (body) => data(apiClient.post('/departments', body)),
  update: (id, body) => data(apiClient.put(`/departments/${id}`, body)),
  remove: (id) => data(apiClient.delete(`/departments/${id}`)),
  exportCsv: () => downloadFile('/departments/export', {}, 'qrepo-departments.csv'),
};

export const facultyApi = {
  list: (params) => data(apiClient.get('/faculty', { params })),
  create: (body) => data(apiClient.post('/faculty', body)),
  update: (id, body) => data(apiClient.patch(`/faculty/${id}`, body)),
  exportCsv: (params) => downloadFile('/faculty/export', params, 'qrepo-faculty-report.csv'),
};

export const permissionsApi = {
  matrix: () => data(apiClient.get('/permissions/matrix')),
  save: (changes) => data(apiClient.put('/permissions/matrix', { changes })),
  reset: () => data(apiClient.post('/permissions/matrix/reset')),
  mine: () => data(apiClient.get('/permissions/me')),
};

export const papersApi = {
  list: (params) => data(apiClient.get('/papers', { params })),
  get: (id) => data(apiClient.get(`/papers/${id}`)),
  create: (body) => data(apiClient.post('/papers', body)),
  update: (id, body) => data(apiClient.put(`/papers/${id}`, body)),
  remove: (id) => data(apiClient.delete(`/papers/${id}`)),
  submit: (id, note) => data(apiClient.post(`/papers/${id}/submit`, note ? { note } : {})),
  review: (id, decision, comment) => data(apiClient.post(`/papers/${id}/review`, { decision, ...(comment ? { comment } : {}) })),
  comment: (id, body) => data(apiClient.post(`/papers/${id}/comments`, { body })),
  downloadPdf: (id, includeAnswers = false) =>
    downloadFile(`/papers/${id}/pdf`, includeAnswers ? { include_answers: true } : {}, 'paper.pdf'),
};

export const analyticsApi = {
  adminOverview: () => data(apiClient.get('/analytics/admin/overview')),
  adminActivity: (limit = 20) => data(apiClient.get('/analytics/admin/activity', { params: { limit } })),
  facultyOverview: (subjectId) =>
    data(apiClient.get('/analytics/faculty/overview', { params: subjectId ? { subject_id: subjectId } : {} })),
  exportHeatmap: (subjectId) =>
    downloadFile('/analytics/faculty/heatmap/export', subjectId ? { subject_id: subjectId } : {}, 'heatmap.csv'),
};
