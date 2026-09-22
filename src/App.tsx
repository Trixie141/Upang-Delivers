import { useState, useEffect } from "react";
import Navbar, { ActiveTab } from "./components/Navbar";
import Browse from "./components/Browse";
import MyGigs from "./screens/MyGigs";
import MyRequests from "./screens/MyRequests";
import CreateErrand from "./components/CreateErrand";
import Login from "./screens/Login";
import SignUp from "./screens/SignUp";
import Landing from "./screens/Landing";
import RoleSelect, { AppRole } from "./screens/RoleSelect";
import AdminLogin from "./screens/AdminLogin";
import RunnerNavbar, { type RunnerTab } from "./components/Runnernavbar";
import BrowseErrands from "./screens/runner/BrowseErrands";
import RunnerProfileContainer from "./screens/runner/Runnerprofilecontainer";
import AdminDashboard from "./screens/admin/AdminDashboard";
import AdminNavbar, { AdminTab } from "./components/Adminnavbar";
import StudentProfile from "./screens/StudentProfile";
import AdminErrands from "./screens/admin/AdminErrands";
import AdminUsers from "./screens/admin/AdminUsers";
import AdminDashboardContainer from "./screens/admin/AdminDashboardContainer";
import AdminProfile from "./screens/admin/AdminProfile";

interface UserProfile {
  id: string;
  fullName: string;
  role: AppRole | "admin";
}

type AuthScreen = "landing" | "role" | "login" | "signup" | "admin";

export default function App() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("token") || null
  );
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("auth_user") || "null");
      return saved && saved.id && saved.role ? saved : null;
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>("browse");
  const [adminTab, setAdminTab] = useState<AdminTab>("dashboard");
  const [runnerTab, setRunnerTab] = useState<RunnerTab>("browse");

  // Starts on the landing page instead of the login form
  const [authScreen, setAuthScreen] = useState<AuthScreen>("landing");
  const [selectedRole, setSelectedRole] = useState<AppRole>("student");

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("auth_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("auth_user");
    }
  }, [user]);

  const handleAuthSuccess = (
    authToken: string,
    authUser: { id: string; name: string; role: string },
  ) => {
    setToken(authToken);
    setUser({
      id: authUser.id,
      fullName: authUser.name,
      role: authUser.role as UserProfile["role"],
    });
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setActiveTab("browse");
    setAuthScreen("landing");
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
  };

  // Not logged in: landing -> role select -> login / sign up / admin login
  if (!token || !user) {
    if (authScreen === "landing") {
      return <Landing onGetStarted={() => setAuthScreen("role")} />;
    }

    if (authScreen === "role") {
      return (
        <RoleSelect
          onBack={() => setAuthScreen("landing")}
          onContinue={(role) => {
            setSelectedRole(role);
            setAuthScreen("login");
          }}
          onAdmin={() => setAuthScreen("admin")}
        />
      );
    }

    if (authScreen === "admin") {
      return (
        <AdminLogin
          onBack={() => setAuthScreen("role")}
          onLogin={(adminToken, name) => {
            setToken(adminToken);
            setUser({ id: "admin", fullName: name, role: "admin" });
          }}
        />
      );
    }

    if (authScreen === "signup") {
      return (
        <SignUp
          onBackToLogin={() => setAuthScreen("login")}
          onSignUpSuccess={handleAuthSuccess}
        />
      );
    }

    return (
      <Login
        role={selectedRole}
        onBack={() => setAuthScreen("role")}
        onLogin={handleAuthSuccess}
        onSignUp={() => setAuthScreen("signup")}
      />
    );
  }

  if (user.role === "admin") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <AdminNavbar
          activeTab={adminTab}
          setActiveTab={setAdminTab}
          name={user.fullName}
          onLogout={handleLogout}
        />
        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          {adminTab === "dashboard" && <AdminDashboardContainer token={token} />}
{adminTab === "errands" && <AdminErrands token={token} />}
{adminTab === "users" && <AdminUsers token={token} />}
{adminTab === "profile" && <AdminProfile token={token} name={user.fullName} />}
{adminTab !== "dashboard" &&
  adminTab !== "errands" &&
  adminTab !== "users" &&
  adminTab !== "profile" && (
    <div className="rounded-3xl bg-white p-14 text-center text-slate-400 shadow-sm">
      The {adminTab} page hasn't been built yet.
    </div>
  )}
        </main>
      </div>
    );
  }

  if (user.role === "delivery") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <RunnerNavbar
          activeTab={runnerTab}
          setActiveTab={setRunnerTab}
          name={user.fullName}
          onLogout={handleLogout}
        />
        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          {runnerTab === "browse" && (
            <BrowseErrands token={token} goToGigs={() => setRunnerTab("gigs")} />
          )}
          {runnerTab === "gigs" && <MyGigs token={token} userId={user.id} />}
          {runnerTab === "profile" && (
            <RunnerProfileContainer
              token={token}
              userId={user.id}
              name={user.fullName}
              onProfileUpdated={(u) =>
                setUser((prev) => (prev ? { ...prev, fullName: u.fullName } : prev))
              }
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        {activeTab === "browse" && <Browse token={token} userRole={user.role} />}
        {activeTab === "gigs" && <MyGigs token={token} userId={user.id} />}
        {activeTab === "requests" && <MyRequests token={token} userId={user.id} />}
        {activeTab === "create" && (
          <CreateErrand token={token} onSuccess={() => setActiveTab("requests")} />
        )}
        {activeTab === "profile" && (
  <StudentProfile
    token={token}
    userId={user.id}
    name={user.fullName}
    onProfileUpdated={(u) =>
      setUser((prev) => (prev ? { ...prev, fullName: u.fullName } : prev))
    }
  />
)}
      </main>
    </div>
  );
}