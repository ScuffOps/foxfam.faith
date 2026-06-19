import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import OnboardingModal from "./OnboardingModal";
import Splash from "../pages/Splash";
import { useState, useEffect } from "react";
import { communityClient } from "@/api/communityClient";

const GUEST_ONBOARDING_KEY = "commhub_guest_onboarding_seen";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const forceSplash = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("splash");
  const [showSplash, setShowSplash] = useState(() => forceSplash || !sessionStorage.getItem("splash_seen"));

  const handleEnterSite = () => {
    if (!forceSplash) sessionStorage.setItem("splash_seen", "1");
    setShowSplash(false);
  };

  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    communityClient.auth.me().then((user) => {
      if (user && !user.onboarded) {
        setIsGuest(false);
        setShowOnboarding(true);
      }
    }).catch(() => {
      if (localStorage.getItem(GUEST_ONBOARDING_KEY)) return;
      // Not logged in — show onboarding with sign-up step
      setIsGuest(true);
      setShowOnboarding(true);
    });
  }, []);

  const handleGuestContinue = () => {
    localStorage.setItem(GUEST_ONBOARDING_KEY, "1");
    setShowOnboarding(false);
  };

  return (
    <div className="app-viewport flex overflow-hidden bg-background">
      {showSplash && <Splash onEnter={handleEnterSite} />}
      {showOnboarding && (
        <OnboardingModal
          onComplete={() => setShowOnboarding(false)}
          onGuestContinue={handleGuestContinue}
          isGuest={isGuest}
        />
      )}
      {/* Desktop Sidebar */}
      <div className="relative z-10 hidden shrink-0 md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[min(20rem,86vw)] animate-slide-in">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="clockyboii-shell relative z-10 flex flex-1 flex-col overflow-hidden">
        <MobileNav onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
