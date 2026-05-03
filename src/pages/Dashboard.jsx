import QuickStats from "../components/dashboard/QuickStats";
import TodaysBirthdays from "../components/dashboard/TodaysBirthdays";
import UpcomingEvents from "../components/dashboard/UpcomingEvents";
import TopIdeas from "../components/dashboard/TopIdeas";
import Leaderboard from "../components/dashboard/Leaderboard";
import ActivityChart from "../components/dashboard/ActivityChart";
import BoopTheFox from "../components/dashboard/BoopTheFox";
import VeriThought from "../components/dashboard/VeriThought";
import ErenAgent from "../components/dashboard/ErenAgent";
import HiddenEasterEgg from "../components/dashboard/HiddenEasterEgg";
import RecentCodexEntries from "../components/dashboard/RecentCodexEntries";
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
        <ProgressionLoop />
      </div>

      {/* Irregular bento grid — 4-col base on large screens */}
      <div className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-4">

        {/* Row 1: Activity chart — full width */}
        <div className="col-span-2 lg:col-span-4">
          <ActivityChart />
        </div>

        {/* Row 2: Upcoming Events (half) + Codex (quarter) + Birthdays (quarter) */}
        <div className="col-span-2 lg:col-span-2">
          <UpcomingEvents />
        </div>
        <div className="col-span-2 lg:col-span-1">
          <RecentCodexEntries />
        </div>
        <div className="col-span-2 lg:col-span-1">
          <TodaysBirthdays />
        </div>

        {/* Row 3: Top Ideas (3/4) + Eren (1/4) */}
        <div className="col-span-2 lg:col-span-3">
          <TopIdeas />
        </div>
        <div className="col-span-2 lg:col-span-1">
          <ErenAgent />
        </div>

        {/* Row 4: Leaderboard (half) + VeriThought (half) */}
        <div className="col-span-2 lg:col-span-2">
          <Leaderboard />
        </div>
        <div className="col-span-2 lg:col-span-2">
          <VeriThought />
        </div>

        {/* Row 5: Boop fox — narrow centred strip */}
        <div className="col-span-2 lg:col-span-4">
          <div className="foxcard rounded-xl p-5 flex flex-col items-center justify-center gap-1 relative">
            <HiddenEasterEgg index={2} />
            <p className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              resident fox <HiddenEasterEgg index={3} />
            </p>
            <BoopTheFox />
          </div>
        </div>

      </div>
    </div>
  );
}