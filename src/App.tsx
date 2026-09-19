import { useState, useEffect } from "react";
import Navbar, { ActiveTab } from "./components/Navbar";
import Browse from "./components/Browse";
import MyGigs from "./screens/MyGigs";
import MyRequests from "./screens/MyRequests";
import CreateErrand from "./components/CreateErrand";
import Login from "./screens/Login";
import SignUp from "./screens/SignUp";

interface UserProfile {
  id: string;
  fullName: string;
  role: "student" | "delivery" | "employee";
}

export default function App() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("token") || null
  );
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("auth_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>("browse");
  const [authScreen, setAuthScreen] = useState<"login" | "signup">("login");

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
    setAuthScreen("login");
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
  };

  if (!token || !user) {
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
        role="student"
        onBack={() => {}}
        onLogin={handleAuthSuccess}
        onSignUp={() => setAuthScreen("signup")}
      />
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
      </main>
    </div>
  );
}