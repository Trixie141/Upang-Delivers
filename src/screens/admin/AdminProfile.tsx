import { useEffect, useState } from "react";
import { UserCog, ShieldCheck, Download, AlertTriangle, User } from "lucide-react";
import { api } from "@/lib/api";

type FormState = {
  phone: string;
  spot: string;
};

type SettingsTab = "profile" | "admins" | "danger";

// Same rule the backend enforces (profileSchema in validate.js)
const PHONE_RE = /^[0-9+()\-\s]*$/;

// Roles the backend actually has: student, delivery (runner), admin
const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  delivery: "Runner",
  admin: "Admin",
};

const csvNameOf = (u: any) => u.fullName ?? u.name ?? "Unknown";
const idOf = (v: any) =>
  v && typeof v === "object" ? String(v._id ?? v.id ?? "") : v ? String(v) : "";

// Stops spreadsheet apps from running a cell that starts with = + - @ as a formula
const csvCell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

function validateForm(f: FormState) {
  const e: Record<string, string> = {};
  if (f.phone.length > 20) e.phone = "Phone number is too long.";
  else if (!PHONE_RE.test(f.phone)) e.phone = "Use digits, spaces, + ( ) or - only.";
  if (f.spot.length > 80) e.spot = "Meeting spot is too long.";
  return e;
}

const NAV = [
  { id: "profile" as SettingsTab, label: "My Profile", icon: User },
  { id: "admins" as SettingsTab, label: "Admin Accounts", icon: ShieldCheck },
  { id: "danger" as SettingsTab, label: "Danger Zone", icon: AlertTriangle },
];

