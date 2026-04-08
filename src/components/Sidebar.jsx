import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  CalendarDays,
  Cake,
  MessageSquare,
  Settings,
  X,
  Flame,
  Handshake,
} from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/calendar", label: "Calendar", icon: CalendarDays },
  { path: "/birthdays", label: "Birthdays", icon: Cake },
  { path: "/community", label: "Community", icon: MessageSquare },
  { path: "/prayer", label: "Prayer Wall", icon: Flame },
  { path: "/collabs", label: "Collab Requests", icon: Handshake },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ onClose }) {
  const location = useLocation();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    base44.auth.me().then((u) => setUserRole(u?.role)).catch(() => {});
  }, []);

  const isMod = userRole === "mod" || userRole === "admin";

  const visibleNavItems = navItems.filter((item) => {
    if (item.path === "/collabs") return isMod;
    return true;
  });

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-6">
        <div
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => { sessionStorage.removeItem("splash_seen"); window.location.reload(); }}
        >
          <img src="https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/e241ead03_TenkoTokenrerwork.png" alt="Foxfam" className="h-9 w-9 rounded-lg object-cover" />
          <div>
            <h1 className="font-heading text-base font-bold text-foreground">CommHub</h1>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Calendar + Input</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2">
        <div className="space-y-1">
          {visibleNavItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className={`h-[18px] w-[18px] ${isActive ? "text-primary" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-5 py-4">
        <p className="text-xs text-muted-foreground">
          Community Calendar v1.0
        </p>
      </div>
    </div>
  );
}