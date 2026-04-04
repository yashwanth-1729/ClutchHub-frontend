import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://66.85.185.109:8080/api';

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

// Users / Messaging
export const userApi = {
  search: (q: string) => api.get('/users/search', { params: { q } }),
  conversations: () => api.get('/users/conversations'),
  getMessages: (userId: string) => api.get(`/users/messages/${userId}`),
  sendMessage: (userId: string, content: string) => api.post(`/users/messages/${userId}`, { content }),
  achievements: () => api.get('/users/achievements'),
};

// Points
export const pointsApi = {
  /** Simple mode: pass totalPoints directly */
  submitSimple: (tournamentId: string, teamId: string, matchNumber: number, totalPoints: number) =>
    api.post(`/points/${tournamentId}`, { teamId, matchNumber, totalPoints, kills: 0, placement: 0 }),
  /** Detailed mode: pass kills + placement, server computes total */
  submitDetailed: (tournamentId: string, teamId: string, matchNumber: number, kills: number, placement: number) =>
    api.post(`/points/${tournamentId}`, { teamId, matchNumber, kills, placement }),
};

// Org Host
export const orgHostApi = {
  assign: (tournamentId: string, userId: string) => api.post('/org-hosts', { tournamentId, userId }),
  remove: (id: string) => api.delete(`/org-hosts/${id}`),
  list: (tournamentId: string) => api.get(`/org-hosts/${tournamentId}`),
};

// Certificates
export const certificateApi = {
  generate: (tournamentId: string, topN: number) => api.post(`/certificates/${tournamentId}`, { topN }),
  my: () => api.get('/certificates/my'),
  forTournament: (tournamentId: string) => api.get(`/certificates/${tournamentId}`),
};

// Credentials (room ID + password push)
export const credentialsApi = {
  push: (tournamentId: string, roomId: string, roomPassword: string) =>
    api.post(`/credentials/${tournamentId}`, { roomId, roomPassword }),
};

