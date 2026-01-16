// Helper functions for admin API calls that bypass proxy
const ADMIN_BASE_URL = 'http://localhost:5001';

export async function adminApiPut<T>(path: string, data: T): Promise<void> {
  const response = await fetch(`${ADMIN_BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Request failed');
  }
}

export async function adminApiDelete(path: string): Promise<void> {
  const response = await fetch(`${ADMIN_BASE_URL}${path}`, {
    method: 'DELETE',
    credentials: 'include'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Request failed');
  }
}

export async function adminApiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${ADMIN_BASE_URL}${path}`, {
    credentials: 'include'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Request failed');
  }

  return await response.json();
}
