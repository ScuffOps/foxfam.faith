import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bell, Cake, FilePenLine, MessageSquare, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { communityClient } from "@/api/communityClient";
import { useAuth } from "@/lib/AuthContext";
import { getPublicDisplayName } from "@/lib/userIdentity";
import { listSavedDrafts } from "@/lib/draftRegistry";
import { canModerate } from "@/lib/roles";

const LAST_VISIT_KEY = "foxfam.last-welcome-visit.v1";
const BLESSINGS = [
  "Small acts become legends when repeated with love.",
  "The shrine remembers every kindness.",
  "You do not have to be loud to leave warmth behind.",
  "A shared place becomes home one welcome at a time.",
];

const INVITATIONS = [
  { label: "Leave a prayer for someone", path: "/prayer" },
  { label: "Vote in this week's poll", path: "/polls" },
  { label: "Welcome someone in the forum", path: "/forum" },
  { label: "Share something made with care", path: "/offerings" },
];

export default function WelcomeHome() {
  const { user } = useAuth();
  const [signals, setSignals] = useState({ notifications: 0, threads: 0, birthdays: 0, drafts: 0 });
  const [loading, setLoading] = useState(true);
  const displayName = getPublicDisplayName(user, "Guest Fox");
  const blessing = BLESSINGS[new Date().getDay() % BLESSINGS.length];
  const invitation = INVITATIONS[new Date().getDate() % INVITATIONS.length];

  useEffect(() => {
    let alive = true;
    const previousVisit = window.localStorage.getItem(LAST_VISIT_KEY);
    const since = previousVisit ? new Date(previousVisit) : new Date(Date.now() - 7 * 86400000);
    const load = async () => {
      const [threads, birthdays, notifications] = await Promise.all([
        communityClient.entities.CommunityThread.list("-created_date", 50).catch(() => []),
        communityClient.entities.Birthday.list("birthday", 100).catch(() => []),
        user?.id ? communityClient.entities.UserNotification.filter({ recipient_user_id: user.id }).catch(() => []) : Promise.resolve([]),
      ]);
      if (!alive) return;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowMonth = tomorrow.getMonth() + 1;
      const tomorrowDay = tomorrow.getDate();
      setSignals({
        notifications: notifications.filter((note) => !note.read_at).length,
        threads: threads.filter((thread) => new Date(thread.created_date || 0) > since).length,
        birthdays: birthdays.filter((birthday) => {
          const match = String(birthday.birthday_date || "").match(/-(\d{2})-(\d{2})$/);
          return match && Number(match[1]) === tomorrowMonth && Number(match[2]) === tomorrowDay;
        }).length,
        drafts: listSavedDrafts().filter((draft) => !draft.staffOnly || canModerate(user)).length,
      });
      setLoading(false);
      window.localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    };
    load();
    return () => { alive = false; };
  }, [user]);

  const items = useMemo(() => [
    { label: `${signals.notifications} unread ${signals.notifications === 1 ? "activity" : "activities"}`, path: "/activity", icon: Bell, show: signals.notifications > 0 },
    { label: `${signals.threads} new forum ${signals.threads === 1 ? "post" : "posts"}`, path: "/forum", icon: MessageSquare, show: signals.threads > 0 },
    { label: `${signals.birthdays} ${signals.birthdays === 1 ? "birthday is" : "birthdays are"} tomorrow`, path: "/birthdays", icon: Cake, show: signals.birthdays > 0 },
    { label: `${signals.drafts} saved ${signals.drafts === 1 ? "draft" : "drafts"}`, path: "/drafts", icon: FilePenLine, show: signals.drafts > 0 },
  ].filter((item) => item.show), [signals]);

  return (
    <section className="welcome-home mb-6 overflow-hidden rounded-xl border border-primary/20 bg-card/85 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.32)] sm:p-6" aria-labelledby="welcome-home-title">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.25em] text-primary">Welcome Home</p>
          <h1 id="welcome-home-title" className="mt-1 font-heading text-2xl font-bold sm:text-3xl">Welcome back, {displayName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">The shrine has been busy, but nothing here needs to be rushed.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {loading ? <p className="text-sm text-muted-foreground">Reading the shrine signals...</p> : items.length === 0 ? <p className="text-sm text-muted-foreground">Everything is quiet and caught up.</p> : items.map(({ label, path, icon: Icon }) => <Link key={path} to={path} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/35 px-3 py-2 text-sm hover:border-primary/30 hover:bg-secondary"><Icon className="h-4 w-4 text-primary" /><span>{label}</span><ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" /></Link>)}
          </div>
        </div>
        <div className="w-full rounded-lg border border-primary/20 bg-primary/[0.07] p-4 lg:max-w-sm">
          <div className="flex items-center gap-2 text-primary"><Sparkles className="h-4 w-4" /><span className="text-[10px] uppercase tracking-widest">Today’s Shrine Blessing</span></div>
          <p className="mt-3 text-sm font-semibold leading-6">“{blessing}”</p>
          <Link to={invitation.path} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline">{invitation.label}<ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      </div>
      <p className="mt-5 border-t border-border pt-4 text-center text-xs text-muted-foreground">The shrine remembers every kindness.</p>
    </section>
  );
}
