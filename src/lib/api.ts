const BASE_URL = "/api";

/** Mirrors backend/src/middleware/rateLimit.js: 5 attempts / 60s per (IP + email). */
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

type ApiRole = "student" | "delivery";

type LoginUser = {
  id: string;
  name: string;
  role: ApiRole | "admin";
};

type AuthPayload = {
  token: string;
  user: LoginUser;
};

/**
 * Rate-limit state as reported by the SERVER (RateLimit-* response headers of the
 * last login/register call). Nothing here is simulated in the browser.
 * In production the API must expose these headers to the frontend origin
 * (cors exposedHeaders in backend/src/server.js), otherwise this stays at LIMIT.
 */
let serverRate: { remaining: number; resetAt: number } | null = null;

function readRateHeaders(res: Response) {
  const remaining = res.headers.get("RateLimit-Remaining");
  const reset = res.headers.get("RateLimit-Reset");
  if (remaining === null || reset === null) return;
  const r = Number(remaining);
  const s = Number(reset);
  if (Number.isFinite(r) && Number.isFinite(s)) {
    serverRate = { remaining: Math.max(0, r), resetAt: Date.now() + s * 1000 };
  }
}

export const api = {
  LIMIT,
  WINDOW_MS,

  /** Attempts left according to the server. `retryIn` is only set once none are left. */
  rateState(_key?: string) {
    const now = Date.now();
    if (!serverRate || serverRate.resetAt <= now) {
      return { remaining: this.LIMIT, retryIn: 0 };
    }
    const retryIn = serverRate.remaining <= 0 ? Math.ceil((serverRate.resetAt - now) / 1000) : 0;
    return { remaining: serverRate.remaining, retryIn };
  },

  /* ================= AUTH ENDPOINTS ================= */

  /** POST /api/auth/login or /api/auth/admin/login */
  login: (payload: LoginPayload, opts?: { adminPortal?: boolean }) =>
    authRequest(opts?.adminPortal ? "/auth/admin/login" : "/auth/login", payload),

  /**
   * POST /api/auth/register
   * The caller must send `confirm` and a real `agree` value: consent is no longer
   * filled in silently. The server rejects anything but agree === true.
   */
  register: (payload: {
    fullName: string;
    studentId: string;
    email: string;
    password: string;
    confirm: string;
    role: ApiRole;
    agree: boolean;
  }) => authRequest("/auth/register", payload),

  /** GET /api/auth/me */
  me: (token: string) => request("/auth/me", "GET", token),
  /** PATCH /api/auth/me */
  updateProfile: (token: string, data: { phone: string; spot: string }) =>
     request("/auth/me", "PATCH", token, data),
  /** Client-side sanity check before spending a rate-limited request.
   *  Deliberately has no password length rule: the server never reveals its
   *  password policy at login. */
  validateLogin: ({ email, password }: LoginPayload) => {
    const fields: Record<string, string> = {};

    if (!email.trim()) {
      fields.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      fields.email = "Enter a valid email address.";
    }

    if (!password) {
      fields.password = "Password is required.";
    }

    return fields;
  },

  leaveReview: (token: string, errandId: string, body: { rating: number; comment: string }) =>
  request(`/errands/${errandId}/review`, "POST", token, body),
getReview: (token: string, errandId: string) =>
  request(`/errands/${errandId}/review`, "GET", token),

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
    const MARKUP = "Must not contain the characters < or >.";
    const hasMarkup = (s: string) => /[<>]/.test(s);

    const title = payload.title.trim();
    if (title.length < 6) errors.title = "Title must be at least 6 characters.";
    else if (title.length > 90) errors.title = "Title must be 90 characters or fewer.";
    else if (hasMarkup(title)) errors.title = MARKUP;

    const instructions = payload.instructions.trim();
    if (instructions.length < 10) errors.instructions = "Give the runner at least 10 characters of instructions.";
    else if (instructions.length > 600) errors.instructions = "Instructions are too long.";
    else if (hasMarkup(instructions)) errors.instructions = MARKUP;

    if (!["Food Run", "Printing", "Queuing", "Deliveries", "Others"].includes(payload.category))
      errors.category = "Choose a valid category.";

    const pickup = payload.pickup.trim();
    if (pickup.length < 3) errors.pickup = "Pick-up location is required.";
    else if (pickup.length > 80) errors.pickup = "Pick-up location is too long.";
    else if (hasMarkup(pickup)) errors.pickup = MARKUP;

    const dropoff = payload.dropoff.trim();
    if (dropoff.length < 3) errors.dropoff = "Drop-off location is required.";
    else if (dropoff.length > 80) errors.dropoff = "Drop-off location is too long.";
    else if (hasMarkup(dropoff)) errors.dropoff = MARKUP;

    const reward = Number(payload.reward);
    if (!Number.isInteger(reward)) errors.reward = "Reward must be a whole number.";
    else if (reward < 10) errors.reward = "Minimum reward is \u20B110.";
    else if (reward > 1000) errors.reward = "Maximum reward is \u20B11000.";

    const deadline = payload.deadline.trim();
    if (deadline.length < 3) errors.deadline = "Deadline is required.";
    else if (deadline.length > 60) errors.deadline = "Deadline is too long.";
    else if (hasMarkup(deadline)) errors.deadline = MARKUP;

    return errors;
  },

  /* ================= ERRAND ENDPOINTS ================= */

  /** GET /api/errands - public board of open errands */
  getErrands: (token?: string) => request("/errands", "GET", token),

  /** GET /api/errands/mine - errands owned by or assigned to the caller */
  getMyErrands: (token: string) => request("/errands/mine", "GET", token),

  /** GET /api/errands/:id - one errand (owner or assigned runner only) */
  getErrandById: (token: string, id: string) => request(`/errands/${id}`, "GET", token),
  getMyTransactions: (token: string) => request(`/transactions/mine`, "GET", token),

  /** POST /api/errands - create an errand (student accounts only) */
  createErrand: (token: string, errandData: Record<string, any>) =>
    request("/errands", "POST", token, errandData),

  /** POST /api/errands/:id/accept - a runner accepts an open errand */
  acceptErrand: (token: string, id: string) => request(`/errands/${id}/accept`, "POST", token),

  /** PATCH /api/errands/:id/status - update progress (in_progress, picked_up, done, ...) */
  updateErrandStatus: (
    token: string,
    id: string,
    status: "in_progress" | "picked_up" | "review" | "done" | "cancelled",
  ) => request(`/errands/${id}/status`, "PATCH", token, { status }),

  /** DELETE /api/errands/:id - the owner deletes an errand */
  deleteErrand: (token: string, id: string) => request(`/errands/${id}`, "DELETE", token),

  /* ================= ADMIN ENDPOINTS (requireRole("admin")) ================= */

  /** GET /api/admin/users */
  getUsers: (token: string) => request("/admin/users", "GET", token),

  /** GET /api/admin/users/hashes - proof of bcrypt hashing, truncated digests only */
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

    // Keep the "attempts left" display in sync with what the server actually enforces.
    if (method === "POST" && endpoint.startsWith("/auth/")) readRateHeaders(res);

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        // An empty 5xx usually means the API is down or unreachable (for example the
        // dev proxy answering for a stopped backend), so say that instead of "unexpected".
        error:
          data.error ||
          (res.status >= 500
            ? "The server is unavailable. Please try again later."
            : "An unexpected error occurred."),
        fields: data.fields,
      };
    }

    return {
      ok: true,
      status: res.status,
      ...data,
    };
  } catch {
    return {
      ok: false,
      status: 0,
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