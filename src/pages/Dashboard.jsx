import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, RotateCcw, SlidersHorizontal } from "lucide-react";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import QuickStats from "../components/dashboard/QuickStats";
import TodaysBirthdays from "../components/dashboard/TodaysBirthdays";
import UpcomingEvents from "../components/dashboard/UpcomingEvents";
import TopIdeas from "../components/dashboard/TopIdeas";
import BoopTheFox from "../components/dashboard/BoopTheFox";
import VeriThought from "../components/dashboard/VeriThought";
import ErenAgent from "../components/dashboard/ErenAgent";
import BugReportPanel from "../components/dashboard/BugReportPanel";
import HiddenEasterEgg from "../components/dashboard/HiddenEasterEgg";
import RecentCodexEntries from "../components/dashboard/RecentCodexEntries";
import CommunityUpdates from "../components/dashboard/CommunityUpdates";
import ScuffoxUpdatesTicker from "../components/dashboard/ScuffoxUpdatesTicker";
import ProgressionLoop from "../components/ProgressionLoop";
import {
  DASHBOARD_CARD_IDS,
  DASHBOARD_CARD_LABELS,
  DASHBOARD_PREFS_STORAGE_KEY,
  getDashboardPreferencesFromProfile,
  moveDashboardCard,
  normalizeDashboardPreferences,
  setDashboardCardVisibility,
  withDashboardPreferences,
} from "@/lib/dashboardPreferences";

const CARD_META = {
  "quick-stats": { className: "sm:col-span-2 lg:col-span-4", render: () => <QuickStats /> },
  progression: { className: "sm:col-span-2 lg:col-span-4", render: () => <ProgressionLoop collapsible positionable /> },
  "upcoming-events": { className: "sm:col-span-2 lg:col-span-2", render: () => <UpcomingEvents /> },
  codex: { className: "sm:col-span-1", render: () => <RecentCodexEntries /> },
  birthdays: { className: "sm:col-span-1", render: () => <TodaysBirthdays /> },
  "community-updates": { className: "sm:col-span-2 lg:col-span-2", render: () => <CommunityUpdates /> },
  "top-ideas": { className: "sm:col-span-2 lg:col-span-2", render: () => <TopIdeas /> },
  "eren-agent": { className: "sm:col-span-1", render: () => <ErenAgent /> },
  "bug-report": { className: "sm:col-span-1", render: () => <BugReportPanel /> },
  "scuffox-thought": { className: "sm:col-span-2 lg:col-span-2", render: () => <VeriThought /> },
  "boop-fox": {
    className: "sm:col-span-2 lg:col-span-4",
    render: () => (
      <div className="foxcard flex flex-col items-center justify-center gap-1 rounded-xl p-5 relative">
        <HiddenEasterEgg index={2} />
        <p className="dashboard-candle font-heading mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          resident fox <HiddenEasterEgg index={3} />
        </p>
        <BoopTheFox />
      </div>
    ),
  },
};

function loadStoredPreferences() {
  if (typeof window === "undefined") return normalizeDashboardPreferences();
  try {
    return normalizeDashboardPreferences(JSON.parse(window.localStorage.getItem(DASHBOARD_PREFS_STORAGE_KEY) || "{}"));
  } catch {
    return normalizeDashboardPreferences();
  }
}

