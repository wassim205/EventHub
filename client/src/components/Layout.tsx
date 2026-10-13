import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const navigation = [
  { to: "/", label: "Tableau de bord", end: true },
  { to: "/evenements", label: "Événements" },
  { to: "/participants", label: "Participants" },
  { to: "/utilisateurs", label: "Utilisateurs", adminOnly: true },
];

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold tracking-tight text-slate-900">EventHub</span>
            <nav className="flex flex-wrap gap-1">
              {navigation
                .filter((item) => !item.adminOnly || user?.role === "admin")
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        isActive ? "bg-brand-100 text-brand-600" : "text-slate-600 hover:bg-slate-100"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">{user?.fullName}</p>
              <p className="text-xs text-slate-500">{user?.role === "admin" ? "Administrateur" : "Staff"}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}