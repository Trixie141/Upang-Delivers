import { useEffect, useState } from "react";
import {
  UserCog,
  Star,
  BadgeCheck,
  ShieldCheck,
  IdCard,
  ClipboardList,
  Hourglass,
  CheckCheck,
  Coins,
} from "lucide-react";
import { api } from "@/lib/api";

type Stats = {
  posted: number;
  active: number;
  completed: number;
  cancelled: number;
  spent: number;
};
const EMPTY_STATS: Stats = { posted: 0, active: 0, completed: 0, cancelled: 0, spent: 0 };
const ACTIVE_STATUSES = ["open", "in_progress", "picked_up", "review"];

// Same rules as the backend (validate.js), checked before sending
const NAME_RE = /^[\p{L}.'-]+(?:\s+[\p{L}.'-]+)+$/u;
const ID_RE = /^\d{2}-\d{4}-\d{3,6}$/;
const EMAIL_RE = /^[^\s@]+@phinmaed\.com$/i;

type FormState = {
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  spot: string;
  currentPassword: string;
};

function validateForm(f: FormState, emailChanged: boolean) {
  const e: Record<string, string> = {};
  const n = f.fullName.trim();
  if (n.length < 4 || n.length > 60 || !NAME_RE.test(n))
    e.fullName = "Enter your first and last name (letters only, 4-60 characters).";
  if (!ID_RE.test(f.studentId.trim())) e.studentId = "Use the campus format 03-2425-045935.";
  if (!EMAIL_RE.test(f.email.trim())) e.email = "Must be your official @phinmaed.com email.";
  if (emailChanged && !f.currentPassword)
    e.currentPassword = "Enter your current password to change your email.";
  if (f.phone.length > 20) e.phone = "Phone number is too long.";
  if (f.spot.length > 80) e.spot = "Meeting spot is too long.";
  return e;
}

// Works whether an id comes back as a string or a populated object,
// and whether the field is named ownerId or owner_id.
const idOf = (v: any) =>
  v && typeof v === "object" ? String(v._id ?? v.id ?? "") : String(v ?? "");

function buildStats(mine: any[]): Stats {
  const done = mine.filter((e) => e.status === "done");
  return {
    posted: mine.length,
    active: mine.filter((e) => ACTIVE_STATUSES.includes(e.status)).length,
    completed: done.length,
    cancelled: mine.filter((e) => e.status === "cancelled").length,
    spent: done.reduce((sum, e) => sum + (Number(e.reward) || 0), 0),
  };
}

