const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface ApiAnalysis {
  id: string;
  label: string | null;
  sequence: string;
  sequenceLength: number;
  adenineCount: number;
  thymineCount: number;
  guanineCount: number;
  cytosineCount: number;
  gcPercentage: number;
  atPercentage: number;
  reverseComplement: string;
  createdAt: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(API_BASE + path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(payload.error ?? "The request could not be completed.");
  }
  return payload;
}

export const api = {
  me: () => request<{ user: ApiUser }>("/api/auth/me"),
  register: (name: string, email: string, password: string) =>
    request<{ user: ApiUser }>("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  login: (email: string, password: string) =>
    request<{ user: ApiUser }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  analyses: () => request<{ analyses: ApiAnalysis[] }>("/api/analyses"),
  saveAnalysis: (sequence: string, label?: string) =>
    request<{ analysis: ApiAnalysis }>("/api/analyses", { method: "POST", body: JSON.stringify({ sequence, label }) }),
  deleteAnalysis: (id: string) => request<void>("/api/analyses/" + encodeURIComponent(id), { method: "DELETE" }),
};