export default function Dashboard() {
  const [preferences, setPreferences] = useState(loadStoredPreferences);
  const [profile, setProfile] = useState(null);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [saveState, setSaveState] = useState("idle");

  useEffect(() => {
    let alive = true;
    communityClient.auth.me()
      .then((me) => {
        if (!alive) return;
        setProfile(me);
        const profilePreferences = getDashboardPreferencesFromProfile(me);
        setPreferences(profilePreferences);
        window.localStorage.setItem(DASHBOARD_PREFS_STORAGE_KEY, JSON.stringify(profilePreferences));
      })
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, []);

  const visibleCards = useMemo(() => {
    const normalized = normalizeDashboardPreferences(preferences);
    const hidden = new Set(normalized.hidden);
    return normalized.order.filter((id) => !hidden.has(id));
  }, [preferences]);

  async function persistPreferences(nextPreferences) {
    const normalized = normalizeDashboardPreferences(nextPreferences);
    setPreferences(normalized);
    window.localStorage.setItem(DASHBOARD_PREFS_STORAGE_KEY, JSON.stringify(normalized));

    if (!profile) return;
    setSaveState("saving");
    try {
      const notificationPreferences = withDashboardPreferences(profile.notification_preferences, normalized);
      const updated = await communityClient.auth.updateMe({ notification_preferences: notificationPreferences });
      setProfile(updated);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1400);
    } catch {
      setSaveState("error");
    }
  }

  function resetPreferences() {
    persistPreferences(normalizeDashboardPreferences({ order: DASHBOARD_CARD_IDS, hidden: [] }));
  }

  function moveCard(cardId, direction) {
    persistPreferences(moveDashboardCard(preferences, cardId, direction));
  }

  function setCardVisible(cardId, visible) {
    persistPreferences(setDashboardCardVisibility(preferences, cardId, visible));
  }

  return (
    <div className="community-dashboard mx-auto max-w-6xl animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">
            Dashboard <HiddenEasterEgg index={0} />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your community at a glance <HiddenEasterEgg index={1} />
          </p>
        </div>
        <Button type="button" variant="outline" className="gap-2 self-start lg:self-auto" onClick={() => setCustomizerOpen((open) => !open)}>
          <SlidersHorizontal className="h-4 w-4" />
          Cards
        </Button>
      </div>

      <ScuffoxUpdatesTicker />

      {customizerOpen && (
        <DashboardCustomizer
          preferences={preferences}
          saveState={saveState}
          onMove={moveCard}
          onReset={resetPreferences}
          onSetVisible={setCardVisible}
        />
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visibleCards.length === 0 ? (
          <div className="dashboard-empty sm:col-span-2 lg:col-span-4 rounded-xl px-4 py-10 text-center">
            <p className="font-heading text-base font-semibold">All dashboard cards are hidden</p>
            <p className="mt-1 text-sm text-muted-foreground">Bring them back when the signal gets too quiet.</p>
            <Button type="button" className="mt-4 gap-2" onClick={resetPreferences}>
              <RotateCcw className="h-4 w-4" />
              Reset Cards
            </Button>
          </div>
        ) : (
          visibleCards.map((cardId) => {
            const card = CARD_META[cardId];
            if (!card) return null;
            return <div key={cardId} className={card.className}>{card.render()}</div>;
          })
        )}
      </div>
    </div>
  );
}

function DashboardCustomizer({ preferences, saveState, onMove, onReset, onSetVisible }) {
  const normalized = normalizeDashboardPreferences(preferences);
  const hidden = new Set(normalized.hidden);

  return (
    <section className="dashboard-customizer mt-4 rounded-xl border border-border bg-card/50 p-4" aria-label="Dashboard card controls">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-sm font-semibold">Dashboard Cards</h2>
          <p className="text-xs text-muted-foreground">Show, hide, and reorder what you see here.</p>
        </div>
        <div className="flex items-center gap-2">
          {saveState === "saved" && <span className="inline-flex items-center gap-1 text-xs text-emerald-200"><Check className="h-3.5 w-3.5" /> Saved</span>}
          {saveState === "saving" && <span className="text-xs text-muted-foreground">Saving...</span>}
          {saveState === "error" && <span className="text-xs text-destructive">Could not save profile</span>}
          <Button type="button" size="sm" variant="outline" className="gap-2" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {normalized.order.map((cardId, index) => {
          const visible = !hidden.has(cardId);
          return (
            <div key={cardId} className="dashboard-customizer-row rounded-lg border border-border/70 bg-secondary/25 p-2.5">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                onClick={() => onSetVisible(cardId, !visible)}
                aria-pressed={visible}
              >
                {visible ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                <span className={visible ? "text-foreground" : "text-muted-foreground"}>{DASHBOARD_CARD_LABELS[cardId]}</span>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <Button type="button" size="icon" variant="ghost" disabled={index === 0} onClick={() => onMove(cardId, "up")} aria-label={`Move ${DASHBOARD_CARD_LABELS[cardId]} up`}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" disabled={index === normalized.order.length - 1} onClick={() => onMove(cardId, "down")} aria-label={`Move ${DASHBOARD_CARD_LABELS[cardId]} down`}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
