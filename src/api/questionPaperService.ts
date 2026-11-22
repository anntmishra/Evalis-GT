import api from './index.js';

export type QuestionPaperDecision = 'approve' | 'request_changes' | 'reject';

export const submitQuestionPaper = async (data: Record<string, unknown>) =>
  (await api.post('/question-papers', { ...data, submitForApproval: true })).data;

export const getMyQuestionPapers = async () => (await api.get('/question-papers/mine')).data;
export const getQuestionPaperApprovals = async () => (await api.get('/question-papers/approvals')).data;
export const getQuestionPaper = async (id: string) => (await api.get(`/question-papers/${id}`)).data;
export const updateQuestionPaper = async (id: string, data: Record<string, unknown>) =>
  (await api.put(`/question-papers/${id}`, data)).data;
export const decideQuestionPaper = async (id: string, action: QuestionPaperDecision, comment: string) =>
  (await api.post(`/question-papers/${id}/decision`, { action, comment })).data;
