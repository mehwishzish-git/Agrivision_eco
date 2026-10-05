import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor – never expose stack traces
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error ||
      err.response?.data?.message ||
      (err.response?.status === 413 ? 'File too large (max 10MB)' : null) ||
      (err.response?.status >= 500 ? 'Server error. Please try again.' : null) ||
      err.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// ─── Farms ───────────────────────────────────────────────────────────────────
export const getFarms = () => api.get('/farms').then(r => r.data);
export const getFarm = (id) => api.get(`/farms/${id}`).then(r => r.data);
export const createFarm = (data) => api.post('/farms', data).then(r => r.data);
export const updateFarm = (id, data) => api.put(`/farms/${id}`, data).then(r => r.data);

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const getDashboard = (farmId) => api.get(`/farms/${farmId}/dashboard`).then(r => r.data);

// ─── Zones ───────────────────────────────────────────────────────────────────
export const getZones = (farmId) => api.get(`/farms/${farmId}/zones`).then(r => r.data);
export const getZone = (zoneId) => api.get(`/zones/${zoneId}`).then(r => r.data);
export const createZone = (farmId, data) => api.post(`/farms/${farmId}/zones`, data).then(r => r.data);
export const updateZone = (zoneId, data) => api.put(`/zones/${zoneId}`, data).then(r => r.data);

// ─── Soil ────────────────────────────────────────────────────────────────────
export const getSoil = (zoneId) => api.get(`/zones/${zoneId}/soil`).then(r => r.data);
export const addSoil = (zoneId, data) => api.post(`/zones/${zoneId}/soil`, data).then(r => r.data);

// ─── Weather ─────────────────────────────────────────────────────────────────
export const getWeather = (farmId) => api.get(`/farms/${farmId}/weather`).then(r => r.data);
export const addWeather = (farmId, data) => api.post(`/farms/${farmId}/weather`, data).then(r => r.data);

// ─── Analysis ────────────────────────────────────────────────────────────────
export const analyzeZone = (zoneId, formData) => {
  return axios.post(`/api/zones/${zoneId}/analyze`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  }).then(r => r.data);
};
export const getAnalyses = (zoneId) => api.get(`/zones/${zoneId}/analyses`).then(r => r.data);

// ─── Health ──────────────────────────────────────────────────────────────────
export const getFarmHealth = (farmId) => api.get(`/farms/${farmId}/health`).then(r => r.data);
export const getHealthHistory = (farmId) => api.get(`/farms/${farmId}/health/history`).then(r => r.data);

// ─── Recommendations ─────────────────────────────────────────────────────────
export const getRecommendations = (farmId) => api.get(`/farms/${farmId}/recommendations`).then(r => r.data);
export const updateRecStatus = (recId, status) => api.put(`/recommendations/${recId}/status`, { status }).then(r => r.data);

// ─── Simulation ──────────────────────────────────────────────────────────────
export const runSimulation = (zoneId, params) => api.post(`/zones/${zoneId}/simulate`, params).then(r => r.data);
export const getSimulations = (zoneId) => api.get(`/zones/${zoneId}/simulations`).then(r => r.data);

// ─── Assistant ───────────────────────────────────────────────────────────────
export const sendAssistantMessage = (farmId, message) =>
  api.post(`/farms/${farmId}/assistant`, { message }).then(r => r.data);
export const getAssistantHistory = (farmId) =>
  api.get(`/farms/${farmId}/assistant/history`).then(r => r.data);
export const clearAssistantHistory = (farmId) =>
  api.delete(`/farms/${farmId}/assistant/history`).then(r => r.data);

export default api;
