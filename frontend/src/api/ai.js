import { apiClient } from './client';

export const aiService = {
  /**
   * Generate validated question drafts for faculty review.
   * POST /ai/questions/generate
   * @param {Object} params
   * @param {string} params.subject_id - UUID
   * @param {string} [params.unit_id] - UUID (optional)
   * @param {string} params.topic - 2-200 chars, single line
   * @param {string} params.target_audience - 2-100 chars, single line
   * @param {string} params.question_type - MCQ | SHORT_ANSWER | LONG_ANSWER | TRUE_FALSE
   * @param {number} params.number_of_questions - 5 or 6
   * @param {string} params.difficulty - EASY | MEDIUM | HARD
   * @param {string} params.bloom_level - REMEMBER | UNDERSTAND | APPLY | ANALYZE | EVALUATE | CREATE
   */
  generateQuestions: async (params) => {
    const payload = { ...params };
    // Remove unit_id if empty/null
    if (!payload.unit_id) delete payload.unit_id;
    const response = await apiClient.post('/ai/questions/generate', payload);
    return response.data;
  },

  /**
   * List recent generations visible to the current user.
   * GET /ai/generations
   * @param {Object} [filters]
   * @param {string} [filters.subject_id] - UUID
   * @param {number} [filters.limit] - 1-100, default 20
   */
  listGenerations: async (filters = {}) => {
    const params = {};
    if (filters.subject_id) params.subject_id = filters.subject_id;
    if (filters.limit) params.limit = filters.limit;
    const response = await apiClient.get('/ai/generations', { params });
    return response.data;
  },

  /**
   * Get a generation with its question drafts.
   * GET /ai/generations/{generation_id}
   */
  getGeneration: async (generationId) => {
    const response = await apiClient.get(`/ai/generations/${generationId}`);
    return response.data;
  },

  /**
   * Accept, edit or reject a question draft (stores faculty feedback).
   * POST /ai/drafts/{draft_id}/review
   * @param {string} draftId - UUID
   * @param {Object} reviewData
   * @param {string} reviewData.action - ACCEPT | EDIT | REJECT
   * @param {Object} [reviewData.edits] - Required for EDIT action
   * @param {string} [reviewData.rejection_reason] - Required for REJECT action
   * @param {string} [reviewData.comment] - Optional, max 1000 chars
   * @param {number} [reviewData.rating] - Optional, 1-5
   */
  reviewDraft: async (draftId, reviewData) => {
    const response = await apiClient.post(`/ai/drafts/${draftId}/review`, reviewData);
    return response.data;
  },

  /**
   * Check AI provider availability (Admin only).
   * GET /ai/health
   */
  healthCheck: async () => {
    const response = await apiClient.get('/ai/health');
    return response.data;
  },
};
