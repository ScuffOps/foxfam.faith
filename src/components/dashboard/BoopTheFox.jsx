import { useState, useRef } from "react";
import { toast } from "@/components/ui/use-toast";

const BOOP_REACTIONS = [
  "👃 *boop'd* ✨",
  "😤 hey!! that's my snoot",
  "🦊 *wiggle wiggle*",
  "nyaaa~ >///<",
  "😳 w-what are you doing...",
  "🐾 *happy fox noises*",
  "you booped the fox!! achievement unlocked 🏆",
  "🔴🔴🔴 BOOP DETECTED 🔴🔴🔴",
  "*spins tail excitedly*",
  "oH NO THE BOOPING HAS BEGUN",
];

const SNOOT_TIPS = [
  "pssst... try clicking my tail",
  "did you find the secret yet?",
  "more boop = more power",
];

export default function BoopTheFox() {
  const [boopCount, setBoopCount] = useState(0);
  const [bouncing, setBouncing] = useState(false);
  const [spinTail, setSpinTail] = useState(false);
  const [eyeOpen, setEyeOpen] = useState(true);
  const blinkTimer = useRef(null);

  const handleBoop = () => {
    const newCount = boopCount + 1;
    setBoopCount(newCount);
    setBouncing(true);
    setTimeout(() => setBouncing(false), 400);

    // Blink on boop
    setEyeOpen(false);
    setTimeout(() => setEyeOpen(true), 200);

    const reaction = BOOP_REACTIONS[newCount % BOOP_REACTIONS.length];
    toast({ title: reaction, duration: 2000 });

    // Milestone toasts
    if (newCount === 5) toast({ title: "🦊 5 boops! You really like this huh", duration: 3000 });
    if (newCount === 10) toast({ title: "💀 TEN BOOPS. my snoot is sore", duration: 3000 });
    if (newCount === 25) toast({ title: "🌟 you have achieved TRUE FOX FRIENDSHIP (25 boops)", duration: 4000 });
  };

  const handleTailClick = () => {
    setSpinTail(true);
    setTimeout(() => setSpinTail(false), 800);
    const tip = SNOOT_TIPS[Math.floor(Math.random() * SNOOT_TIPS.length)];
    toast({ title: `🦊 ${tip}`, duration: 2500 });
  };

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {/* Fox SVG */}
      <div
        className={`relative cursor-pointer select-none transition-transform duration-200 ${bouncing ? "scale-110 -translate-y-1" : "scale-100"}`}
        style={{ filter: bouncing ? "drop-shadow(0 0 12px rgba(255,140,0,0.7))" : "drop-shadow(0 4px 8px rgba(0,0,0,0.4))" }}
        onClick={handleBoop}
        title="boop the fox"
      >
        <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* Ears */}
          <polygon points="15,45 25,10 38,40" fill="#e8621a" />
          <polygon points="62,40 75,10 85,45" fill="#e8621a" />
          <polygon points="18,43 26,18 36,40" fill="#f5a54a" />
          <polygon points="64,40 74,18 82,43" fill="#f5a54a" />
          {/* Head */}
          <ellipse cx="50" cy="55" rx="32" ry="30" fill="#e8621a" />
          {/* Face white patch */}
          <ellipse cx="50" cy="63" rx="20" ry="18" fill="#f5dfc0" />
          {/* Eyes */}
          {eyeOpen ? (
            <>
              <ellipse cx="38" cy="50" rx="5" ry="5.5" fill="#1a1a2e" />
              <ellipse cx="62" cy="50" rx="5" ry="5.5" fill="#1a1a2e" />
              <circle cx="40" cy="48" r="1.5" fill="white" />
              <circle cx="64" cy="48" r="1.5" fill="white" />
            </>
          ) : (
            <>
              <path d="M33 50 Q38 46 43 50" stroke="#1a1a2e" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M57 50 Q62 46 67 50" stroke="#1a1a2e" strokeWidth="2" fill="none" strokeLinecap="round" />
            </>
          )}
          {/* Nose */}
          <ellipse cx="50" cy="62" rx="4" ry="3" fill="#c94a10" />
          {/* Mouth */}
          <path d="M46 65 Q50 69 54 65" stroke="#c94a10" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Blush */}
          {boopCount > 0 && (
            <>
              <ellipse cx="32" cy="60" rx="6" ry="3" fill="#ff6b6b" opacity="0.35" />
              <ellipse cx="68" cy="60" rx="6" ry="3" fill="#ff6b6b" opacity="0.35" />
            </>
          )}
        </svg>

        {/* Tail — clickable */}
        <div
          className={`absolute -right-5 -bottom-3 cursor-pointer text-3xl transition-transform ${spinTail ? "rotate-[360deg] duration-700" : "duration-200 hover:rotate-12"}`}
          onClick={(e) => { e.stopPropagation(); handleTailClick(); }}
          title="click my tail!"
        >
          🦊
        </div>

        {/* Boop counter badge */}
        {boopCount > 0 && (
          <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow-lg">
            {boopCount > 99 ? "99+" : boopCount}
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="font-heading text-xs font-semibold text-foreground">Veri</p>
        <p className="text-[10px] text-muted-foreground">
          {boopCount === 0 ? "tap to boop the fox ♡" : boopCount < 5 ? "hehe~ keep going" : boopCount < 10 ? "stop it 😳" : "you cannot stop"}
        </p>
      </div>
    </div>
  );
}