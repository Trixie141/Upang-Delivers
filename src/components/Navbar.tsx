import { Compass, ShoppingBag, ListPlus, CheckSquare, User, LogOut } from "lucide-react";

export type ActiveTab = "browse" | "gigs" | "requests" | "create" | "profile";
interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  user: {
    fullName: string;
    role: "student" | "delivery" | string;
  } | null;
  onLogout: () => void;
}

export default function Navbar({ activeTab, setActiveTab, user, onLogout }: NavbarProps) {
  const isRunner = user?.role === "delivery";

  const navItems = [
    {
      id: "browse" as ActiveTab,
      label: "Browse Errands",
      icon: Compass,
      show: true,
    },
    {
      id: "gigs" as ActiveTab,
      label: "My Active Gigs",
      icon: ShoppingBag,
      show: isRunner,
    },
    {
      id: "requests" as ActiveTab,
      label: "My Requests",
      icon: CheckSquare,
      show: true,
    },
    {
      id: "profile" as ActiveTab,
      label: "Profile",
      icon: User,
      show: true,
    },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Brand / Logo */}
        <div 
          onClick={() => setActiveTab("browse")}
          className="flex cursor-pointer items-center gap-2 font-extrabold text-slate-900"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-200">
            <Compass className="h-5 w-5" />
          </div>
          <span className="text-lg tracking-tight">CampusErrands</span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 rounded-2xl bg-slate-100/80 p-1.5 md:flex">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
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

        {/* Right Actions & User Profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all shadow-sm ${
              activeTab === "create"
                ? "bg-emerald-600 text-white shadow-emerald-200"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            <ListPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Post Errand</span>
          </button>

          <div className="h-6 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <div className="hidden text-right text-xs md:block">
              <p className="font-bold text-slate-900">{user?.fullName || "User"}</p>
              <p className="capitalize text-slate-400">{user?.role || "Student"}</p>
            </div>

            <button
              onClick={onLogout}
              title="Log out"
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="flex border-t border-slate-100 bg-white p-2 md:hidden">
        {navItems
          .filter((item) => item.show)
          .map((item) => {
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