export default function StudentProfile({
  token,
  userId,
  name,
  onProfileUpdated,
}: {
  token: string;
  userId: string;
  name: string;
  /** Lets App.tsx refresh the name shown in the navbar, on load and after a save */
  onProfileUpdated?: (u: { fullName: string }) => void;
}) {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<FormState>({
    fullName: name,
    studentId: "",
    email: "",
    phone: "",
    spot: "",
    currentPassword: "",
  });
  const [savedEmail, setSavedEmail] = useState(""); // email currently stored on the server
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let alive = true;

    Promise.all([api.me(token), api.getMyErrands(token)]).then(([meRes, errRes]) => {
      if (!alive) return;

      if (meRes.ok) {
        const u = meRes.user ?? meRes.data ?? {};
        const email = u.email ?? "";
        setSavedEmail(email);
        const loadedName = u.name ?? u.fullName;
        setForm((f) => ({
          ...f,
          fullName: loadedName ?? f.fullName,
          studentId: u.studentId ?? u.student_id ?? "",
          email,
          phone: u.phone ?? "",
          spot: u.spot ?? "",
        }));
        // Keeps the navbar (and localStorage cache) in sync with the database
        // on every load, not just after a save — covers edits made before this
        // wiring existed, or made from another device/session.
        if (loadedName && loadedName !== name) onProfileUpdated?.({ fullName: loadedName });
      }

      if (errRes.ok) {
        const list = errRes.errands ?? errRes.data ?? [];
        const mine = (Array.isArray(list) ? list : []).filter(
          (e: any) => idOf(e.ownerId ?? e.owner_id) === String(userId)
        );
        setStats(buildStats(mine));
      }

      setLoading(false);
    });

    return () => {
      alive = false;
    };
    // onProfileUpdated intentionally omitted: it's stable from App.tsx's
    // perspective and including it would re-run this fetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId, name]);

  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const emailChanged =
    savedEmail !== "" && form.email.trim().toLowerCase() !== savedEmail.toLowerCase();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const clientErrors = validateForm(form, emailChanged);
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length) {
      setMsg({ ok: false, text: "Please fix the highlighted fields." });
      return;
    }

    setSaving(true);
    const res = await api.updateProfile(token, {
      fullName: form.fullName.trim(),
      studentId: form.studentId.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      spot: form.spot.trim(),
      ...(emailChanged ? { currentPassword: form.currentPassword } : {}),
    });
    setSaving(false);

    if (!res.ok) {
      setFieldErrors(res.fields ?? {});
      setMsg({ ok: false, text: `${res.status} — ${res.error}` });
      return;
    }

    const u = res.user ?? {};
    const newName = u.name ?? form.fullName.trim();
    setSavedEmail(u.email ?? form.email.trim().toLowerCase());
    setForm((f) => ({
      ...f,
      fullName: newName,
      studentId: u.studentId ?? f.studentId,
      email: u.email ?? f.email,
      currentPassword: "",
    }));
    onProfileUpdated?.({ fullName: newName });
    setMsg({ ok: true, text: "Profile changes saved." });
  }

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "S";

  // Real numbers only: rate is null until a request has finished
  const finished = stats.completed + stats.cancelled;
  const completionRate = finished ? Math.round((stats.completed / finished) * 100) : null;
  const cancelRate = finished ? Math.round((stats.cancelled / finished) * 100) : null;

  const cards = [
    { label: "REQUESTS POSTED", value: stats.posted.toString(), icon: ClipboardList, tint: "bg-sky-50 text-sky-500" },
    { label: "IN PROGRESS", value: stats.active.toString(), icon: Hourglass, tint: "bg-violet-50 text-violet-500" },
    { label: "COMPLETED", value: stats.completed.toString(), icon: CheckCheck, tint: "bg-emerald-50 text-emerald-600" },
    { label: "TOTAL SPENT", value: `₱${stats.spent.toLocaleString()}`, icon: Coins, tint: "bg-orange-50 text-orange-500" },
  ];

  const inputEdit = (k: string) =>
    `w-full rounded-2xl px-6 py-5 text-lg text-slate-800 outline-none transition placeholder:text-slate-400 ${
      fieldErrors[k]
        ? "bg-rose-50 ring-2 ring-rose-400"
        : "bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
    }`;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Banner */}
      <div className="h-40 rounded-3xl bg-emerald-500" />

      <div className="px-4 sm:px-8">
        <div className="-mt-20 flex flex-col items-start gap-6 sm:flex-row sm:items-end">
          <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-[28px] bg-white p-3 shadow-xl">
            <div className="flex h-full w-full items-center justify-center rounded-2xl bg-emerald-100 text-5xl font-extrabold text-emerald-700">
              {initials}
            </div>
          </div>
          <div className="pb-2">
            <h2 className="text-4xl font-extrabold text-slate-900">{name || "Student"}</h2>
            <p className="mt-1 text-lg text-slate-500">PHINMA University of Pangasinan · Student</p>
          </div>
        </div>

        {/* Real activity numbers */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-3xl bg-white p-6 shadow-sm">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.tint}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <p className="mt-5 text-xs font-bold tracking-[0.14em] text-slate-400">{s.label}</p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900">
                  {loading ? "…" : s.value}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-7 grid gap-7 lg:grid-cols-[1.7fr_1fr]">
          {/* Account settings */}
          <form onSubmit={save} className="rounded-3xl bg-white p-7 shadow-sm sm:p-9">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
              <UserCog className="h-7 w-7 text-slate-800" /> Account Settings
            </h3>

            {msg && (
              <p
                className={`mt-5 rounded-2xl px-5 py-3 text-sm font-medium ${
                  msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                }`}
              >
                {msg.text}
              </p>
            )}

            <div className="mt-7 space-y-6">
              <Field label="FULL NAME" error={fieldErrors.fullName}>
                <input
                  value={form.fullName}
                  onChange={set("fullName")}
                  maxLength={60}
                  autoComplete="name"
                  placeholder="First and last name"
                  className={inputEdit("fullName")}
                />
              </Field>

              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="STUDENT ID" error={fieldErrors.studentId}>
                  <input
                    value={form.studentId}
                    onChange={set("studentId")}
                    maxLength={14}
                    placeholder="03-2425-045935"
                    className={inputEdit("studentId")}
                  />
                </Field>
                <Field label="EMAIL ADDRESS" error={fieldErrors.email}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    maxLength={80}
                    autoComplete="email"
                    placeholder="name@phinmaed.com"
                    className={inputEdit("email")}
                  />
                </Field>
              </div>

              {emailChanged && (
                <Field label="CURRENT PASSWORD" error={fieldErrors.currentPassword}>
                  <input
                    type="password"
                    value={form.currentPassword}
                    onChange={set("currentPassword")}
                    maxLength={128}
                    autoComplete="current-password"
                    placeholder="Required to change your login email"
                    className={inputEdit("currentPassword")}
                  />
                </Field>
              )}

              <Field label="PHONE NUMBER" error={fieldErrors.phone}>
                <input
                  value={form.phone}
                  onChange={set("phone")}
                  maxLength={20}
                  inputMode="tel"
                  placeholder="e.g., 0917 123 4567"
                  className={inputEdit("phone")}
                />
              </Field>
              <Field label="DEFAULT MEETING SPOT" error={fieldErrors.spot}>
                <input
                  value={form.spot}
                  onChange={set("spot")}
                  maxLength={80}
                  placeholder="e.g., Main Library entrance"
                  className={inputEdit("spot")}
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={saving || loading}
              className="mt-8 rounded-2xl bg-emerald-500 px-10 py-5 text-xl font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:bg-emerald-600 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>

          {/* Trust score: only what we can measure */}
          <div className="rounded-3xl bg-white p-7 shadow-sm sm:p-8">
            <h3 className="text-2xl font-bold text-slate-900">Trust Score</h3>
            <div className="mt-5 flex items-end gap-4">
              <p className="text-5xl font-extrabold text-orange-500">N/A</p>
              <div className="pb-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-slate-100 text-slate-200" />
                  ))}
                </div>
                <p className="mt-1 text-sm text-slate-400">No reviews yet</p>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <Meter label="Completion rate" value={completionRate} />
              <Meter label="Cancellation rate" value={cancelRate} />
            </div>
            <p className="mt-6 text-sm text-slate-400">
              Based on your finished requests (completed or cancelled).
            </p>
          </div>
        </div>

        {/* Verification: only things the sign-up flow actually enforces */}
        <div className="mt-7 mb-10 rounded-3xl bg-white p-7 shadow-sm sm:p-9">
          <h3 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
            <IdCard className="h-7 w-7 text-slate-800" /> Identification &amp; Verification
          </h3>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {[
              { icon: BadgeCheck, title: "Campus email", sub: "Registered with @phinmaed.com", ok: true },
              { icon: ShieldCheck, title: "Campus Conduct Pledge", sub: "Accepted at sign-up", ok: true },
              { icon: IdCard, title: "Government ID", sub: "Not required yet", ok: false },
            ].map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className={`flex items-start gap-4 rounded-2xl border p-5 ${
                    v.ok ? "border-emerald-100 bg-emerald-50/50" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <Icon className={`h-7 w-7 ${v.ok ? "text-emerald-500" : "text-slate-400"}`} />
                  <div>
                    <p className="font-bold text-slate-900">{v.title}</p>
                    <p className="text-sm text-slate-500">{v.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-bold tracking-[0.12em] text-slate-400">{label}</label>
      <div className="mt-2">{children}</div>
      {error && <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="flex items-center justify-between font-semibold">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-900">{value === null ? "—" : `${value}%`}</span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-emerald-500 transition-all duration-700"
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </div>
  );
}