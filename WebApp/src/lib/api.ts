export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

function isJsonResponse(res: Response): boolean {
  const contentType = res.headers.get('content-type')?.toLowerCase() ?? '';
  // ASP.NET ProblemDetails uses application/problem+json
  return contentType.includes('application/json') || contentType.includes('+json');
}

export type AuthResponse = {
  success: boolean;
  message: string;
  userId?: number;
  username?: string;
  email?: string;
  fullName?: string;
  role?: string;
  sessionId?: string;
};

export type UserSession = {
  active: boolean;
  user?: {
    id: number;
    email: string;
    fullName: string;
    role: string;
  };
};

export async function apiPost<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });
  } catch (err: any) {
    throw new Error(err?.message || 'Network error while making request');
  }

  let data: any;
  if (isJsonResponse(res)) {
    data = (await res.json()) as TRes;
  } else {
    const text = await res.text();
    throw new Error(`Server returned non-JSON response (${res.status}): ${text.substring(0, 200)}`);
  }
  
  if (!res.ok) {
    // try to surface server message
    const msg = (data as any)?.message || `Request failed with ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function apiGet<TRes>(path: string): Promise<TRes> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      credentials: 'include'
    });
  } catch (err: any) {
    throw new Error(err?.message || 'Network error while making request');
  }

  let data: any;
  if (isJsonResponse(res)) {
    data = (await res.json()) as TRes;
  } else {
    const text = await res.text();
    throw new Error(`Server returned non-JSON response (${res.status}): ${text.substring(0, 200)}`);
  }
  
  if (!res.ok) {
    const msg = (data as any)?.message || `Request failed with ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function apiPut<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });
  } catch (err: any) {
    throw new Error(err?.message || 'Network error while making request');
  }

  if (!res.ok) {
    let msg = `Request failed with ${res.status}`;
    try {
      const data = await res.json();
      msg = (data as any)?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  if (res.status === 204) return {} as TRes; // No content
  const data = (await res.json()) as TRes;
  return data;
}

export async function apiDelete(path: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      credentials: 'include'
    });
  } catch (err: any) {
    throw new Error(err?.message || 'Network error while making request');
  }

  if (!res.ok) {
    let msg = `Request failed with ${res.status}`;
    try {
      const data = await res.json();
      msg = (data as any)?.message || msg;
    } catch {}
    throw new Error(msg);
  }
}
