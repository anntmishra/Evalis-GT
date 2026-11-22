import api from './index.js';
export const getWorkspaceCatalog = async () => (await api.get('/workspace/catalog')).data;
export const getWorkspaceOverview = async () => (await api.get('/workspace/overview')).data;
