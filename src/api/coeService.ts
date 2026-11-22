import api from './index.js';
export const getCoeStats = async () => {
  const [overview, approvals] = await Promise.all([api.get('/workspace/overview'), api.get('/workspace/approvals')]);
  return {data:{success:true,data:{totalExams:overview.data.quizzes,pendingApprovals:approvals.data.length,resultsPublished:overview.data.published}}};
};
export const getDepartments = async () => (await api.get('/departments')).data;
export const createDepartment = async (data: {name:string;code:string;description?:string;schoolId?:string}) => (await api.post('/departments',data)).data;
export const getBatchesForPublishing = async () => ({data:{success:true,data:(await api.get('/workspace/results')).data}});
export const publishResults = async (batchId:string|number) => api.post(`/workspace/results/${batchId}/publish`);
export const getPendingExamApprovals = async () => ({data:{success:true,data:(await api.get('/workspace/approvals')).data}});
export const approveExam = async (id:string|number) => (await api.post(`/workspace/approvals/${id}`)).data;

export const previewExam = async (id:string|number) => (await api.get(`/workspace/approvals/${id}`)).data;
