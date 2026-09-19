import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, ShieldCheck, Lock, Gauge, ShieldAlert } from "lucide-react";
import { api } from "../lib/api";

export default function AdminLogin({
  onBack,
  onLogin,
}: {
  onBack: () => void;
  onLogin: (token: string, name: string) => void;
}) {
  const [email, setEmail] = useState("admin@phinmaed.com");
  const [password, setPassword] = useState("Admin#2026");
  const [code, setCode] = useState("824193");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [limit, setLimit] = useState(api.rateState(`/auth/admin/login:${email.toLowerCase()}`));

  useEffect(() => {
    const t = setInterval(
      () => setLimit(api.rateState(`/auth/admin/login:${email.trim().toLowerCase()}`)),
      500,
    );
    return () => clearInterval(t);
  }, [email]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const clientErrors = api.validateLogin({ email, password });
    if (!/^\d{6}$/.test(code)) clientErrors.code = "Enter the 6-digit campus OTP.";
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
      setError(`${res.status} — ${res.error}`);
      return;
    }
    onLogin(res.data.token, res.data.user.name);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1524] p-4 sm:p-8">
      <div className="w-full max-w-lg">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" /> Back to role selection
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

          <label className="mt-6 block text-xs font-bold tracking-wider text-slate-400">
            2FA CODE (6 DIGITS)
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            className={`mt-2 w-full rounded-xl border bg-[#0B1524] px-5 py-4 tracking-[0.5em] text-white outline-none transition ${
              fields.code ? "border-rose-500" : "border-white/10 focus:border-emerald-500"
            }`}
          />
          {fields.code && <p className="mt-2 text-sm text-rose-400">{fields.code}</p>}

          {error && (
            <p className="mt-6 flex items-start gap-3 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm text-slate-400">
            <Gauge className="h-4 w-4" />
            Rate limit: <span className="font-bold text-slate-200">{limit.remaining}</span> of{" "}
            {api.LIMIT} attempts left
            {limit.retryIn > 0 && (
              <span className="font-bold text-rose-400">• locked {limit.retryIn}s</span>
            )}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 py-5 text-lg font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            <Lock className="h-5 w-5" />
            {busy ? "Verifying hash..." : "Access Admin Console"}
          </button>

          <p className="mt-6 text-center text-xs text-slate-500">
            Demo: admin@phinmaed.com / Admin#2026 / any 6 digits. Student and runner accounts are
            rejected here with 403.
          </p>
        </form>
      </div>
    </div>
  );
}
