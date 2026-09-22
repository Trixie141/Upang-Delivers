import { useEffect, useState } from "react";
import { UserCog } from "lucide-react";
import { api } from "@/lib/api";
import RunnerProfile, { RunnerProfileStats } from "./RunnerProfile";

const EMPTY_STATS: RunnerProfileStats = {
  earned: 0,
  completed: 0,
  avgMinutes: null,
  weekly: [],
  balance: 0,
};

// Same rules as sign-up (backend validate.js), checked before sending
const NAME_RE = /^[\p{L}.'-]+(?:\s+[\p{L}.'-]+)+$/u;
const ID_RE = /^\d{2}-\d{4}-\d{3,6}$/;
const EMAIL_RE = /^[^\s@]+@phinmaed\.com$/i;

type FormState = {
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  currentPassword: string;
};

function validateForm(f: FormState, emailChanged: boolean) {
  const e: Record<string, string> = {};
  const n = f.fullName.trim();
  if (n.length < 4 || n.length > 60 || !NAME_RE.test(n))
    e.fullName = "Enter your first and last name (letters only, 4-60 characters).";
  // studentId is read-only here and always resubmitted as-loaded, so it isn't validated
  // against user input; the format is only enforced once, at sign-up.
  if (!EMAIL_RE.test(f.email.trim())) e.email = "Must be your official @phinmaed.com email.";
  if (emailChanged && !f.currentPassword)
    e.currentPassword = "Enter your current password to change your email.";
  if (f.phone.length > 20) e.phone = "Phone number is too long.";
  return e;
}

// Monday = 0 ... Sunday = 6 (matches the chart labels)
const dayIndex = (d: Date) => (d.getDay() + 6) % 7;

function startOfThisWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - dayIndex(d));
  return d;
}

// Works whether the runner id comes back as a string or a populated object,
// and whether the field is named runnerId or runner_id.
function runnerIdOf(e: any): string {
  const r = e.runnerId ?? e.runner_id;
  if (r && typeof r === "object") return String(r._id ?? r.id ?? "");
  return String(r ?? "");
}

function buildStats(errands: any[], userId: string): RunnerProfileStats {
  const done = errands.filter(
    (e) => e.status === "done" && runnerIdOf(e) === String(userId)
  );

  const weekStart = startOfThisWeek();
  const weekly = [0, 0, 0, 0, 0, 0, 0];
  let earned = 0;

  for (const e of done) {
    const reward = Number(e.reward) || 0;
    earned += reward;

    const finished = new Date(e.updatedAt ?? e.updated_at ?? e.createdAt);
    if (!isNaN(finished.getTime()) && finished >= weekStart) {
      weekly[dayIndex(finished)] += reward;
    }
  }

  return {
    earned,
    completed: done.length,
    avgMinutes: null, // needs an "accepted at" timestamp on the backend
    weekly,
    balance: earned, // no withdrawals yet
  };
}

export default function RunnerProfileContainer({
  token,
  userId,
  name,
  onProfileUpdated,
}: {
  token: string;
  userId: string;
  name: string;
  /** Lets App.tsx refresh the name shown in the navbar after a save */
  onProfileUpdated?: (u: { fullName: string }) => void;
}) {
  const [stats, setStats] = useState<RunnerProfileStats>(EMPTY_STATS);
  const [displayName, setDisplayName] = useState(name);

  const [form, setForm] = useState<FormState>({
    fullName: name,
    studentId: "",
    email: "",
    phone: "",
    currentPassword: "",
  });
  const [savedEmail, setSavedEmail] = useState("");
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
        const fullName = u.name ?? u.fullName ?? name;
        setDisplayName(fullName);
        setForm((f) => ({
          ...f,
          fullName,
          studentId: u.studentId ?? u.student_id ?? "",
          email,
          phone: u.phone ?? "",
        }));
        // Keeps the navbar (and localStorage cache) in sync with the database
        // on every load, not just after a save — covers edits made before this
        // wiring existed, or made from another device/session.
        if (fullName && fullName !== name) onProfileUpdated?.({ fullName });
      }

      if (errRes.ok) {
        const list = errRes.errands ?? errRes.data ?? [];
        setStats(buildStats(Array.isArray(list) ? list : [], userId));
      }
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
      spot: "", // runners don't use a default meeting spot
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
    setDisplayName(newName);
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

  const inputEdit = (k: string) =>
    `w-full rounded-2xl px-6 py-4 text-base text-slate-800 outline-none transition placeholder:text-slate-400 ${
      fieldErrors[k]
        ? "bg-rose-50 ring-2 ring-rose-400"
        : "bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
    }`;

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-4">
      <RunnerProfile name={displayName} stats={stats} />

      <div className="rounded-3xl bg-white p-7 shadow-sm sm:p-9">
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

        <form onSubmit={save} className="mt-7 space-y-6">
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
            <Field label="STUDENT ID">
              <input
                value={form.studentId}
                disabled
                placeholder="Not on file"
                className="w-full cursor-not-allowed rounded-2xl bg-slate-50 px-6 py-4 text-base text-slate-400 placeholder:text-slate-300"
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

          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-emerald-500 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:bg-emerald-600 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
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