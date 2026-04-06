import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Users, Cake, MessageSquare, ArrowRight, Check, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: <img src="https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/e241ead03_TenkoTokenrerwork.png" alt="Foxfam" className="h-16 w-16 rounded-xl object-cover mx-auto" />,
    title: "✦ EX RUINA, VERI SURGIT ✦",
    description: "Welcome to the Forsaken Faith.\n\nWelcome home, FoxFam ♡ ⊹˚.ˑ\n\nYour community hub for everything Scuffox; events, polls, suggestions, prayers, collabs, birthdays, and shared ideas. Let's get you set up in a few quick steps..",
  },
  {
    icon: <CalendarDays className="h-12 w-12 text-primary mx-auto" />,
    title: "Community Calendar",
    subtitle: "✦ IN NOMINE VERI ARDEMUS ✦",
    description: "Stay up to date with community events, collab availability slots, and more — all in one place.",
  },
  {
    icon: <Users className="h-12 w-12 mx-auto" style={{ color: "#3c5693" }} />,
    title: "Book Collabs",
    subtitle: "✦ FIDES NOS TENET ✦",
    description: "See when slots are open and book a collab directly from the Calendar page. No DMs needed.",
  },
  {
    icon: <MessageSquare className="h-12 w-12 mx-auto" style={{ color: "#753243" }} />,
    title: "Feedback & Polls",
    subtitle: "✦ IN LUMINE EIUS VIVIMUS ✦",
    description: "Submit ideas, feedback, or polls to the community & mod team. Upvote what you love — top ideas may become events!",
  },
  {
    icon: <Cake className="h-12 w-12 mx-auto" style={{ color: "#755665" }} />,
    title: "Celebrate Birthdays",
    subtitle: "✦ IN TENEBRIS, LUX MANET ✦",
    description: "Add your birthday so the community can celebrate with you. We, of course, are polite little Heathens and allow you to keep your age to yourself.",
  },
  {
    icon: <Sparkles className="h-12 w-12 mx-auto" style={{ color: "#7c5cbf" }} />,
    title: "Join the Faith",
    subtitle: "✦ EX RUINA, VERI SURGIT ✦",
    description: "Create your free account to post prayers, vote on ideas, submit birthdays, and become part of the Forsaken Faith community.",
    isSignUp: true,
  },
];

export default function OnboardingModal({ onComplete, isGuest = false }) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  const isNameStep = step === 1;
  const allSteps = isGuest ? STEPS : STEPS.filter((s) => !s.isSignUp);
  const isLast = step === allSteps.length - 1;
  const currentIsSignUp = isGuest && isLast;

  const handleNext = async () => {
    if (isLast) {
      setSaving(true);
      try {
        const updates = { onboarded: true };
        if (displayName.trim()) updates.display_name = displayName.trim();
        await base44.auth.updateMe(updates);
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
      <div className="glass-card w-full max-w-md rounded-2xl p-8 animate-fade-in">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {allSteps.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-primary" : i < step ? "w-2 bg-primary/50" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="mb-4">{current.icon}</div>
          <h2 className="font-heading text-xl font-bold mb-2">{current.title}</h2>
          {current.subtitle && (
            <p className="text-xs font-medium tracking-widest text-primary/70 mb-2">{current.subtitle}</p>
          )}
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{current.description}</p>
        </div>

        {/* Name input on step 0 */}
        {step === 0 && (
          <div className="mb-6">
            <Label className="text-sm">What shall we call you? (optional)</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nickname | Username"
              className="mt-1.5 bg-secondary"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back
            </button>
          ) : <div />}
          {currentIsSignUp ? (
            <Button onClick={() => base44.auth.redirectToLogin()} className="gap-2 ml-auto">
              <Sparkles className="h-4 w-4" /> Join the Faith
            </Button>
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
      </div>
    </div>
  );
}