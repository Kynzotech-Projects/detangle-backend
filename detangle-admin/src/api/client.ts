import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_URL || 'https://detangle-backend.onrender.com/api';

const STORAGE_KEY = 'detangle_admin_token';

export function getAdminToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(STORAGE_KEY);
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to attach the admin token from localStorage
api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401/403 responses to force logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      clearAdminToken();
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;
