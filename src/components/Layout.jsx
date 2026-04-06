import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import OnboardingModal from "./OnboardingModal";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    base44.auth.me().then((user) => {
      if (user && !user.onboarded) {
        setIsGuest(false);
        setShowOnboarding(true);
      }
    }).catch(() => {
      // Not logged in — show onboarding with sign-up step
      setIsGuest(true);
      setShowOnboarding(true);
    });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {showOnboarding && <OnboardingModal onComplete={() => setShowOnboarding(false)} isGuest={isGuest} />}
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 animate-slide-in">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileNav onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}