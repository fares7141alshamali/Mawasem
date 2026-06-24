import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1/',
});
// Do NOT set a global Content-Type default. Axios sets application/json
// automatically when it serialises a plain object, and leaves Content-Type
// unset for FormData so the browser can supply the multipart boundary.

// ─── Request interceptor ─────────────────────────────────────────────────────
// Attach the JWT Bearer token on every request if one is stored.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor ────────────────────────────────────────────────────
// On 401, attempt a silent token refresh (simplejwt /auth/token/refresh/).
// If the refresh also fails, clear storage and redirect to /login.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');

      if (refresh) {
        try {
          const { data } = await axios.post(
            `${apiClient.defaults.baseURL}auth/token/refresh/`,
            { refresh },
          );
          localStorage.setItem('access_token', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return apiClient(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
