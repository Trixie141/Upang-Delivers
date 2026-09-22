import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, ShieldAlert, Package } from "lucide-react";
import { api } from "../lib/api";

type SignUpRole = "student" | "delivery";

/** What the server returns for a signed-in user (see toSafeJSON in the backend User model). */
type SessionUser = { id: string; name: string; role: string };

const NAME_RE = /^[\p{L}.'-]+(?:\s+[\p{L}.'-]+)+$/u;
const STUDENT_ID_RE = /^\d{2}-\d{4}-\d{3,6}$/;

type Form = {
  fullName: string;
  studentId: string;
  email: string;
  password: string;
  confirm: string;
  agree: boolean;
};

/** Client-side mirror of registerSchema in backend/src/middleware/validate.js.
 *  The server is still the authority: this only saves a round trip. */
function validateSignUp(v: Form): Record<string, string> {
  const f: Record<string, string> = {};

  const name = v.fullName.trim();
  if (name.length < 4 || name.length > 60 || !NAME_RE.test(name))
    f.fullName = "Enter your first and last name (letters only).";

  const email = v.email.trim().toLowerCase();
  if (!/^[^\s@]+@phinmaed\.com$/.test(email) || email.length > 80)
    f.email = "Must be your official @phinmaed.com email.";

  if (!STUDENT_ID_RE.test(v.studentId.trim()))
    f.studentId = "Use the campus format 04-2021-00456.";

  const pw = v.password;
  if (pw.length < 8) f.password = "Password must be at least 8 characters.";
  else if (new TextEncoder().encode(pw).length > 72) f.password = "Password must be 72 bytes or fewer.";
  else if (!/[A-Z]/.test(pw)) f.password = "Password needs one uppercase letter.";
  else if (!/[a-z]/.test(pw)) f.password = "Password needs one lowercase letter.";
  else if (!/\d/.test(pw)) f.password = "Password needs one number.";
  else if (!/[^A-Za-z0-9]/.test(pw)) f.password = "Password needs one special character.";
  else if (/\s/.test(pw)) f.password = "Password must not contain spaces.";
  else {
    const local = email.split("@")[0];
    if (local.length >= 3 && pw.toLowerCase().includes(local))
      f.password = "Password must not contain your email name.";
  }

  if (v.confirm !== pw) f.confirm = "Passwords do not match.";
  if (!v.agree) f.agree = "You must accept the Campus Conduct Policy.";

  return f;
}

const inputClass = (bad?: string) =>
  `mt-2 w-full rounded-xl border px-5 py-3.5 text-slate-800 outline-none transition focus:ring-4 ${
    bad
      ? "border-rose-400 focus:ring-rose-500/10"
      : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10"
  }`;

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="mt-1.5 text-sm font-medium text-rose-600">{msg}</p> : null;

export default function SignUp({
  onBackToLogin,
  onSignUpSuccess,
}: {
  onBackToLogin: () => void;
  onSignUpSuccess: (token: string, user: SessionUser) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [role, setRole] = useState<SignUpRole>("student");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 1. Catch obvious mistakes locally so no request is spent on them.
    const clientErrors = validateSignUp({ fullName, studentId, email, password, confirm, agree });
    setFields(clientErrors);
    if (Object.keys(clientErrors).length) {
      setError("Fix the highlighted fields - the request was never sent.");
      return;
    }

    // 2. The server validates everything again and stays the authority.
    setBusy(true);
    const res = await api.register({
      fullName: fullName.trim(),
      studentId: studentId.trim(),
      email: email.trim().toLowerCase(),
      password,
      confirm,
      role,
      agree,
    });
    setBusy(false);

    if (!res.ok) {
      setFields(res.fields ?? {});
      setError(`${res.status} \u2014 ${res.error || "Failed to register account."}`);
      return;
    }

    // 3. The App needs the whole user (id, name, role), not just the name.
    const token = res.data?.token;
    const user = res.data?.user;

    if (!token || !user?.id || !user?.name || !user?.role) {
      setError("Account created but the session data is incomplete. Please log in.");
      return;
    }

    localStorage.setItem("token", token);
    onSignUpSuccess(token, { id: user.id, name: user.name, role: user.role });
  };

  return (
    <div className="min-h-screen bg-[#FDEFE6] p-4 sm:p-8 lg:p-10">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[32px] shadow-2xl shadow-emerald-900/10 md:grid-cols-2">
        <form onSubmit={handleSubmit} noValidate className="bg-white px-8 py-12 sm:px-14">
          <button
            type="button"
            onClick={onBackToLogin}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-slate-900">
            Create Account
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Join Upang Delivers using your university email.
          </p>

          <label className="mt-6 block text-xs font-bold tracking-wider text-slate-500">
            FULL NAME
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Juan Dela Cruz"
            className={inputClass(fields.fullName)}
          />
          <FieldError msg={fields.fullName} />

          <label className="mt-4 block text-xs font-bold tracking-wider text-slate-500">
            STUDENT ID
          </label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="04-2021-00456"
            className={inputClass(fields.studentId)}
          />
          <FieldError msg={fields.studentId} />

          <label className="mt-4 block text-xs font-bold tracking-wider text-slate-500">
            PHINMA EMAIL
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="juan.upang@phinmaed.com"
            className={inputClass(fields.email)}
          />
          <FieldError msg={fields.email} />

        

          <label className="mt-4 block text-xs font-bold tracking-wider text-slate-500">
            PASSWORD
          </label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className={`${inputClass(fields.password)} pr-14`}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {show ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            </button>
          </div>
          {fields.password ? (
            <FieldError msg={fields.password} />
          ) : (
            <p className="mt-1.5 text-xs text-slate-400">
              At least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol.
            </p>
          )}

          <label className="mt-4 block text-xs font-bold tracking-wider text-slate-500">
            CONFIRM PASSWORD
          </label>
          <input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className={inputClass(fields.confirm)}
          />
          <FieldError msg={fields.confirm} />

          <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-5 w-5 accent-emerald-500"
            />
            I accept the Student Gigs Guidelines and the Campus Conduct Policy.
          </label>
          <FieldError msg={fields.agree} />

          {error && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-2xl bg-emerald-500 py-4 font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {busy ? "Creating Account..." : "Sign Up"}
          </button>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onBackToLogin}
              className="font-bold text-emerald-600 hover:underline"
            >
              Log In
            </button>
          </p>
        </form>

        <div className="flex flex-col items-center justify-center gap-6 bg-emerald-500 px-8 py-16 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 ring-1 ring-white/40">
            <Package className="h-12 w-12 text-white" strokeWidth={1.7} />
          </div>
          <h2 className="text-4xl font-extrabold text-white">Join Upang Delivers</h2>
          <p className="text-xs font-semibold tracking-[0.25em] text-white/85">
            PHINMA UNIVERSITY OF PANGASINAN
          </p>
        </div>
      </div>
    </div>
  );
}