import QuickStats from "../components/dashboard/QuickStats";
import TodaysBirthdays from "../components/dashboard/TodaysBirthdays";
import UpcomingEvents from "../components/dashboard/UpcomingEvents";
import TopIdeas from "../components/dashboard/TopIdeas";
import Leaderboard from "../components/dashboard/Leaderboard";
import ActivityChart from "../components/dashboard/ActivityChart";

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold md:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your community at a glance
        </p>
      </div>

      <QuickStats />

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ActivityChart />
        <TodaysBirthdays />
        <UpcomingEvents />
        <TopIdeas />
        <Leaderboard />
      </div>
    </div>
  );
}