import api from './client';

export const fetchDashboard = () => api.get('/admin/dashboard').then(r => r.data);

export const fetchUsers = (params: {
  page?: number;
  limit?: number;
  search?: string;
  provider?: string;
  status?: string;
}) => api.get('/admin/users', { params }).then(r => r.data);

export const fetchUserById = (id: string) => api.get(`/admin/users/${id}`).then(r => r.data);

export const updateUser = (id: string, data: Record<string, unknown>) =>
  api.patch(`/admin/users/${id}`, data).then(r => r.data);

export const deleteUser = (id: string) =>
  api.delete(`/admin/users/${id}`).then(r => r.data);

export const fetchGrowthStats = (range: '7d' | '30d' | '90d') =>
  api.get('/admin/stats/growth', { params: { range } }).then(r => r.data);

// ── Therapists ──
export const fetchTherapists = (params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) => api.get('/admin/therapists', { params }).then(r => r.data);

export const createTherapist = (data: Record<string, unknown>) =>
  api.post('/admin/therapists', data).then(r => r.data);

export const updateTherapist = (id: string, data: Record<string, unknown>) =>
  api.patch(`/admin/therapists/${id}`, data).then(r => r.data);

export const deleteTherapist = (id: string) =>
  api.delete(`/admin/therapists/${id}`).then(r => r.data);

export const resendTherapistCredentials = (id: string) =>
  api.post(`/admin/therapists/${id}/resend-credentials`).then(r => r.data);

// ── Image Upload ──
export const uploadImage = (file: File, folder = 'therapist_pictures') => {
  const formData = new FormData();
  formData.append('image', file);
  return api.post(`/upload/image?folder=${folder}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

// ── Sessions ──
export const fetchSessions = (params: { page?: number; limit?: number; status?: string }) =>
  api.get('/admin/sessions', { params }).then(r => r.data);

// ── Mood Insights ──
export const fetchMoodInsights = () => api.get('/admin/mood-insights').then(r => r.data);

// ── Plans ──
export const fetchPlans = () => api.get('/admin/plans').then(r => r.data);
export const createPlan = (data: Record<string, unknown>) => api.post('/admin/plans', data).then(r => r.data);
export const updatePlanAdmin = (id: string, data: Record<string, unknown>) => api.patch(`/admin/plans/${id}`, data).then(r => r.data);
export const deletePlan = (id: string) => api.delete(`/admin/plans/${id}`).then(r => r.data);
