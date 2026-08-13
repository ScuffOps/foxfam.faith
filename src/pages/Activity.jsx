import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Circle, ExternalLink, Inbox } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/GlassCard";
import { useAuth } from "@/lib/AuthContext";
import { isNotificationRead, markNotificationRead } from "@/lib/notificationState";
import BirthdayWishInbox from "@/components/birthdays/BirthdayWishInbox";

const FILTERS = ["all", "unread", "birthdays", "replies", "approvals", "events", "staff"];

function getNotificationCategory(notification) {
  const value = `${notification.type || ""} ${notification.category || ""} ${notification.title || ""}`.toLowerCase();
  if (/birthday/.test(value)) return "birthdays";
  if (/reply|comment|mention/.test(value)) return "replies";
  if (/approv|review|submission/.test(value)) return "approvals";
  if (/event|calendar/.test(value)) return "events";
  if (/staff|shift|task|schedule/.test(value)) return "staff";
  return "updates";
}

function getNotificationPath(notification) {
  const path = notification.action_url || notification.path || notification.url || "";
  return typeof path === "string" && path.startsWith("/") ? path : "";
}

export default function Activity() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState(() => FILTERS.includes(searchParams.get("category")) ? searchParams.get("category") : "all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!user?.id) {
      setLoading(false);
      return undefined;
    }
    communityClient.entities.UserNotification.filter({ recipient_user_id: user.id }, "-created_date", 100)
      .then((rows) => alive && setNotifications(rows))
      .catch(() => alive && setNotifications([]))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [user]);

  const visibleNotifications = useMemo(() => notifications.filter((notification) => {
    if (filter === "all") return true;
    if (filter === "unread") return !isNotificationRead(notification);
    return getNotificationCategory(notification) === filter;
  }), [filter, notifications]);
  const unreadCount = notifications.filter((notification) => !isNotificationRead(notification)).length;

  const markRead = async (ids) => {
    if (ids.length === 0) return;
    setNotifications((current) => current.map((notification) => ids.includes(notification.id) ? markNotificationRead(notification) : notification));
    await communityClient.notifications.markRead(ids).catch(() => null);
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Activity Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">Replies, approvals, reminders, and staff signals in one place.</p>
        </div>
        <Button type="button" variant="outline" className="gap-2 self-start" disabled={unreadCount === 0} onClick={() => markRead(notifications.filter((note) => !isNotificationRead(note)).map((note) => note.id))}>
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Activity filters">
        {FILTERS.map((item) => (
          <button key={item} type="button" role="tab" aria-selected={filter === item} onClick={() => setFilter(item)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${filter === item ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary/35 text-muted-foreground hover:text-foreground"}`}>
            {item}{item === "unread" && unreadCount > 0 ? ` ${unreadCount}` : ""}
          </button>
        ))}
      </div>

      {(filter === "all" || filter === "birthdays") && <div className="mb-4"><BirthdayWishInbox userId={user?.id} compact title="Birthday Update Inbox" /></div>}

      <GlassCard className="p-0">
        {loading ? (
          <div className="flex justify-center py-16"><div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" /></div>
        ) : !user ? (
          <EmptyState title="Sign in to collect your activity" description="Twitch or Discord sign-in gives replies and reminders somewhere to land." />
        ) : visibleNotifications.length === 0 ? (
          <EmptyState title="All quiet here" description={filter === "all" ? "New replies, approvals, and reminders will appear here." : "Nothing matches this filter right now."} />
        ) : (
          <div className="divide-y divide-border">
            {visibleNotifications.map((notification) => {
              const path = getNotificationPath(notification);
              const unread = !isNotificationRead(notification);
              const content = (
                <>
                  <span className="mt-1 shrink-0">{unread ? <Circle className="h-2.5 w-2.5 fill-primary text-primary" /> : <Bell className="h-4 w-4 text-muted-foreground" />}</span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{notification.title || "Portal update"}</span>{notification.message ? <span className="mt-1 block text-xs leading-5 text-muted-foreground">{notification.message}</span> : null}<span className="mt-2 block text-[10px] uppercase tracking-widest text-muted-foreground">{getNotificationCategory(notification)} · {new Date(notification.created_date).toLocaleDateString()}</span></span>
                  {path ? <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
                </>
              );
              const className = `flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-secondary/35 ${unread ? "bg-primary/[0.035]" : ""}`;
              return path ? <Link key={notification.id} to={path} onClick={() => markRead([notification.id])} className={className}>{content}</Link> : <button key={notification.id} type="button" onClick={() => markRead([notification.id])} className={className}>{content}</button>;
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function EmptyState({ title, description }) {
  return <div className="px-5 py-14 text-center"><Inbox className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-3 font-heading text-base font-semibold">{title}</h2><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p></div>;
}
