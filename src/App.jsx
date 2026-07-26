import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { isAuthUnavailable } from '@/lib/authFailure';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Birthdays from './pages/Birthdays';
import CommunityInput from './pages/CommunityInput';
import Forum from './pages/Forum';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import PrayerWall from './pages/PrayerWall';
import CollabRequests from './pages/CollabRequests';
import Roadmap from './pages/Roadmap';
import Blessings from './pages/Blessings';
import Admin from './pages/Admin';
import Codex from './pages/Codex';
import Reliquary from './pages/Reliquary';
import Offerings from './pages/Offerings';
import StaffOps from './pages/StaffOps';
import RelicForge from './pages/RelicForge';
import QuartersHub from './pages/QuartersHub';
import Starfishing from './pages/Starfishing';
import MatchMerge from './pages/MatchMerge';
import BobaCafe from './pages/BobaCafe';
import FindVezmir from './pages/FindVezmir';
import TimeRunner from './pages/TimeRunner';
import WordGarden from './pages/WordGarden';
import FamiliarWardrobe from './pages/FamiliarWardrobe';
import PlayerCollections from './pages/PlayerCollections';
import FamiliarProvider from '@/games/shared/familiar/FamiliarProvider';

const AuthenticatedApp = () => {
  const {
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    navigateToLogin,
    checkUserAuth,
  } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    } else if (isAuthUnavailable(authError)) {
      return (
        <AuthServiceUnavailable
          message={authError.message}
          onRetry={checkUserAuth}
        />
      );
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/shrine" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/events" element={<Calendar />} />
        <Route path="/birthdays" element={<Birthdays />} />
        <Route path="/community" element={<CommunityInput />} />
        <Route path="/forum" element={<Forum />} />
        <Route path="/polls" element={<CommunityInput defaultTab="polls" />} />
        <Route path="/updates" element={<CommunityInput defaultTab="updates" />} />
        <Route path="/feedback" element={<CommunityInput defaultTab="feedback" />} />
        <Route path="/bugs" element={<CommunityInput defaultTab="bugs" />} />
        <Route path="/suggestions" element={<CommunityInput defaultTab="suggestions" />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/familiar" element={<FamiliarWardrobe />} />
        <Route path="/prayer" element={<PrayerWall />} />
        <Route path="/collabs" element={<CollabRequests />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/blessings" element={<Blessings />} />
        <Route path="/offerings" element={<Offerings />} />
        <Route path="/codex" element={<Codex />} />
        <Route path="/reliquary" element={<Reliquary />} />
        <Route path="/quarters" element={<QuartersHub />} />
        <Route path="/quarters/:profileUserId" element={<QuartersHub />} />
        <Route path="/collections" element={<PlayerCollections />} />
        <Route path="/starfishing" element={<Starfishing />} />
        <Route path="/match-merge" element={<MatchMerge />} />
        <Route path="/boba-cafe" element={<BobaCafe />} />
        <Route path="/find-vezmir" element={<FindVezmir />} />
        <Route path="/time-runner" element={<TimeRunner />} />
        <Route path="/community-wordle" element={<Navigate replace to="/word-garden" />} />
        <Route path="/word-garden" element={<WordGarden />} />
        <Route path="/relic-forge" element={<RelicForge />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/ops" element={<StaffOps />} />
        <Route path="/ops/dashboard" element={<StaffOps defaultTab="dashboard" />} />
        <Route path="/ops/braindump" element={<StaffOps defaultTab="braindump" />} />
        <Route path="/ops/handbook" element={<StaffOps defaultTab="handbook" />} />
        <Route path="/ops/updates" element={<StaffOps defaultTab="updates" />} />
        <Route path="/ops/commands" element={<StaffOps defaultTab="commands" />} />
        <Route path="/ops/schedule" element={<StaffOps defaultTab="schedule" />} />
        <Route path="/ops/time" element={<StaffOps defaultTab="time" />} />
        <Route path="/ops/streams" element={<StaffOps defaultTab="streams" />} />
        <Route path="/ops/meds" element={<StaffOps defaultTab="meds" />} />
        <Route path="/ops/tasks" element={<StaffOps defaultTab="tasks" />} />
        <Route path="/ops/members" element={<StaffOps defaultTab="members" />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function AuthServiceUnavailable({ message, onRetry }) {
  return (
    <main className="fixed inset-0 flex items-center justify-center bg-[#e8eef0] p-5 text-[#3f4857]">
      <section className="w-full max-w-md rounded-lg border-2 border-[#707989] bg-[#f6f3ee] p-6 text-center shadow-[5px_5px_0_#c7bbb0]" role="alert">
        <p className="text-[10px] font-bold uppercase text-[#7c6f72]">Priory connection</p>
        <h1 className="mt-2 font-heading text-xl font-bold">Foxfam service unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-[#657080]">
          {message || "Foxfam could not verify your session. Your saved data has not been changed."}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-md border-2 border-[#5e6978] bg-[#d9e6e6] px-4 py-2 text-sm font-bold shadow-[2px_2px_0_#b8aaa4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6596a4]"
        >
          Retry connection
        </button>
      </section>
    </main>
  );
}


function App() {

  return (
    <AuthProvider>
      <FamiliarProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </FamiliarProvider>
    </AuthProvider>
  )
}

export default App
