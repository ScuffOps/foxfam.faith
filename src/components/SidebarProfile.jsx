import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Settings, Sparkles, UserCircle2 } from "lucide-react";
import { communityClient } from "@/api/communityClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import RankBadge from "@/components/RankBadge";
import { getPrivateUserKey } from "@/lib/communityActor";
import { getRoleLabel } from "@/lib/roles";
import { getInitials, getPublicAvatar, getPublicDisplayName } from "@/lib/userIdentity";

export default function SidebarProfile({ onNavigate }) {
  const [user, setUser] = useState(null);
  const [level, setLevel] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("alerts");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const me = await communityClient.auth.me();
        if (!mounted) return;
        setUser(me);
        const [levels, notes] = await Promise.all([
          communityClient.entities.UserLevel.filter({ user_key: getPrivateUserKey(me) }).catch(() => []),
          communityClient.entities.UserNotification.filter({ recipient_user_id: me.id }).catch(() => []),
        ]);
        if (!mounted) return;
        setLevel(levels[0] || null);
        setNotifications(notes.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 8));
      } catch {
        if (!mounted) return;
        setUser(null);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const displayName = getPublicDisplayName(user, "Guest Fox");
  const avatar = getPublicAvatar(user);
  const unreadCount = notifications.filter((note) => !note.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="mx-3 mb-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl border border-border/80 bg-secondary/35 px-3 py-3 text-left transition-all hover:border-primary/35 hover:bg-secondary/55">
          <Avatar avatar={avatar} name={displayName} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-heading text-sm font-semibold text-foreground">{displayName}</span>
            <span className="block truncate text-[10px] uppercase tracking-widest text-muted-foreground">{getRoleLabel(user?.role)}</span>
          </span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">{unreadCount}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-80 border-border bg-popover/95 p-0 shadow-2xl backdrop-blur-xl">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Avatar avatar={avatar} name={displayName} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{user ? getRoleLabel(user.role) : "Guest session"}</p>
            </div>
          </div>
          <div className="mt-3">
            <RankBadge
              points={level?.points || 0}
              showProgress
              isFavored={Boolean(level?.is_favored)}
              favoredTitle={level?.favored_title}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 border-b border-border text-xs">
          {[
            { key: "alerts", label: "Alerts", icon: Bell },
            { key: "favor", label: "Favor", icon: Sparkles },
            { key: "settings", label: "Settings", icon: Settings },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center justify-center gap-1.5 px-2 py-2.5 transition-colors ${
                activeTab === key ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="max-h-72 overflow-y-auto p-3">
          {activeTab === "alerts" && <NotificationList notifications={notifications} />}
          {activeTab === "favor" && (
            <div className="rounded-lg border border-border bg-secondary/35 p-3">
              <p className="font-heading text-sm font-semibold">{level?.points || 0} Favor</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Favor gains from praise, votes, comments, replies, and boops will appear here.
              </p>
            </div>
          )}
          {activeTab === "settings" && (
            <div className="space-y-2">
              <Link
                to="/settings"
                onClick={onNavigate}
                className="flex items-center gap-2 rounded-lg bg-secondary/45 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                <Settings className="h-4 w-4" />
                Open settings
              </Link>
              <Link
                to="/settings#integrations"
                onClick={onNavigate}
                className="flex items-center gap-2 rounded-lg bg-secondary/45 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                <UserCircle2 className="h-4 w-4" />
                Linked accounts
              </Link>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Avatar({ avatar, name, size = "md" }) {
  const className = size === "lg" ? "h-12 w-12 text-sm" : "h-10 w-10 text-xs";
  if (avatar) {
    return <img src={avatar} alt="" className={`${className} shrink-0 rounded-full border border-primary/25 object-cover`} />;
  }
  return (
    <span className={`${className} flex shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/15 font-heading font-bold text-primary`}>
      {getInitials(name)}
    </span>
  );
}

function NotificationList({ notifications }) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-secondary/25 p-4 text-center text-xs text-muted-foreground">
        No notifications yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((note) => (
        <div key={note.id} className="rounded-lg border border-border bg-secondary/35 p-3">
          <div className="flex items-start gap-2">
            <span className={`mt-1 h-2 w-2 rounded-full ${note.read ? "bg-muted-foreground/30" : "bg-primary"}`} />
            <div className="min-w-0">
              <p className="text-sm font-medium">{note.title}</p>
              {note.message && <p className="mt-0.5 text-xs text-muted-foreground">{note.message}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
