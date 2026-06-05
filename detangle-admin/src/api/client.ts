import axios from 'axios';

export const BASE_URL = 'http://localhost:5000/api';
export const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'detangle-admin-secret-2024';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ADMIN_SECRET}`,
  },
});

export default api;
