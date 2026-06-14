import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { communityClient } from "@/api/communityClient";
import {
  CalendarDays,
  Cake,
  MessageSquare,
  Settings,
  X,
  Flame,
  Handshake,
  Map,
  Sparkles,
  ShieldCheck,
  BookOpen,
  Feather,
  Home,
  PartyPopper,
  Landmark,
  Vote,
  Mailbox,
  Lightbulb,
  Bug,
  ChevronDown,
} from "lucide-react";
import SidebarProfile from "./SidebarProfile";
import { canBookCollab, canUseAdminPanel } from "@/lib/roles";

const rootNavItems = [
  { path: "/", label: "Dashboard/Home", icon: Home },
];

const navGroups = [
  {
    key: "calendar",
    label: "Calendar",
    icon: CalendarDays,
    activePaths: ["/calendar"],
    items: [
      { path: "/events", label: "Events", icon: PartyPopper },
      { path: "/birthdays", label: "Birthdays", icon: Cake },
      { path: "/collabs", label: "Book a Collab", icon: Handshake, creatorOnly: true },
      { path: "/roadmap", label: "Roadmap", icon: Map },
    ],
  },
  {
    key: "shrine",
    label: "The Shrine",
    icon: Landmark,
    activePaths: ["/shrine"],
    items: [
      { path: "/prayer", label: "Prayer Wall", icon: Flame },
      { path: "/blessings", label: "Blessings", icon: Sparkles },
      { path: "/reliquary", label: "Reliquary", icon: Feather },
      { path: "/codex", label: "Codex", icon: BookOpen },
    ],
  },
  {
    key: "community",
    label: "Community",
    icon: MessageSquare,
    activePaths: ["/community"],
    items: [
      { path: "/forum", label: "Forum", icon: MessageSquare },
      { path: "/polls", label: "Polls", icon: Vote },
      { path: "/feedback", label: "Feedback", icon: Lightbulb },
      { path: "/bugs", label: "Bug Reports", icon: Bug },
      { path: "/suggestions", label: "Suggestion Box", icon: Mailbox },
    ],
  },
];

const utilityNavItems = [
  { path: "/admin", label: "Admin Panel", icon: ShieldCheck, adminOnly: true },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ onClose }) {
  const location = useLocation();
  const [userRole, setUserRole] = useState(null);
  const [openGroups, setOpenGroups] = useState({});

  useEffect(() => {
    communityClient.auth.me().then((u) => setUserRole(u?.role)).catch(() => {});
  }, []);

  const user = userRole ? { role: userRole } : null;

  const canShowItem = (item) => {
    if (item.creatorOnly) return canBookCollab(user);
    if (item.adminOnly) return canUseAdminPanel(user);
    return true;
  };

  const visibleRootItems = rootNavItems.filter(canShowItem);
  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter(canShowItem) }))
    .filter((group) => group.items.length > 0);
  const visibleUtilityItems = utilityNavItems.filter(canShowItem);

  const isPathActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const isGroupActive = (group) =>
    group.activePaths?.some(isPathActive) || group.items.some((item) => isPathActive(item.path));

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };
      visibleGroups.forEach((group) => {
        if (isGroupActive(group)) next[group.key] = true;
      });
      return next;
    });
  }, [location.pathname, userRole]);

  const toggleGroup = (key) => {
    setOpenGroups((current) => ({ ...current, [key]: !current[key] }));
  };

  const renderLink = (item, child = false) => {
    const isActive = isPathActive(item.path);
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onClose}
        aria-current={isActive ? "page" : undefined}
        data-active={isActive}
        data-child={child || undefined}
        className={`sidebar-nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
          child ? "sidebar-nav-child ml-5 py-2 text-[13px]" : ""
        } ${isActive ? "text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
      >
        <item.icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-primary" : ""}`} />
        <span className="min-w-0 truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-full w-[min(20rem,86vw)] flex-col border-r border-border bg-sidebar md:w-64">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-6">
        <div
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => { sessionStorage.removeItem("splash_seen"); window.location.reload(); }}
        >
          <img src="/assets/legacy-media/e241ead03_TenkoTokenrerwork.png" alt="Foxfam" className="h-9 w-9 rounded-lg object-cover" />
          <div>
            <h1 className="font-heading text-base font-bold text-foreground">CommHub</h1>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Calendar + Input</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground md:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <SidebarProfile onNavigate={onClose} />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <div className="space-y-1">
          {visibleRootItems.map((item) => renderLink(item))}

          {visibleGroups.map((group) => {
            const isOpen = Boolean(openGroups[group.key]);
            const groupActive = isGroupActive(group);
            const Icon = group.icon;
            return (
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={isOpen}
                  data-active={groupActive}
                  className={`sidebar-nav-item sidebar-nav-group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                    groupActive ? "text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] shrink-0 ${groupActive ? "text-primary" : ""}`} />
                  <span className="min-w-0 flex-1 truncate">{group.label}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="mt-1 space-y-1 border-l border-border/60 pb-1 pl-1">
                    {group.items.map((item) => renderLink(item, true))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-2">
            {visibleUtilityItems.map((item) => renderLink(item))}
          </div>
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
