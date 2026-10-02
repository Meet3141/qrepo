import { apiClient, unwrap } from './client';

export const aiService = {
  /**
   * POST /ai/questions/generate — validated question drafts for faculty review.
   * Body: subject_id, unit_id?, topic, target_audience, question_type, number_of_questions (5|6),
   * difficulty, bloom_level.
   */
  generateQuestions: (params) => {
    const payload = { ...params };
    if (!payload.unit_id) delete payload.unit_id;
    return unwrap(apiClient.post('/ai/questions/generate', payload));
  },

  /** GET /ai/generations?subject_id&limit (1-100). */
  listGenerations: ({ subject_id, limit } = {}) =>
    unwrap(apiClient.get('/ai/generations', { params: { ...(subject_id ? { subject_id } : {}), ...(limit ? { limit } : {}) } })),

  getGeneration: (generationId) => unwrap(apiClient.get(`/ai/generations/${generationId}`)),

  /**
   * POST /ai/drafts/{draft_id}/review.
   * Body: action ACCEPT | EDIT | REJECT, edits (EDIT only), rejection_reason (REJECT only), comment?, rating 1-5?
   */
  reviewDraft: (draftId, review) => unwrap(apiClient.post(`/ai/drafts/${draftId}/review`, review)),

  /** GET /ai/health (Admin only). */
  healthCheck: () => unwrap(apiClient.get('/ai/health')),
};
