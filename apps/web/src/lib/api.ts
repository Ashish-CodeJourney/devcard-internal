const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'https://devcard-internal-backend.onrender.com';

export async function apiFetch<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as Record<string, string>)?.message ?? `Request failed: ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}
