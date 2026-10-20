import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

let accessToken = null; // lives in memory only, never in localStorage
let onSessionExpired = () => {};

export const setAccessToken = (token) => { accessToken = token; };
export const setSessionExpiredHandler = (fn) => { onSessionExpired = fn; };

const api = axios.create({ baseURL, withCredentials: true });
const bare = axios.create({ baseURL, withCredentials: true }); // no interceptors: used only for refresh

// Refresh tokens are single-use, so two parallel refreshes (React StrictMode,
// or several 401s at once) must share ONE request.
let refreshing = null;
export function refreshSession() {
  if (!refreshing) {
    refreshing = bare
      .post('/auth/refresh')
      .then((res) => {
        accessToken = res.data.accessToken;
        return res.data;
      })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// On a 401, refresh once and retry the original request.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        await refreshSession();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        onSessionExpired();
      }
    }
    return Promise.reject(error);
  }
);

export function errorMessage(err) {
  const data = err.response?.data;
  if (data?.details?.length) return data.details.map((d) => `${d.field}: ${d.message}`).join(', ');
  return data?.error || err.message || 'Something went wrong';
}

export default api;