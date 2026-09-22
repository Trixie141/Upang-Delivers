import {
  Compass,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Users,
  UserCog,
} from "lucide-react";

export type AdminTab = "dashboard" | "users" | "errands" | "profile";

interface AdminNavbarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  name: string;
  onLogout: () => void;
}

const navItems = [
  { id: "dashboard" as AdminTab, label: "Dashboard", icon: LayoutDashboard },
  { id: "users" as AdminTab, label: "Users", icon: Users },
  { id: "errands" as AdminTab, label: "Errands", icon: ListChecks },
  { id: "profile" as AdminTab, label: "Profile", icon: UserCog },
];

export default function AdminNavbar({
  activeTab,
  setActiveTab,
  name,
  onLogout,
}: AdminNavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand / Logo */}
        <div
          onClick={() => setActiveTab("dashboard")}
          className="flex cursor-pointer items-center gap-2 font-extrabold text-slate-900"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-200">
            <Compass className="h-5 w-5" />
          </div>
          <span className="text-lg tracking-tight">CampusErrands</span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 rounded-2xl bg-slate-100/80 p-1.5 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-emerald-500" : ""}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right text-xs md:block">
            <p className="font-bold text-slate-900">{name || "Admin"}</p>
            <p className="text-slate-400">Admin</p>
          </div>

          <button
            onClick={onLogout}
            title="Log out"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="flex border-t border-slate-100 bg-white p-2 md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-bold ${
                isActive ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}