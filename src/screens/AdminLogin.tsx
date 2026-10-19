import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, ShieldCheck, Lock } from "lucide-react";
import { api } from "../lib/api";

export default function AdminLogin({
  onBack,
  onLogin,
}: {
  onBack: () => void;
  onLogin: (token: string, name: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loginCode, setLoginCode] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    if (mfaRequired) {
      if (!/^\d{6}$/.test(loginCode)) {
        setError("Enter the 6-digit code sent to your administrator email.");
        setBusy(false);
        return;
      }
      const res = await api.verifyAdminLogin(email.trim().toLowerCase(), loginCode);
      setBusy(false);
      if (!res.ok) {
        setError(res.error || "Could not verify the sign-in code. Please request a new one.");
        return;
      }
      const token = res.data?.token;
      const name = res.data?.user?.name;
      if (!token || !name) {
        setError("Code verified, but the session data is incomplete. Please sign in again.");
        setMfaRequired(false);
        setLoginCode("");
        return;
      }
      onLogin(token, name);
      return;
    }

    const clientErrors = api.validateLogin({ email, password });
    setFields(clientErrors);
    if (Object.keys(clientErrors).length) {
      setError("Fix the highlighted fields — the request was never sent.");
      setBusy(false);
      return;
    }

    const res = await api.login({ email, password }, { adminPortal: true });
    setBusy(false);
    if (!res.ok) {
      setFields(res.fields ?? {});
      setError(res.error || "Could not sign in. Please check your details and try again.");
      return;
    }
    if (res.data?.mfaRequired) {
      setMfaRequired(true);
      setPassword("");
      setLoginCode("");
      setNotice(
        res.data.deliveryMode === "console"
          ? "Local demo code generated. Check the backend terminal. It expires in 5 minutes."
          : `A sign-in code was sent to ${email.trim().toLowerCase()}. It expires in 5 minutes.`,
      );
      return;
    }
    const token = res.data?.token;
    const name = res.data?.user?.name;
    if (!token || !name) {
      setError("Admin login succeeded, but the session data is incomplete. Please try again.");
      return;
    }
    onLogin(token, name);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1524] p-4 sm:p-8">
      <div className="w-full max-w-lg">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" /> Back to home
        </button>

        <form
          onSubmit={submit}
          className="rounded-[28px] border border-white/10 bg-[#111E30] px-8 py-10 shadow-2xl sm:px-12"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
              <ShieldCheck className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white">Admin Portal</h1>
              <p className="text-sm text-slate-400">Restricted • staff credentials required</p>
            </div>
          </div>

          {mfaRequired ? (
            <>
              <p className="mt-8 text-sm leading-6 text-slate-300">
                Enter the 6-digit sign-in code sent to <strong className="text-white">{email}</strong>.
                The code expires in 5 minutes and can only be used once.
              </p>
              <label className="mt-6 block text-xs font-bold tracking-wider text-slate-400">
                ADMIN SIGN-IN CODE
              </label>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0B1524] px-5 py-4 text-center text-xl tracking-[0.5em] text-white outline-none transition focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => { setMfaRequired(false); setLoginCode(""); setError(""); setNotice(""); }}
                className="mt-4 text-sm font-semibold text-emerald-400 hover:underline"
              >
                Back to admin credentials
              </button>
            </>
          ) : (
            <>
              <label className="mt-9 block text-xs font-bold tracking-wider text-slate-400">
                ADMIN EMAIL
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-2 w-full rounded-xl border bg-[#0B1524] px-5 py-4 text-white outline-none transition placeholder:text-slate-600 ${
                  fields.email ? "border-rose-500" : "border-white/10 focus:border-emerald-500"
                }`}
              />
              {fields.email && <p className="mt-2 text-sm text-rose-400">{fields.email}</p>}

              <label className="mt-6 block text-xs font-bold tracking-wider text-slate-400">
                PASSWORD
              </label>
              <div className="relative mt-2">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-xl border bg-[#0B1524] px-5 py-4 pr-14 text-white outline-none transition ${
                    fields.password ? "border-rose-500" : "border-white/10 focus:border-emerald-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {show ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </button>
              </div>
              {fields.password && <p className="mt-2 text-sm text-rose-400">{fields.password}</p>}
            </>
          )}

          {error && (
            <p className="mt-6 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300">
              {error}
            </p>
          )}
          {notice && (
            <p className="mt-6 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 py-5 text-lg font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            <Lock className="h-5 w-5" />
            {busy ? (mfaRequired ? "Verifying code..." : "Checking credentials...") : (mfaRequired ? "Verify Code and Sign In" : "Access Admin Console")}
          </button>

          <p className="mt-6 text-center text-xs text-slate-500">
            {mfaRequired
              ? "Admin access is granted only after the sign-in code is verified."
              : "Use an administrator account provisioned by your system administrator. Student and runner accounts cannot access this portal."}
          </p>
        </form>
      </div>
    </div>
  );
}
