// Re-export AI service methods that the QuestionBank and PaperGenerator pages need.
// This file originally pointed to non-existent /questions endpoints.
// Now it delegates to the correct /ai/* backend routes via aiService.
export { aiService as questionsApi } from './ai';
