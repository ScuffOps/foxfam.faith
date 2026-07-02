import { useEffect, useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { Check, Eye, EyeOff, GripVertical, RotateCcw, SlidersHorizontal } from "lucide-react";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import QuickStats from "../components/dashboard/QuickStats";
import TodaysBirthdays from "../components/dashboard/TodaysBirthdays";
import UpcomingEvents from "../components/dashboard/UpcomingEvents";
import TopIdeas from "../components/dashboard/TopIdeas";
import BoopTheFox from "../components/dashboard/BoopTheFox";
import VeriThought from "../components/dashboard/VeriThought";
import BugReportPanel from "../components/dashboard/BugReportPanel";
import HiddenEasterEgg from "../components/dashboard/HiddenEasterEgg";
import RecentCodexEntries from "../components/dashboard/RecentCodexEntries";
import CommunityUpdates from "../components/dashboard/CommunityUpdates";
import ScuffoxUpdatesTicker from "../components/dashboard/ScuffoxUpdatesTicker";
import FoundersCache from "../components/dashboard/FoundersCache";
import LaunchQuests from "../components/dashboard/LaunchQuests";
import FavorShopPreview from "../components/dashboard/FaithShopPreview";
import WeeklyPortalPoll from "../components/dashboard/WeeklyPortalPoll";
import CommunityBlessingPrompt from "../components/dashboard/CommunityBlessingPrompt";
import ProgressionLoop from "../components/ProgressionLoop";
import {
  DASHBOARD_CARD_IDS,
  DASHBOARD_CARD_LABELS,
  DASHBOARD_PREFS_STORAGE_KEY,
  getDashboardPreferencesFromProfile,
  normalizeDashboardPreferences,
  reorderVisibleDashboardCards,
  setDashboardCardVisibility,
  withDashboardPreferences,
} from "@/lib/dashboardPreferences";

const CARD_META = {
  "quick-stats": { className: "sm:col-span-2 lg:col-span-4", render: () => <QuickStats /> },
  "launch-quests": { className: "sm:col-span-2 lg:col-span-4", render: () => <LaunchQuests /> },
  "founders-cache": { className: "sm:col-span-2 lg:col-span-2", render: () => <FoundersCache /> },
  "favor-shop-preview": { className: "sm:col-span-2 lg:col-span-2", render: () => <FavorShopPreview /> },
  "weekly-portal-poll": { className: "sm:col-span-2 lg:col-span-2", render: () => <WeeklyPortalPoll /> },
  "community-blessing": { className: "sm:col-span-2 lg:col-span-2", render: () => <CommunityBlessingPrompt /> },
  progression: { className: "sm:col-span-2 lg:col-span-4", render: () => <ProgressionLoop collapsible positionable /> },
  "upcoming-events": { className: "sm:col-span-2 lg:col-span-2", render: () => <UpcomingEvents /> },
  codex: { className: "sm:col-span-1", render: () => <RecentCodexEntries /> },
  birthdays: { className: "sm:col-span-1", render: () => <TodaysBirthdays /> },
  "community-updates": { className: "sm:col-span-2 lg:col-span-2", render: () => <CommunityUpdates /> },
  "top-ideas": { className: "sm:col-span-2 lg:col-span-2", render: () => <TopIdeas /> },
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

  function handleDragEnd(result) {
    if (!result.destination) return;
    persistPreferences(reorderVisibleDashboardCards(preferences, result.source.index, result.destination.index));
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
          onReset={resetPreferences}
          onSetVisible={setCardVisible}
        />
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard-bento-grid" direction="horizontal">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`dashboard-bento-grid mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${snapshot.isDraggingOver ? "is-dragging-over" : ""}`}
            >
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
                visibleCards.map((cardId, index) => {
                  const card = CARD_META[cardId];
                  if (!card) return null;
                  return (
                    <Draggable key={cardId} draggableId={cardId} index={index}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`dashboard-bento-item ${card.className} ${dragSnapshot.isDragging ? "is-dragging" : ""}`}
                          style={dragProvided.draggableProps.style}
                        >
                          <button
                            type="button"
                            className="dashboard-drag-handle"
                            {...dragProvided.dragHandleProps}
                            aria-label={`Drag ${DASHBOARD_CARD_LABELS[cardId]}`}
                            title={`Drag ${DASHBOARD_CARD_LABELS[cardId]}`}
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                          {card.render()}
                        </div>
                      )}
                    </Draggable>
                  );
                })
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

function DashboardCustomizer({ preferences, saveState, onReset, onSetVisible }) {
  const normalized = normalizeDashboardPreferences(preferences);
  const hidden = new Set(normalized.hidden);

  return (
    <section className="dashboard-customizer mt-4 rounded-xl border border-border bg-card/50 p-4" aria-label="Dashboard card controls">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-sm font-semibold">Dashboard Cards</h2>
          <p className="text-xs text-muted-foreground">Show, hide, and reset cards. Drag cards directly on the dashboard to reorder.</p>
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
              <span className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">{index + 1}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
