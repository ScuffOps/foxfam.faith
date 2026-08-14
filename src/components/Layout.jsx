import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import OnboardingModal from "./OnboardingModal";
import Splash from "../pages/Splash";
import { useState, useEffect, useRef } from "react";
import { communityClient } from "@/api/communityClient";
import SanctuaryRail from "./SanctuaryRail";
import { isSanctuaryRoute } from "@/lib/sanctuaryNavigation";

const GUEST_ONBOARDING_KEY = "commhub_guest_onboarding_seen";
const FLAT_VECTOR_ROUTES = new Set([
  "/quarters",
  "/relic-forge",
  "/profile",
  "/profile/familiar",
  "/starfishing",
  "/match-merge",
  "/boba-cafe",
  "/find-vezmir",
  "/time-runner",
  "/word-garden",
  "/collections",
]);
const VISITOR_QUARTERS_ROUTE = /^\/quarters\/[^/]+$/;

export function isFlatVectorRoute(pathname) {
  return FLAT_VECTOR_ROUTES.has(pathname) || VISITOR_QUARTERS_ROUTE.test(pathname);
}

export default function Layout() {
  const location = useLocation();
  const contentRef = useRef(null);
  const usesFlatVectorBackdrop = isFlatVectorRoute(location.pathname);
  const usesSanctuaryNavigation = isSanctuaryRoute(location.pathname);
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

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0 });
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [sidebarOpen]);

  const handleGuestContinue = () => {
    localStorage.setItem(GUEST_ONBOARDING_KEY, "1");
    setShowOnboarding(false);
  };

  return (
    <div className={`app-viewport flex overflow-hidden bg-background${usesFlatVectorBackdrop ? " app-viewport--game" : ""}`}>
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
        {usesSanctuaryNavigation ? (
          <SanctuaryRail onOpenPortalNav={() => setSidebarOpen(true)} />
        ) : (
          <Sidebar />
        )}
      </div>

      {/* Full portal navigation stays temporary inside Sanctuary Mode. */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Portal navigation">
          <button
            type="button"
            aria-label="Dismiss portal navigation overlay"
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
        <main ref={contentRef} className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
