import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://66.85.185.109/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', res.data.data.accessToken);
          localStorage.setItem('refreshToken', res.data.data.refreshToken);
          error.config.headers.Authorization = `Bearer ${res.data.data.accessToken}`;
          return api(error.config);
        } catch {
          localStorage.clear();
          window.location.href = '/auth';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (token: string) => api.post('/auth/login', { firebaseIdToken: token }),
  completeProfile: (data: { username: string; gameUid: string; displayName?: string }) =>
    api.post('/auth/complete-profile', data),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
};

// Tournaments
export const tournamentApi = {
  list: (page = 0, size = 10, status?: string) =>
    api.get('/tournaments', { params: { page, size, status } }),
  get: (slug: string) => api.get(`/tournaments/${slug}`),
  create: (data: unknown) => api.post('/tournaments', data),
  leaderboard: (id: string) => api.get(`/leaderboard/${id}`),
  updatePoints: (id: string, data: unknown) => api.post(`/tournaments/${id}/points`, data),
};

// Teams
export const teamApi = {
  register: (tournamentId: string, data: unknown) =>
    api.post(`/tournaments/${tournamentId}/teams`, data),
  get: (tournamentId: string) => api.get(`/tournaments/${tournamentId}/teams`),
};

// Payments
export const paymentApi = {
  createOrder: (data: unknown) => api.post('/payments/order', data),
  verify: (data: unknown) => api.post('/payments/verify', data),
};