export default function AdminProfile({
  token,
  userId,
  name,
}: {
  token: string;
  userId: string;
  name: string;
}) {
  const [tab, setTab] = useState<SettingsTab>("profile");

  // ---- Profile section state ----
  // fullName / studentId / email are read-only in the UI, but the backend's
  // PATCH /me still requires them on every save, so we load and resubmit
  // them unchanged alongside the fields the admin actually edits.
  const [fullName, setFullName] = useState(name);
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>({ phone: "", spot: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ---- Admin Accounts section state ----
  const [admins, setAdmins] = useState<any[] | null>(null);
  const [adminsError, setAdminsError] = useState("");

  // ---- Danger Zone / export state ----
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  useEffect(() => {
    let alive = true;
    api.me(token).then((res) => {
      if (!alive) return;
      if (res.ok) {
        const u = res.user ?? res.data ?? {};
        setFullName(u.name ?? u.fullName ?? name);
        setStudentId(u.studentId ?? u.student_id ?? "");
        setEmail(u.email ?? "");
        setForm({ phone: u.phone ?? "", spot: u.spot ?? "" });
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [token, name]);

  // Load admin accounts lazily, only the first time that tab is opened.
  useEffect(() => {
    if (tab !== "admins" || admins !== null) return;
    api.getUsers(token).then((res) => {
      if (!res.ok) {
        setAdminsError(`${res.status} — Could not load admin accounts.`);
        setAdmins([]);
        return;
      }
      const list = res.users ?? res.data ?? [];
      setAdmins((Array.isArray(list) ? list : []).filter((u: any) => u.role === "admin"));
    });
  }, [tab, admins, token]);

  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const clientErrors = validateForm(form);
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length) {
      setMsg({ ok: false, text: "Please fix the highlighted fields." });
      return;
    }

    setSaving(true);
    // fullName/studentId/email are sent back unchanged — this account's
    // identity fields aren't editable here, but the backend schema still
    // requires them to be present on every PATCH /me call.
    const res = await api.updateProfile(token, {
      fullName,
      studentId,
      email,
      phone: form.phone.trim(),
      spot: form.spot.trim(),
    });
    setSaving(false);

    if (!res.ok) {
      setFieldErrors(res.fields ?? {});
      setMsg({ ok: false, text: `${res.status} — ${res.error}` });
      return;
    }

    const u = res.user ?? {};
    setForm({ phone: u.phone ?? form.phone, spot: u.spot ?? form.spot });
    setMsg({ ok: true, text: "Profile changes saved." });
  }

  // Fetches users + errands only when Export is clicked — same shape as AdminUsers.tsx.
  async function exportUsersCsv() {
    setExporting(true);
    setExportMsg("");

    const [userRes, errRes] = await Promise.all([api.getUsers(token), api.getAdminErrands(token)]);

    if (!userRes.ok) {
      setExporting(false);
      setExportMsg(`${userRes.status} — Could not load users to export.`);
      return;
    }

    const users = userRes.users ?? userRes.data ?? [];
    const errands = errRes.ok ? errRes.errands ?? errRes.data ?? [] : [];

    const counts = new Map<string, { posted: number; completed: number }>();
    const bump = (id: string, k: "posted" | "completed") => {
      if (!id) return;
      const c = counts.get(id) ?? { posted: 0, completed: 0 };
      c[k] += 1;
      counts.set(id, c);
    };
    (Array.isArray(errands) ? errands : []).forEach((e: any) => {
      bump(idOf(e.ownerId ?? e.owner_id), "posted");
      if (e.status === "done") bump(idOf(e.runnerId ?? e.runner_id), "completed");
    });

    const header = ["Full name", "ID number", "Email", "Role", "Status", "Posted", "Completed"];
    const body = (Array.isArray(users) ? users : []).map((u: any) => {
      const c = counts.get(idOf(u)) ?? { posted: 0, completed: 0 };
      return [
        csvNameOf(u),
        u.studentId ?? "",
        u.email ?? "",
        ROLE_LABEL[u.role] ?? u.role,
        u.status === "suspended" ? "Suspended" : "Active",
        c.posted,
        c.completed,
      ];
    });
    const csv = [header, ...body].map((r) => r.map(csvCell).join(",")).join("\r\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
    setExportMsg("Export complete.");
  }

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";

  const inputEdit = (k: string) =>
    `w-full rounded-2xl px-6 py-5 text-lg text-slate-800 outline-none transition placeholder:text-slate-400 ${
      fieldErrors[k]
        ? "bg-rose-50 ring-2 ring-rose-400"
        : "bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
    }`;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[240px_1fr]">
      {/* Settings nav */}
      <aside className="h-fit rounded-3xl bg-white p-2 shadow-sm lg:sticky lg:top-6">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold transition ${
                active ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </aside>

      {/* Active section */}
      <div>
        {tab === "profile" && (
          <div className="rounded-3xl bg-white p-7 shadow-sm sm:p-9">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-2xl font-extrabold text-emerald-700">
                {initials}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {loading ? "…" : fullName || "Admin"}
                </h2>
                <p className="text-sm text-slate-500">{loading ? "…" : email || "—"}</p>
                <p className="text-sm text-slate-500">
                  Role: <span className="font-semibold text-slate-700">Admin</span>
                </p>
              </div>
            </div>

            <form onSubmit={save} className="mt-6">
              {msg && (
                <p
                  className={`mb-6 rounded-2xl px-5 py-3 text-sm font-medium ${
                    msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                  }`}
                >
                  {msg.text}
                </p>
              )}

              <div className="space-y-6">
                {/* Name, email and role are set at account creation — the
                    backend has no endpoint for changing them here. */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <ReadOnlyField label="FULL NAME" value={loading ? "…" : fullName || "—"} />
                  <ReadOnlyField label="EMAIL ADDRESS" value={loading ? "…" : email || "—"} />
                </div>

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
                <Field label="OFFICE / MEETING SPOT" error={fieldErrors.spot}>
                  <input
                    value={form.spot}
                    onChange={set("spot")}
                    maxLength={80}
                    placeholder="e.g., Admin Office, Ground Floor"
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
          </div>
        )}

        {tab === "admins" && (
          <div className="rounded-3xl bg-white p-7 shadow-sm sm:p-9">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
              <ShieldCheck className="h-7 w-7 text-slate-800" /> Admin Accounts
            </h3>
            <p className="mt-1 text-sm text-slate-500">Everyone with administrator access.</p>

            <div className="mt-6 divide-y divide-slate-100">
              {admins === null ? (
                <p className="py-6 text-sm text-slate-400">Loading admins...</p>
              ) : adminsError ? (
                <p className="py-6 text-sm text-rose-600">{adminsError}</p>
              ) : admins.length === 0 ? (
                <p className="py-6 text-sm text-slate-400">No admin accounts found.</p>
              ) : (
                admins.map((a) => {
                  const isYou = idOf(a) === String(userId);
                  const aName = csvNameOf(a);
                  const aInitials = aName
                    .split(" ")
                    .filter(Boolean)
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <div key={idOf(a)} className="flex items-center gap-3 py-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
                        {aInitials}
                      </div>
                      <div>
                        <p className="flex items-center gap-2 font-semibold text-slate-900">
                          {aName}
                          {isYou && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400">{a.email}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-6">
              <p className="text-xs text-slate-400">
                To add a new admin, create the account with role <code>admin</code> directly in
                the database — there's no self-service option for this yet.
              </p>
            </div>
          </div>
        )}

        {tab === "danger" && (
          <div className="rounded-3xl bg-white p-7 shadow-sm sm:p-9">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-rose-600">
              <AlertTriangle className="h-7 w-7" /> Danger Zone
            </h3>
            <p className="mt-1 text-sm text-slate-500">Data export and account actions.</p>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6">
              <div>
                <p className="font-semibold text-slate-900">Export All User Data</p>
                <p className="text-sm text-slate-400">
                  Download a CSV of every account, role, status, and errand count.
                </p>
              </div>
              <button
                onClick={exportUsersCsv}
                disabled={exporting}
                className="flex items-center gap-2 rounded-2xl bg-rose-50 px-5 py-3 font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
              >
                <Download className="h-5 w-5" />
                {exporting ? "Preparing..." : "Export CSV"}
              </button>
            </div>
            {exportMsg && <p className="mt-4 text-sm text-emerald-600">{exportMsg}</p>}
          </div>
        )}
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs font-bold tracking-[0.12em] text-slate-400">{label}</label>
      <div className="mt-2 rounded-2xl bg-slate-50 px-6 py-5 text-lg text-slate-500">{value}</div>
    </div>
  );
}