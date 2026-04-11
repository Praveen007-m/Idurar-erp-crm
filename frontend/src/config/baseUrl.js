const BACKEND_URL = import.meta.env.VITE_BACKEND_SERVER;
const API_URL = import.meta.env.VITE_API_URL;

export const BASE_URL =
  import.meta.env.MODE === 'production'
    ? API_URL || BACKEND_URL || 'https://idurar-erp-crm-production-8878.up.railway.app'
    : 'http://localhost:8888';
