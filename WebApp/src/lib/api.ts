export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5217';

export type AuthResponse = {
  success: boolean;
  message: string;
  userId?: number;
  email?: string;
  fullName?: string;
};

export async function apiPost<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as TRes;
  if (!res.ok) {
    // try to surface server message
    const msg = (data as any)?.message || `Request failed with ${res.status}`;
    throw new Error(msg);
  }
  return data;
}
