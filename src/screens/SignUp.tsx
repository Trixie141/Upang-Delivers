import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, ShieldAlert, Package } from "lucide-react";
import { api } from "../lib/api";

export default function SignUp({
  onBackToLogin,
  onSignUpSuccess,
}: {
  onBackToLogin: () => void;
  onSignUpSuccess: (token: string, name: string) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "delivery">("student");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    // Wire up to api register method
    const res = await api.register({ fullName, email, password, role });
    setBusy(false);

    if (!res.ok) {
      setError(`${res.status} — ${res.error || "Failed to register account."}`);
      return;
    }

    const token = res.data?.token;
    const userName = res.data?.user?.name;

    if (!token || !userName) {
      setError("Failed to register account.");
      return;
    }

    localStorage.setItem("token", token);
    onSignUpSuccess(token, userName);
  };

  return (
    <div className="min-h-screen bg-[#FDEFE6] p-4 sm:p-8 lg:p-10">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[32px] shadow-2xl shadow-emerald-900/10 md:grid-cols-2">
        <form onSubmit={handleSubmit} className="bg-white px-8 py-12 sm:px-14">
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
            Join CampusErrands using your university email.
          </p>

          <label className="mt-6 block text-xs font-bold tracking-wider text-slate-500">
            FULL NAME
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Juan Dela Cruz"
            className="mt-2 w-full rounded-xl border border-slate-200 px-5 py-3.5 text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />

          <label className="mt-4 block text-xs font-bold tracking-wider text-slate-500">
            PHINMA EMAIL
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="juan.upang@phinmaed.com"
            className="mt-2 w-full rounded-xl border border-slate-200 px-5 py-3.5 text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />

          <label className="mt-4 block text-xs font-bold tracking-wider text-slate-500">
            ACCOUNT ROLE
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "student" | "delivery")}
            className="mt-2 w-full rounded-xl border border-slate-200 px-5 py-3.5 text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white"
          >
            <option value="student">Student Requester</option>
            <option value="delivery">Delivery Runner</option>
          </select>

          <label className="mt-4 block text-xs font-bold tracking-wider text-slate-500">
            PASSWORD
          </label>
          <div className="relative mt-2">
            <input
              type={show ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-5 py-3.5 pr-14 text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {show ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            </button>
          </div>

          {error && (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
              <ShieldAlert className="h-4 w-4 shrink-0" /> {error}
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
          <h2 className="text-4xl font-extrabold text-white">Join CampusErrands</h2>
          <p className="text-xs font-semibold tracking-[0.25em] text-white/85">
            PHINMA UNIVERSITY OF PANGASINAN
          </p>
        </div>
      </div>
    </div>
  );
}