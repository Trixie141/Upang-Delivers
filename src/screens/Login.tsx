import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Package, ShieldAlert, Gauge } from "lucide-react";
import { api } from "../lib/api";

type ApiRole = "student" | "delivery";

/** What the server returns for a signed-in user (see toSafeJSON in the backend User model). */
type SessionUser = { id: string; name: string; role: string };

export default function Login({
  role,
  onBack,
  onLogin,
  onSignUp,
}: {
  role: ApiRole;
  onBack: () => void;
  onLogin: (token: string, user: SessionUser) => void;
  onSignUp: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [limit, setLimit] = useState(api.rateState(`/auth/login:${email.toLowerCase()}`));
  const [recoveryMode, setRecoveryMode] = useState<"email" | "reset" | null>(null);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryNotice, setRecoveryNotice] = useState("");
  const [verificationNeeded, setVerificationNeeded] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationNotice, setVerificationNotice] = useState("");

  useEffect(() => {
    const t = setInterval(
      () => setLimit(api.rateState(`/auth/login:${email.trim().toLowerCase()}`)),
      500,
    );
    return () => clearInterval(t);
  }, [email]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    // 1. Client-side input validation
    const clientErrors = api.validateLogin({ email, password });
    setFields(clientErrors);
    if (Object.keys(clientErrors).length) {
      setError("Fix the highlighted fields - the request was never sent.");
      setBusy(false);
      return;
    }

    // 2. Perform Login Request
      const res = await api.login({ email, password, requestedRole: role });
    setBusy(false);

    if (!res.ok) {
      setFields(res.fields ?? {});
      setError(`${res.status} \u2014 ${res.error}`);
      setVerificationNeeded(res.code === "EMAIL_NOT_VERIFIED");
      return;
    }

    // 3. The App needs the whole user (id, name, role), not just the name,
    //    to choose the right layout and to know whose data to show.
    const token = res.data?.token;
    const user = res.data?.user;

    if (!token || !user?.id || !user?.name || !user?.role) {
      setError("Login succeeded but the session data is incomplete.");
      return;
    }

    localStorage.setItem("token", token);
    onLogin(token, { id: user.id, name: user.name, role: user.role });
  }

  async function resendVerification() {
    setBusy(true);
    setError("");
    const res = await api.resendVerification(email.trim().toLowerCase());
    setBusy(false);
    if (!res.ok) {
      setError(`${res.status} — ${res.error || "Could not send a verification code."}`);
      return;
    }
    setVerificationNotice(res.message || "A new verification code was sent.");
  }

  async function verifyLoginEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api.verifyEmail(email.trim().toLowerCase(), verificationCode);
    setBusy(false);
    if (!res.ok) {
      setError(`${res.status} — ${res.error || "Could not verify this email."}`);
      return;
    }
    const token = res.data?.token;
    const user = res.data?.user;
    if (!token || !user?.id || !user?.name || !user?.role) {
      setError("Email verified, but the session could not be started. Please log in.");
      return;
    }
    localStorage.setItem("token", token);
    onLogin(token, { id: user.id, name: user.name, role: user.role });
  }

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api.requestPasswordReset(email.trim().toLowerCase());
    setBusy(false);
    if (!res.ok) {
      setError(`${res.status} — ${res.error || "Could not request a password reset."}`);
      return;
    }
    setRecoveryMode("reset");
    setRecoveryNotice(res.message || "If an active account uses that email, a reset code was sent.");
  }

  async function completeReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api.resetPassword(email.trim().toLowerCase(), recoveryCode.trim(), newPassword);
    setBusy(false);
    if (!res.ok) {
      setError(`${res.status} — ${res.error || "Could not reset the password."}`);
      return;
    }
    setRecoveryMode(null);
    setPassword("");
    setRecoveryCode("");
    setNewPassword("");
    setRecoveryNotice("Password reset. You can now log in with your new password.");
  }

  if (recoveryMode) {
    return (
      <div className="min-h-screen bg-[#FDEFE6] p-4 sm:p-8 lg:p-10">
        <div className="mx-auto max-w-xl rounded-[32px] bg-white p-8 shadow-2xl sm:p-12">
          <button type="button" onClick={() => { setRecoveryMode(null); setError(""); }} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="mt-7 text-3xl font-extrabold text-slate-900">Reset your password</h1>
          <p className="mt-2 text-slate-500">{recoveryMode === "email" ? "We’ll send a one-time reset code. It expires in 10 minutes." : `Enter the reset code sent to ${email}.`}</p>
          {recoveryNotice && <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{recoveryNotice}</p>}
          {recoveryMode === "email" ? (
            <form onSubmit={requestReset} className="mt-5">
              <label className="block text-xs font-bold tracking-wider text-slate-500">PHINMA EMAIL</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2 w-full rounded-xl border border-slate-200 px-5 py-4 text-slate-800 outline-none focus:border-emerald-500" />
              {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</p>}
              <button type="submit" disabled={busy} className="mt-5 w-full rounded-2xl bg-emerald-500 py-4 font-bold text-white disabled:opacity-60">{busy ? "Sending..." : "Send Reset Code"}</button>
            </form>
          ) : (
            <form onSubmit={completeReset} className="mt-5 space-y-4">
              <label className="block text-xs font-bold tracking-wider text-slate-500">6-DIGIT CODE</label>
              <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" className="w-full rounded-xl border border-slate-200 px-5 py-4 tracking-[0.3em] text-slate-800 outline-none focus:border-emerald-500" />
              <label className="block text-xs font-bold tracking-wider text-slate-500">NEW PASSWORD</label>
              <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 px-5 py-4 text-slate-800 outline-none focus:border-emerald-500" />
              <p className="text-xs text-slate-400">At least 8 characters, with uppercase, lowercase, number and symbol.</p>
              {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</p>}
              <button type="submit" disabled={busy || recoveryCode.length !== 6 || !newPassword} className="w-full rounded-2xl bg-emerald-500 py-4 font-bold text-white disabled:opacity-60">{busy ? "Updating..." : "Save New Password"}</button>
              <button type="button" disabled={busy} onClick={() => { setRecoveryMode("email"); setRecoveryNotice(""); setError(""); }} className="w-full text-sm font-bold text-emerald-700 hover:underline">Send another code</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDEFE6] p-4 sm:p-8 lg:p-10">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[32px] shadow-2xl shadow-emerald-900/10 md:grid-cols-2">
        <form onSubmit={submit} className="bg-white px-8 py-12 sm:px-14">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <h1 className="mt-8 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Welcome Back,
            <br />
            Flames!
          </h1>
          <p className="mt-4 text-lg text-slate-500">
            Log in with your official university email account.
          </p>

          <label className="mt-8 block text-xs font-bold tracking-wider text-slate-500">
            PHINMA STUDENT EMAIL
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student.upang@phinmaed.com"
            className={`mt-2 w-full rounded-xl border px-5 py-4 text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
              fields.email
                ? "border-rose-400 focus:ring-rose-500/10"
                : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10"
            }`}
          />
          {fields.email && <p className="mt-2 text-sm font-medium text-rose-600">{fields.email}</p>}

          <label className="mt-6 block text-xs font-bold tracking-wider text-slate-500">
            PASSWORD
          </label>
          <div className="relative mt-2">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full rounded-xl border px-5 py-4 pr-14 text-slate-800 outline-none transition focus:ring-4 ${
                fields.password
                  ? "border-rose-400 focus:ring-rose-500/10"
                  : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10"
              }`}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {show ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            </button>
          </div>
          {fields.password && (
            <p className="mt-2 text-sm font-medium text-rose-600">{fields.password}</p>
          )}

          <div className="mt-6 flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-3 text-slate-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-5 w-5 accent-emerald-500"
              />
              Remember me
            </label>
            <button type="button" onClick={() => { setRecoveryMode("email"); setError(""); setRecoveryNotice(""); }} className="font-semibold text-emerald-600 hover:underline">
              Forgot Password?
            </button>
          </div>

          {error && (
            <p className="mt-5 flex items-start gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
          {verificationNeeded && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">Verify your email to finish setting up your account.</p>
              {verificationNotice && <p className="mt-2 text-sm text-emerald-700">{verificationNotice}</p>}
              <button type="button" disabled={busy} onClick={resendVerification} className="mt-2 text-sm font-bold text-emerald-700 hover:underline disabled:opacity-50">Send a verification code</button>
              <form onSubmit={verifyLoginEmail} className="mt-4 flex gap-2">
                <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white px-4 py-3 tracking-widest outline-none focus:border-emerald-500" />
                <button type="submit" disabled={busy || verificationCode.length !== 6} className="rounded-xl bg-emerald-500 px-4 font-bold text-white disabled:opacity-50">Verify</button>
              </form>
            </div>
          )}
          {recoveryNotice && (
            <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{recoveryNotice}</p>
          )}

          <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
            <Gauge className="h-4 w-4 text-slate-400" />
            Rate limit: <span className="font-bold text-slate-700">{limit.remaining}</span> of{" "}
            {api.LIMIT} attempts left in this 60s window
            {limit.retryIn > 0 && (
              <span className="font-bold text-rose-500">&bull; locked {limit.retryIn}s</span>
            )}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-2xl bg-emerald-500 py-5 text-xl font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-600 disabled:opacity-60"
          >
            {busy ? "Verifying hash..." : "Log In"}
          </button>

          <p className="mt-6 text-center text-slate-500">
            New to the campus hub?{" "}
            <button
              type="button"
              onClick={onSignUp}
              className="font-bold text-emerald-600 hover:underline"
            >
              Sign Up
            </button>
          </p>
          <p className="mt-6 text-center text-xs text-slate-400">
            By continuing, you agree to our Student Gigs Guidelines and Campus Conduct Policy.
          </p>
        </form>

        <div className="flex flex-col items-center justify-center gap-6 bg-emerald-500 px-8 py-16 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 ring-1 ring-white/40">
            <Package className="h-12 w-12 text-white" strokeWidth={1.7} />
          </div>
          <h2 className="text-5xl font-extrabold tracking-tight text-white">UPang Delivers</h2>
          <p className="text-sm font-semibold tracking-[0.25em] text-white/85">
            PHINMA UNIVERSITY OF PANGASINAN
          </p>
        </div>
      </div>
    </div>
  );
}
