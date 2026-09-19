/**
 * Real HTTP client for the Express backend in `backend/`.
 *
 * The UI runs against the in-browser mock (`src/lib/api.ts`) by default so the
 * demo works with zero setup. Point it at the real server by creating
 * `.env.local` with:
 *
 *   VITE_API_URL=http://localhost:4000/api
 */

const BASE =
  ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL as
    | string
    | undefined) ?? "";

export const usingRealBackend = BASE.length > 0;

export type HttpResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; fields?: Record<string, string> };

let token = "";
export const setToken = (t: string) => {
  token = t;
};
export const getToken = () => token;

async function request<T>(path: string, init: RequestInit = {}): Promise<HttpResult<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: json.error ?? res.statusText,
        fields: json.fields,
      };
    }
    return { ok: true, status: res.status, data: json as T };
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message || "Network error." };
  }
}

export const http = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body: unknown) =>
    request<T>(p, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(p: string, body: unknown) =>
    request<T>(p, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(p: string) => request<T>(p, { method: "DELETE" }),
};

/* Typed helpers mirroring the backend routes ------------------------------ */

export const authApi = {
  register: (body: Record<string, unknown>) => http.post("/auth/register", body),
  login: (body: { email: string; password: string }) => http.post("/auth/login", body),
  adminLogin: (body: { email: string; password: string }) => http.post("/auth/admin/login", body),
  me: () => http.get("/auth/me"),
};

export const errandApi = {
  board: () => http.get("/errands"),
  mine: () => http.get("/errands/mine"),
  create: (body: Record<string, unknown>) => http.post("/errands", body),
  read: (id: string) => http.get(`/errands/${id}`),
  cancel: (id: string) => http.del(`/errands/${id}`),
  accept: (id: string) => http.post(`/errands/${id}/accept`, {}),
};

export const adminApi = {
  users: () => http.get("/admin/users"),
  hashes: () => http.get("/admin/users/hashes"),
  errands: () => http.get("/admin/errands"),
  auditLog: (limit = 50) => http.get(`/admin/audit-log?limit=${limit}`),
  stats: () => http.get("/admin/stats"),
};
