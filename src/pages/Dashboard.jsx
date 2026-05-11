import QuickStats from "../components/dashboard/QuickStats";
import TodaysBirthdays from "../components/dashboard/TodaysBirthdays";
import UpcomingEvents from "../components/dashboard/UpcomingEvents";
import TopIdeas from "../components/dashboard/TopIdeas";
import BoopTheFox from "../components/dashboard/BoopTheFox";
import VeriThought from "../components/dashboard/VeriThought";
import ErenAgent from "../components/dashboard/ErenAgent";
import AmbientSignal from "../components/dashboard/AmbientSignal";
import HiddenEasterEgg from "../components/dashboard/HiddenEasterEgg";
import RecentCodexEntries from "../components/dashboard/RecentCodexEntries";
import CommunityUpdates from "../components/dashboard/CommunityUpdates";
import ProgressionLoop from "../components/ProgressionLoop";

export default function Dashboard() {
  return (
    <div className="community-dashboard mx-auto max-w-6xl animate-fade-in">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold md:text-3xl">
          Dashboard <HiddenEasterEgg index={0} />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your community at a glance <HiddenEasterEgg index={1} />
        </p>
      </div>

      <QuickStats />

      <div className="mt-6">
        <ProgressionLoop collapsible positionable />
      </div>

      {/* Irregular bento grid — 4-col base on large screens */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* Row 1: Upcoming Events (half) + Codex (quarter) + Birthdays (quarter) */}
        <div className="sm:col-span-2 lg:col-span-2">
          <UpcomingEvents />
        </div>
        <div className="sm:col-span-1">
          <RecentCodexEntries />
        </div>
        <div className="sm:col-span-1">
          <TodaysBirthdays />
        </div>

        {/* Row 2: Community updates + Top Ideas */}
        <div className="sm:col-span-2 lg:col-span-2">
          <CommunityUpdates />
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <TopIdeas />
        </div>

        {/* Row 3: Eren (quarter) + atmospheric signal (quarter) + VeriThought (half) */}
        <div className="sm:col-span-1">
          <ErenAgent />
        </div>
        <div className="sm:col-span-1">
          <AmbientSignal />
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <VeriThought />
        </div>

        {/* Row 5: Boop fox — narrow centred strip */}
        <div className="sm:col-span-2 lg:col-span-4">
          <div className="foxcard rounded-xl p-5 flex flex-col items-center justify-center gap-1 relative">
            <HiddenEasterEgg index={2} />
            <p className="dashboard-candle font-heading text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              resident fox <HiddenEasterEgg index={3} />
            </p>
            <BoopTheFox />
          </div>
        </div>

      </div>
    </div>
  );
}
