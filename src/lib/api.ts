const BASE_URL = "/api";

/** 5 attempts / 60s per (IP + email), mirroring backend/src/middleware/rateLimit.js */
const LIMIT = 5;
const WINDOW_MS = 60_000;

interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  error?: string;
  fields?: Record<string, string>;
  data?: T;
  [key: string]: any;
}

type LoginPayload = {
  email: string;
  password: string;
};

type ApiRole = "student" | "delivery" | "employee";

type LoginUser = {
  id: string;
  name: string;
  role: ApiRole;
};

type AuthPayload = {
  token: string;
  user: LoginUser;
};

const rateMap = new Map<string, { count: number; resetAt: number }>();

function getKeyState(key: string) {
  const now = Date.now();
  const entry = rateMap.get(key);

  if (!entry) {
    return { count: 0, resetAt: now + 60_000 };
  }

  if (entry.resetAt <= now) {
    rateMap.delete(key);
    return { count: 0, resetAt: now + 60_000 };
  }

  return entry;
}

export const api = {
  LIMIT,
  WINDOW_MS,

  rateState(key: string) {
    const now = Date.now();
    const entry = rateMap.get(key);

    if (!entry || entry.resetAt <= now) {
      return { remaining: this.LIMIT, retryIn: 0 };
    }

    const remaining = Math.max(0, this.LIMIT - entry.count);
    const retryIn = Math.ceil((entry.resetAt - now) / 1000);

    return { remaining, retryIn };
  },

  /* ================= AUTH ENDPOINTS ================= */

  /** POST /api/auth/login or /api/auth/admin/login */
  login: (payload: LoginPayload, opts?: { adminPortal?: boolean }) =>
    authRequest(opts?.adminPortal ? "/auth/admin/login" : "/auth/login", payload),

  /** POST /api/auth/register */
  register: (payload: {
    fullName: string;
    studentId?: string;
    email: string;
    password: string;
    confirm?: string;
    role: ApiRole;
    agree?: boolean;
  }) =>
    authRequest("/auth/register", {
      confirm: payload.password,
      agree: true,
      ...payload,
    }),

  /** GET /api/auth/me */
  me: (token: string) => request("/auth/me", "GET", token),

  /** Client-side mirror of backend/src/middleware/validate.js loginSchema — catches obvious
   *  mistakes before spending a rate-limited request. */
  validateLogin: ({ email, password }: LoginPayload) => {
    const fields: Record<string, string> = {};

    if (!email.trim()) {
      fields.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      fields.email = "Enter a valid email address.";
    }

    if (!password) {
      fields.password = "Password is required.";
    } else if (password.length < 6) {
      fields.password = "Password must be at least 6 characters.";
    }

    return fields;
  },

  /** Client-side mirror of backend/src/middleware/validate.js errandSchema. */
  validateErrand: (payload: {
    title: string;
    instructions: string;
    pickup: string;
    dropoff: string;
    reward: number | string;
    category: string;
    deadline: string;
  }) => {
    const errors: Record<string, string> = {};
    const title = payload.title.trim();
    if (title.length < 6) errors.title = "Title must be at least 6 characters.";
    else if (title.length > 90) errors.title = "Title must be 90 characters or fewer.";
    else if (/[<>]/.test(title)) errors.title = "Title contains forbidden characters (< >).";

    const instructions = payload.instructions.trim();
    if (instructions.length < 10) errors.instructions = "Give the runner at least 10 characters of instructions.";
    else if (instructions.length > 600) errors.instructions = "Instructions are too long.";

    if (!["Food Run", "Printing", "Queuing", "Deliveries", "Others"].includes(payload.category))
      errors.category = "Choose a valid category.";

    if (!payload.pickup.trim() || payload.pickup.trim().length < 3)
      errors.pickup = "Pick-up location is required.";
    if (!payload.dropoff.trim() || payload.dropoff.trim().length < 3)
      errors.dropoff = "Drop-off location is required.";

    const reward = Number(payload.reward);
    if (!Number.isInteger(reward)) errors.reward = "Reward must be a whole number.";
    else if (reward < 20) errors.reward = "Minimum reward is ₱20.";
    else if (reward > 1000) errors.reward = "Maximum reward is ₱1000.";

    if (!payload.deadline.trim() || payload.deadline.trim().length < 3)
      errors.deadline = "Deadline is required.";

    return errors;
  },

  /* ================= ER RAND ENDPOINTS ================= */

  /** GET /api/errands — Fetch public open errands for browsing */
  getErrands: (token?: string) =>
    request("/errands", "GET", token),

  /** GET /api/errands/mine — Fetch errands owned by or assigned to the caller */
  getMyErrands: (token: string) =>
    request("/errands/mine", "GET", token),

  /** GET /api/errands/:id — Fetch specific errand details */
  getErrandById: (token: string, id: string) =>
    request(`/errands/${id}`, "GET", token),

  /** POST /api/errands — Create a new errand request */
  createErrand: (token: string, errandData: Record<string, any>) =>
    request("/errands", "POST", token, errandData),

  /** POST /api/errands/:id/accept — Runner accepts an open errand */
  acceptErrand: (token: string, id: string) =>
    request(`/errands/${id}/accept`, "POST", token),

  /** PATCH /api/errands/:id/status — Update progress status (in_progress, picked_up, done, etc.) */
  updateErrandStatus: (
    token: string,
    id: string,
    status: "in_progress" | "picked_up" | "review" | "done" | "cancelled",
  ) => request(`/errands/${id}/status`, "PATCH", token, { status }),

  /** DELETE /api/errands/:id — Owner cancels/deletes an errand request */
  deleteErrand: (token: string, id: string) =>
    request(`/errands/${id}`, "DELETE", token),

  /* ================= ADMIN ENDPOINTS (requireRole("admin")) ================= */

  /** GET /api/admin/users */
  getUsers: (token: string) => request("/admin/users", "GET", token),

  /** GET /api/admin/users/hashes — proof of bcrypt hashing, truncated digests only */
  getUserHashes: (token: string) => request("/admin/users/hashes", "GET", token),

  /** GET /api/admin/errands */
  getAdminErrands: (token: string) => request("/admin/errands", "GET", token),

  /** GET /api/admin/audit-log */
  getAuditLog: (token: string, limit = 50) =>
    request(`/admin/audit-log?limit=${limit}`, "GET", token),

  /** GET /api/admin/stats */
  getStats: (token: string) => request("/admin/stats", "GET", token),

  /** PATCH /api/admin/users/:id/status */
  setUserStatus: (token: string, id: string, status: "active" | "suspended") =>
    request(`/admin/users/${id}/status`, "PATCH", token, { status }),
};

async function request<T = any>(
  endpoint: string,
  method: string = "GET",
  token?: string | null,
  body?: any,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: data.error || "An unexpected error occurred.",
        fields: data.fields,
      };
    }

    return {
      ok: true,
      status: res.status,
      ...data,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 500,
      error: "Network error. Please check your connection.",
    };
  }
}

/** Wraps the flat { ok, status, token, user } auth response into { ok, status, data } */
async function authRequest(
  endpoint: string,
  payload: Record<string, any>,
): Promise<ApiResponse<AuthPayload>> {
  const res = await request<any>(endpoint, "POST", null, payload);
  if (!res.ok) return { ok: false, status: res.status, error: res.error, fields: res.fields };
  return { ok: true, status: res.status, data: { token: res.token, user: res.user } };
}