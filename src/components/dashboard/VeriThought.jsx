import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import GlassCard from "../GlassCard";

const THOUGHTS_SOURCE = "/content/scuffox-thoughts.txt";
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

function cleanThoughtLine(line) {
  return line
    .trim()
    .replace(/^\d+\.\s*/, "")
    .trim();
}

function parseThoughts(text) {
  return text
    .split(/\r?\n/)
    .map(cleanThoughtLine)
    .filter(Boolean);
}

export default function VeriThought() {
  const [thought, setThought] = useState("");
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchThought = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setRevealed(false);

    try {
      const response = await fetch(`${THOUGHTS_SOURCE}?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Thought source unavailable");
      const pool = parseThoughts(await response.text());
      if (pool.length === 0) throw new Error("Thought source is empty");
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setThought(pick);
      setTimeout(() => setRevealed(true), 50);
    } catch {
      setThought("Blessed are the souls that soften without surrendering.");
      setTimeout(() => setRevealed(true), 50);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThought();
    const refreshTimer = window.setInterval(fetchThought, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(refreshTimer);
  }, [fetchThought]);

  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="dashboard-icon-well flex h-8 w-8 items-center justify-center rounded-lg bg-chart-5/15 text-chart-5">
            <Sparkles className="h-4 w-4 text-chart-5" />
          </div>
          <h3 className="font-heading text-sm font-semibold">Scuffox Thoughts</h3>
        </div>
        <button
          onClick={fetchThought}
          disabled={loading}
          className="dashboard-action-button rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-primary/15 hover:text-primary disabled:opacity-40"
        >
          {loading ? "listening..." : "refresh ✦"}
        </button>
      </div>

      {thought ? (
        <div
          className={`rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 transition-all duration-500 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
        >
          <p className="text-sm leading-relaxed text-foreground">
            {thought}
          </p>
        </div>
      ) : (
        <div className="dashboard-empty flex items-center justify-center rounded-lg py-6">
          <p className="text-xs text-muted-foreground">loading a Scuffox thought...</p>
        </div>
      )}
    </GlassCard>
  );
}
