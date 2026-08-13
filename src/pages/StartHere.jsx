import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronRight, Compass, ExternalLink, Radio, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import { ONBOARDING_ITEMS, PORTAL_DIRECTORY, PORTAL_RULES, STREAM_RULES } from "@/lib/portalGuide";

const SHRINE_TOUR_KEY = "foxfam.startHere.shrineVisited";

export default function StartHere() {
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    setLoading(true);
    const me = await communityClient.auth.me().catch(() => null);
    setUser(me);
    if (!me?.id) {
      setProgress({ shrine: localStorage.getItem(SHRINE_TOUR_KEY) === "1" });
      setLoading(false);
      return;
    }

    const [identities, birthdays, threads] = await Promise.all([
      communityClient.auth.getLinkedIdentities().catch(() => []),
      communityClient.entities.Birthday.list("-created_date", 500).catch(() => []),
      communityClient.entities.CommunityThread.list("-created_date", 500).catch(() => []),
    ]);
    setProgress({
      identity: identities.some((identity) => ["twitch", "discord"].includes(identity.provider)),
      birthday: birthdays.some((birthday) => birthday.recipient_user_id === me.id || birthday.user_id === me.id),
      introduction: threads.some((thread) => (
        thread.user_id === me.id && thread.category === "introductions"
      )),
      shrine: localStorage.getItem(SHRINE_TOUR_KEY) === "1",
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const completedCount = useMemo(
    () => ONBOARDING_ITEMS.filter((item) => progress[item.key]).length,
    [progress],
  );

  function markShrineVisited() {
    localStorage.setItem(SHRINE_TOUR_KEY, "1");
    setProgress((current) => ({ ...current, shrine: true }));
  }

  return (
    <div className="start-here-page mx-auto max-w-6xl animate-fade-in">
      <header className="start-here-hero">
        <div>
          <p className="start-here-eyebrow"><Compass /> New to Foxfam?</p>
          <h1 className="font-heading text-3xl font-bold md:text-4xl">Start Here</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            The shortest path from Guest Fox to someone the shrine recognizes. Learn the room, choose your identity, and leave one small trace that says you were here.
          </p>
        </div>
        {user ? (
          <div className="start-here-progress" aria-label={`${completedCount} of ${ONBOARDING_ITEMS.length} setup steps complete`}>
            <strong>{completedCount}/{ONBOARDING_ITEMS.length}</strong>
            <span>setup complete</span>
          </div>
        ) : (
          <Button onClick={() => communityClient.auth.redirectToLogin()} className="gap-2">
            <ExternalLink className="h-4 w-4" /> Sign in
          </Button>
        )}
      </header>

      <section className="start-here-band" aria-labelledby="first-steps-title">
        <div className="start-here-section-heading">
          <Sparkles />
          <div>
            <h2 id="first-steps-title" className="font-heading text-xl font-semibold">Your First Steps</h2>
            <p>Progress reflects saved portal data, not decorative checkboxes.</p>
          </div>
        </div>
        <div className="start-here-checklist">
          {ONBOARDING_ITEMS.map((item, index) => (
            <Link
              key={item.key}
              to={item.path}
              onClick={item.key === "shrine" ? markShrineVisited : undefined}
              className="start-here-check"
            >
              <span className={progress[item.key] ? "is-complete" : ""}>
                {progress[item.key] ? <Check /> : index + 1}
              </span>
              <strong>{item.label}</strong>
              <ChevronRight aria-hidden="true" />
            </Link>
          ))}
        </div>
        {loading ? <p className="mt-3 text-xs text-muted-foreground">Checking your trail through the portal…</p> : null}
      </section>

      <section className="start-here-band" aria-labelledby="directory-title">
        <div className="start-here-section-heading">
          <Compass />
          <div>
            <h2 id="directory-title" className="font-heading text-xl font-semibold">Portal Directory</h2>
            <p>Useful destinations, in the order most people need them.</p>
          </div>
        </div>
        <div className="start-here-directory">
          {PORTAL_DIRECTORY.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <Link to={item.path}>{item.action} <ChevronRight /></Link>
            </article>
          ))}
        </div>
      </section>

      <div className="start-here-rules-grid">
        <RuleSection icon={ShieldCheck} title="Portal Rules" items={PORTAL_RULES} />
        <RuleSection icon={Radio} title="Stream Rules" items={STREAM_RULES} />
      </div>

      <footer className="start-here-closing">
        <BookOpen aria-hidden="true" />
        <p>The shrine remembers every kindness.</p>
      </footer>
    </div>
  );
}

function RuleSection({ icon: Icon, items, title }) {
  return (
    <section className="start-here-band" aria-label={title}>
      <div className="start-here-section-heading">
        <Icon />
        <h2 className="font-heading text-xl font-semibold">{title}</h2>
      </div>
      <ol className="start-here-rules">
        {items.map((item, index) => (
          <li key={item.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div><strong>{item.title}</strong><p>{item.body}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}
