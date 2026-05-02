import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles } from "lucide-react";
import GlassCard from "../GlassCard";

const FALLBACK_THOUGHTS = [
  { text: "Every stream is a chance to make someone's day a little brighter. 🦊✨", mood: "wholesome" },
  { text: "The foxes who dare to dream weird dreams dream the best streams.", mood: "wise" },
  { text: "Chaos is just order that hasn't introduced itself yet.", mood: "chaotic" },
  { text: "You ever just think about how wild it is that we're all here together? Like, the odds??", mood: "wholesome" },
  { text: "I don't have a plan. I have vibes and determination.", mood: "chaotic" },
  { text: "the void looked back. it was also a fox 🦊", mood: "spooky" },
  { text: "LET'S GOOOOO FOXFAM WE ARE SO BACK 🔥🔥🔥", mood: "hype" },
  { text: "Sometimes the real treasure was the frens we made along the way.", mood: "wholesome" },
  { text: "I'm not chaotic, you're just not used to maximum fox energy.", mood: "chaotic" },
  { text: "Sleep is a myth. Streams are eternal.", mood: "spooky" },
];

const MOOD_STYLES = {
  wise: { bg: "bg-primary/10", border: "border-primary/30", icon: "🧠", color: "text-primary" },
  chaotic: { bg: "bg-chart-5/10", border: "border-chart-5/30", icon: "💥", color: "text-chart-5" },
  wholesome: { bg: "bg-success/10", border: "border-success/30", icon: "💛", color: "text-success" },
  spooky: { bg: "bg-muted/30", border: "border-border", icon: "👻", color: "text-muted-foreground" },
  hype: { bg: "bg-chart-4/10", border: "border-chart-4/30", icon: "🔥", color: "text-chart-4" },
};

export default function VeriThought() {
  const [thought, setThought] = useState(null);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const fetchThought = async () => {
    if (loading) return;
    setLoading(true);
    setRevealed(false);

    try {
      const all = await base44.entities.Thought.list();
      const pool = all.length > 0 ? all : FALLBACK_THOUGHTS;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setThought(pick);
      setTimeout(() => setRevealed(true), 50);
    } catch {
      const pick = FALLBACK_THOUGHTS[Math.floor(Math.random() * FALLBACK_THOUGHTS.length)];
      setThought(pick);
      setTimeout(() => setRevealed(true), 50);
    }
    setLoading(false);
  };

  const style = thought ? (MOOD_STYLES[thought.mood] || MOOD_STYLES.wise) : null;

  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-5/15">
            <Sparkles className="h-4 w-4 text-chart-5" />
          </div>
          <h3 className="font-heading text-sm font-semibold">Veri Thoughts</h3>
        </div>
        <button
          onClick={fetchThought}
          disabled={loading}
          className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-primary/15 hover:text-primary disabled:opacity-40"
        >
          {loading ? "thinking..." : thought ? "another one ✦" : "ask veri ✦"}
        </button>
      </div>

      {thought ? (
        <div
          className={`rounded-lg border px-4 py-3 transition-all duration-500 ${style.bg} ${style.border} ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
        >
          <p className="text-sm leading-relaxed text-foreground">
            <span className="mr-1.5">{style.icon}</span>
            {thought.text}
          </p>
          <p className={`mt-1.5 text-[10px] font-semibold uppercase tracking-wider ${style.color} opacity-70`}>
            {thought.mood} mode
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-6">
          <p className="text-xs text-muted-foreground">click "ask veri" for a random thought 🦊</p>
        </div>
      )}
    </GlassCard>
  );
}
