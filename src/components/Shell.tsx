import { useState, type ComponentType, type ReactNode } from "react";
import { Bell, LogOut, Menu, X } from "lucide-react";
import { useStore } from "../store";

export type Page = "gigs" | "requests" | "track" | "post" | "profile";

export type NavItem = {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
};

export default function Shell({
  items,
  page,
  setPage,
  title,
  subtitle,
  headerRight,
  onLogout,
  children,
}: {
  items: NavItem[];
  page: string;
  setPage: (p: string) => void;
  title: string;
  subtitle?: string;
  headerRight?: ReactNode;
  onLogout: () => void;
  children: ReactNode;
}) {
  const { profile, pushToast } = useStore();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full w-[280px] flex-col bg-[#0B1524] px-5 py-6">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-2xl font-extrabold text-white">
          U
        </div>
        <div>
          <p className="text-lg font-bold text-white">Upang Delivers</p>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">
            PHINMA UPANG
          </p>
        </div>
      </div>

      <nav className="mt-12 space-y-2">
        {items.map((n) => {
          const Icon = n.icon;
          const active = page === n.key;
          return (
            <button
              key={n.key}
              onClick={() => {
                setPage(n.key);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left text-lg font-semibold transition ${
                active
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              {n.label}
            </button>
          );
        })}
      </nav>

      <button
        onClick={onLogout}
        className="mt-auto flex items-center gap-4 rounded-2xl px-5 py-4 text-left font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
      >
        <LogOut className="h-5 w-5" />
        Log Out
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F4F6F8]">
      <aside className="hidden lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full">{sidebar}</div>
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white p-2 text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 bg-white px-5 py-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
              {subtitle && <p className="truncate text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            {headerRight ?? (
              <p className="hidden text-lg text-slate-600 sm:block">
                Hey, {profile.name.split(" ")[0]}! 👋
              </p>
            )}
            <button
              onClick={() => pushToast("No new notifications right now.")}
              className="relative rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
            >
              <Bell className="h-6 w-6" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500" />
            </button>
            <img
              src={profile.avatar}
              alt="avatar"
              className="h-11 w-11 rounded-full border border-slate-200 bg-white object-cover"
            />
          </div>
        </header>

        <main className="flex-1 px-4 pb-16 pt-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
