import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Users, Cake, MessageSquare, ArrowRight, Check } from "lucide-react";

const STEPS = [
  {
    icon: <img src="https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/e241ead03_TenkoTokenrerwork.png" alt="Foxfam" className="h-16 w-16 rounded-xl object-cover mx-auto" />,
    title: "Welcome to Foxfam.Faith! 🎉",
    description: "Your community hub for events, collabs, birthdays, and shared ideas. Let's get you set up in a few quick steps.",
  },
  {
    icon: <CalendarDays className="h-12 w-12 text-primary mx-auto" />,
    title: "Community Calendar",
    description: "Stay up to date with community events, collab availability slots, and more — all in one place.",
  },
  {
    icon: <Users className="h-12 w-12 mx-auto" style={{ color: "#3c5693" }} />,
    title: "Book Collabs",
    description: "See when slots are open and book a collab directly from the Calendar page. No DMs needed.",
  },
  {
    icon: <MessageSquare className="h-12 w-12 mx-auto" style={{ color: "#753243" }} />,
    title: "Share Ideas & Polls",
    description: "Submit ideas, feedback, or polls to the community. Upvote what you love — top ideas become events!",
  },
  {
    icon: <Cake className="h-12 w-12 mx-auto" style={{ color: "#755665" }} />,
    title: "Celebrate Birthdays",
    description: "Add your birthday so the community can celebrate with you. You can keep your year private.",
  },
];

export default function OnboardingModal({ onComplete }) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  const isNameStep = step === 1;
  const isLast = step === STEPS.length - 1;

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

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-md rounded-2xl p-8 animate-fade-in">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
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
          <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
        </div>

        {/* Name input on step 0 */}
        {step === 0 && (
          <div className="mb-6">
            <Label className="text-sm">What should we call you? (optional)</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name or username"
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
          <Button onClick={handleNext} disabled={saving} className="gap-2 ml-auto">
            {isLast ? (
              <><Check className="h-4 w-4" /> {saving ? "Setting up..." : "Let's go!"}</>
            ) : (
              <>Next <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}