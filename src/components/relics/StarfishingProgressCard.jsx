import { BookOpen, Fish, Loader2, Sparkles, Trophy } from "lucide-react";
import { getStarfishingProgressModel } from "./starfishingProgressModel.js";

const STATE_COPY = {
  "signed-out": {
    title: "Starfishing journal asleep",
    detail: "Sign in to reveal your celestial catches and equipped fishing charms.",
  },
  unavailable: {
    title: "Moonwater records unavailable",
    detail: "Your saved catches are safe. The archive can be checked again shortly.",
  },
};

export default function StarfishingProgressCard({
  progression = null,
  charms = [],
  status = "ready",
  compact = false,
}) {
  if (status === "loading") {
    return (
      <section
        className="rounded-lg border-2 border-[#707989] bg-[#f6f3ee] p-4 text-[#3f4857] shadow-[4px_4px_0_#c7bbb0]"
        role="status"
        aria-label="Loading Starfishing progress"
      >
        <div className="flex min-h-28 items-center justify-center gap-3 text-sm font-bold">
          <Loader2 className="h-5 w-5 animate-spin text-[#6596a4]" aria-hidden="true" />
          Opening the Starfishing journal...
        </div>
      </section>
    );
  }

  if (STATE_COPY[status]) {
    const copy = STATE_COPY[status];
    return (
      <section
        className="rounded-lg border-2 border-[#707989] bg-[#f6f3ee] p-4 text-[#3f4857] shadow-[4px_4px_0_#c7bbb0]"
        role="status"
      >
        <div className="flex items-start gap-3">
          <JournalSeal />
          <div>
            <h2 className="font-heading text-base font-bold">{copy.title}</h2>
            <p className="mt-1 text-xs leading-5 text-[#657080]">{copy.detail}</p>
          </div>
        </div>
      </section>
    );
  }

  const model = getStarfishingProgressModel({ progression, charms });

  return (
    <section
      className="rounded-lg border-2 border-[#707989] bg-[#f6f3ee] p-4 text-[#3f4857] shadow-[4px_4px_0_#c7bbb0]"
      role="status"
      aria-label="Starfishing progress"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <JournalSeal />
          <div>
            <p className="text-[10px] font-bold uppercase text-[#7c6f72]">Moonwater Journal</p>
            <h2 className="font-heading text-lg font-bold">Starfishing</h2>
          </div>
        </div>
        <div className="min-w-24 rounded-md border-2 border-[#707989] bg-[#d9e6e6] px-3 py-2 text-right">
          <p className="text-xl font-black leading-none">{model.discoveredCount}/{model.totalCount}</p>
          <p className="mt-1 text-[10px] font-bold uppercase text-[#657080]">discovered</p>
        </div>
      </div>

      <div className="mt-4" aria-label="Fishpedia completion">
        <div className="h-3 overflow-hidden rounded-sm border border-[#707989] bg-[#ddd7d1]">
          <div
            className="h-full bg-[#7aa8ad] transition-[width]"
            style={{ width: `${model.completionPercent}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] font-semibold text-[#657080]">
          <span>Fishpedia</span>
          <span>{model.completionPercent}%</span>
        </div>
      </div>

      {model.isEmpty ? (
        <div className="mt-4 rounded-md border border-dashed border-[#9a8f8a] bg-[#ebe8e1] p-4 text-center">
          <Fish className="mx-auto h-5 w-5 text-[#6596a4]" aria-hidden="true" />
          <p className="mt-2 text-xs font-bold">No stars catalogued yet</p>
          <p className="mt-1 text-[11px] text-[#657080]">The first moonwater cast will begin this page.</p>
        </div>
      ) : (
        <div className={`mt-4 grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
          <SummaryGroup icon={Sparkles} label="Recent charms">
            {model.recentAchievements.length ? model.recentAchievements.map((achievement) => (
              <SummaryLine key={achievement.achievementKey}>{achievement.title}</SummaryLine>
            )) : <MutedLine>No achievements yet</MutedLine>}
          </SummaryGroup>

          <SummaryGroup icon={Fish} label="Fishing passives">
            {model.fishingBonuses.length ? model.fishingBonuses.map((bonus) => (
              <SummaryLine key={bonus.charmId}>{bonus.label}</SummaryLine>
            )) : <MutedLine>No fishing charm equipped</MutedLine>}
          </SummaryGroup>
        </div>
      )}

      {(model.profileFrame || model.selectedTrophy) ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {model.profileFrame ? (
            <Keepsake icon={BookOpen} label="Profile frame" value={model.profileFrame.name} />
          ) : null}
          {model.selectedTrophy ? (
            <Keepsake icon={Trophy} label="Displayed trophy" value={model.selectedTrophy.title} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function JournalSeal() {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border-2 border-[#707989] bg-[#f0c9cc] shadow-[2px_2px_0_#b8aaa4]">
      <BookOpen className="h-5 w-5 text-[#586675]" aria-hidden="true" />
    </div>
  );
}

function SummaryGroup({ children, icon: Icon, label }) {
  return (
    <div className="rounded-md border border-[#9a8f8a] bg-[#ebe8e1] p-3">
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase text-[#6c7480]">
        <Icon className="h-3.5 w-3.5 text-[#6596a4]" aria-hidden="true" />
        {label}
      </p>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}

function SummaryLine({ children }) {
  return <p className="text-xs font-bold text-[#465261]">{children}</p>;
}

function MutedLine({ children }) {
  return <p className="text-xs text-[#737b86]">{children}</p>;
}

function Keepsake({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-[#9a8f8a] bg-[#e6ece7] p-2.5">
      <Icon className="h-4 w-4 shrink-0 text-[#718a73]" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase text-[#6c7480]">{label}</p>
        <p className="truncate text-xs font-bold">{value}</p>
      </div>
    </div>
  );
}
