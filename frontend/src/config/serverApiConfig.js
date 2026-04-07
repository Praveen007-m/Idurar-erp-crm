/**
 * Backend URL
 * Reads from environment variable
 */
const BACKEND_URL = import.meta.env.VITE_BACKEND_SERVER;
const API_URL = import.meta.env.VITE_API_URL;

/**
 * API URL
 */
export const API_BASE_URL =
  import.meta.env.MODE === "production"
    ? API_URL
      ? `${API_URL}/api`
      : `${BACKEND_URL}/api`
    : "http://localhost:8888/api";

console.log('[API Config] Mode:', import.meta.env.MODE);
console.log('[API Config] BASE_URL:', API_BASE_URL);

/**
 * Base URL
 */
export const BASE_URL =
  import.meta.env.MODE === "production"
    ? BACKEND_URL
    : "http://localhost:8888";

/**
 * Website URL
 */
export const WEBSITE_URL =
  import.meta.env.MODE === "production"
    ? BACKEND_URL
    : "http://localhost:3000";

/**
 * Download API
 */
export const DOWNLOAD_BASE_URL =
  import.meta.env.MODE === "production"
    ? `${BACKEND_URL}/download`
    : "http://localhost:8888/download";

/**
 * File API
 */
export const FILE_BASE_URL = BASE_URL;

/**
 * Token name
 */
export const ACCESS_TOKEN_NAME = "x-auth-token";