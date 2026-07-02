import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "foxfam.foundersCache.v1";

function loadReserved() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "reserved";
}

export default function FoundersCache() {
  const [reserved, setReserved] = useState(loadReserved);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reserved) window.localStorage.setItem(STORAGE_KEY, "reserved");
  }, [reserved]);

  return (
    <section className="foxcard relative h-full overflow-hidden rounded-xl p-5">
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-violet-400/15 blur-2xl" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-200/25 bg-amber-300/15 text-amber-100">
            <Gift className="h-5 w-5" />
          </span>
          <Badge variant="outline" className="border-amber-200/35 bg-amber-300/10 text-amber-100">
            locked preview
          </Badge>
        </div>
        <div className="mt-4">
          <p className="dashboard-candle text-xs font-semibold uppercase tracking-widest text-amber-100/75">favor exchange</p>
          <h2 className="font-heading text-lg font-bold text-foreground">Founder&apos;s Cache</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A future Favor sink for early portal regulars. Faith can come from MIU/Twitch first, then convert into portal Favor when the loop is ready.
          </p>
        </div>

        <div className="mt-4 space-y-2 rounded-xl border border-border bg-slate-950/30 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Exchange status</span>
            <span className="inline-flex items-center gap-1 font-semibold text-amber-100"><LockKeyhole className="h-3.5 w-3.5" /> Sealed</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Launch reward</span>
            <span className="font-semibold text-cyan-100">Founding Flame</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Profile-ready</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-100"><ShieldCheck className="h-3.5 w-3.5" /> Yes</span>
          </div>
        </div>

        <div className="mt-auto pt-4">
          <Button type="button" variant={reserved ? "outline" : "default"} className="w-full gap-2" onClick={() => setReserved(true)} disabled={reserved}>
            <Sparkles className="h-4 w-4" />
            {reserved ? "Interest Reserved" : "Reserve Interest"}
          </Button>
          <Link to="/profile" className="mt-3 block text-center text-xs font-semibold text-primary hover:text-primary/80">
            Polish profile before launch
          </Link>
        </div>
      </div>
    </section>
  );
}
