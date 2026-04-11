const BACKEND_URL = import.meta.env.VITE_BACKEND_SERVER;

export const BASE_URL =
  import.meta.env.MODE === 'production'
    ? BACKEND_URL || 'https://idurar-erp-crm-production-8878.up.railway.app'
    : 'http://localhost:8888';
