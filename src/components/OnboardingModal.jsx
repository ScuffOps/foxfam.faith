import { useState } from "react";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Users, Cake, MessageSquare, ArrowRight, Check, LogIn, Sparkles, X } from "lucide-react";

const STEPS = [
  {
    icon: <img src="/assets/legacy-media/e241ead03_TenkoTokenrerwork.png" alt="Foxfam" className="h-16 w-16 rounded-xl object-cover mx-auto" />,
    title: "✦ EX RUINA, VERI SURGIT ✦",
    translation: "From ruin, Veri rises.",
    description: "Welcome to the Forsaken Faith.\n\nWelcome home, FoxFam 🕯 ⊹˚.ˑ\n\nYour community hub for everything Scuffox; events, polls, suggestions, prayers, collabs, birthdays, and shared ideas. Let's get you set up in a few quick steps..",
  },
  {
    icon: <CalendarDays className="h-12 w-12 text-primary mx-auto" />,
    title: "Community Calendar",
    subtitle: "✦ IN NOMINE VERI ARDEMUS ✦",
    translation: "In Veri's name, we burn.",
    description: "Stay up to date with community events, collab availability slots, and more — all in one place.",
  },
  {
    icon: <Users className="h-12 w-12 mx-auto" style={{ color: "#3c5693" }} />,
    title: "Book Collabs",
    subtitle: "✦ FIDES NOS TENET ✦",
    translation: "Faith holds us.",
    description: "See when slots are open and book a collab directly from the Calendar page. No DMs needed.",
  },
  {
    icon: <MessageSquare className="h-12 w-12 mx-auto" style={{ color: "#753243" }} />,
    title: "Feedback & Polls",
    pointsHint: "Posting earns 5 points, poll votes earn 2, and Give Praise earns 1 toward your next rank.",
    subtitle: "✦ IN LUMINE EIUS VIVIMUS ✦",
    translation: "In her light, we live.",
    description: "Submit ideas, feedback, or polls to the community & mod team. Give Praise to what you love — top ideas may become events!",
  },
  {
    icon: <Cake className="h-12 w-12 mx-auto" style={{ color: "#755665" }} />,
    title: "Celebrate Birthdays",
    subtitle: "✦ IN TENEBRIS, LUX MANET ✦",
    translation: "In darkness, light remains.",
    description: "Add your birthday so the community can celebrate with you. We, of course, are polite little Heathens and allow you to keep your age to yourself.",
  },
  {
    icon: <Sparkles className="h-12 w-12 mx-auto" style={{ color: "#7c5cbf" }} />,
    title: "Join the Faith",
    pointsHint: "Create an account to earn points, climb ranks, and show up on the leaderboard.",
    subtitle: "✦ EX RUINA, VERI SURGIT ✦",
    translation: "From ruin, Veri rises.",
    description: "Create your free account to post prayers, vote on ideas, submit birthdays, and become part of the Forsaken Faith community.",
    isSignUp: true,
  },
];

export default function OnboardingModal({ onComplete, onGuestContinue, isGuest = false }) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  const allSteps = isGuest ? STEPS : STEPS.filter((s) => !s.isSignUp);
  const isLast = step === allSteps.length - 1;
  const currentIsSignUp = isGuest && isLast;

  const handleSkip = () => {
    if (onGuestContinue) onGuestContinue();
    else onComplete();
  };

  const handleLogin = () => {
    communityClient.auth.redirectToLogin();
  };

  const handleNext = async () => {
    if (isLast) {
      setSaving(true);
      try {
        const updates = { onboarded: true };
        if (displayName.trim()) updates.display_name = displayName.trim();
        await communityClient.auth.updateMe(updates);
      } catch {}
      setSaving(false);
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const current = allSteps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-card relative flex h-[min(620px,calc(100vh-2rem))] w-full max-w-md flex-col rounded-2xl p-8 animate-fade-in">
        <button
          type="button"
          onClick={handleSkip}
          aria-label="Skip onboarding"
          className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress dots */}
        <div className="mb-8 flex shrink-0 justify-center gap-2">
          {allSteps.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-primary" : i < step ? "w-2 bg-primary/50" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {/* Content */}
          <div className="text-center">
            <div className="mb-4">{current.icon}</div>
            <h2 className="font-heading text-xl font-bold mb-2">{current.title}</h2>
            {current.subtitle && (
              <p className="text-xs font-medium tracking-widest text-primary/70 mb-2">{current.subtitle}</p>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{current.description}</p>
            {current.pointsHint && (
              <p className="mt-3 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                {current.pointsHint}
              </p>
            )}
          </div>

          {/* Name input on step 0 */}
          {step === 0 && (
            <div className="mt-6">
              <Label className="text-sm">What shall we call you? (optional)</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nickname | Username"
                className="mt-1.5 bg-secondary"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 shrink-0">
          <div className="flex min-h-9 items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back
                </button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={handleSkip}>
                Skip
              </Button>
            </div>
            {currentIsSignUp ? (
              <div className="ml-auto flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={handleLogin} className="gap-2">
                  <LogIn className="h-4 w-4" /> Login
                </Button>
                <Button onClick={handleLogin} className="gap-2">
                  <Sparkles className="h-4 w-4" /> Join
                </Button>
              </div>
            ) : (
              <Button onClick={handleNext} disabled={saving} className="gap-2 ml-auto">
                {isLast ? (
                  <><Check className="h-4 w-4" /> {saving ? "Setting up..." : "Let the Chaos commence!"}</>
                ) : (
                  <>Next <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            )}
          </div>
          {current.translation && (
            <p className="mt-3 text-center text-[11px] font-medium italic leading-snug text-muted-foreground/85">
              {current.translation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
