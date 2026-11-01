import { config } from './env';

export const API_BASE_URL = config.apiBaseUrl;

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

