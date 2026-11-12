const API_BASE = (import.meta.env.VITE_SMARTMOTION_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
export const getToken = () => localStorage.getItem('sm_access_token');
export async function apiRequest<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (authenticated && token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || `Request failed (${response.status})`);
  return body as T;
}
export { API_BASE };
