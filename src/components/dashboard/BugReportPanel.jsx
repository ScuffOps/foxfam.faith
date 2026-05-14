import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Camera, Clipboard } from "lucide-react";
import GlassCard from "../GlassCard";

export default function BugReportPanel() {
  return (
    <GlassCard className="dashboard-bug-card flex h-full min-h-[15rem] flex-col justify-between overflow-hidden">
      <div className="dashboard-bug-glow" aria-hidden="true" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="dashboard-icon-well flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold">Bug Reports</h3>
            <p className="text-[11px] text-muted-foreground">screenshots welcome</p>
          </div>
        </div>
        <span className="rounded-full border border-destructive/20 bg-destructive/10 px-2 py-1 text-[10px] font-semibold uppercase text-destructive">
          Open
        </span>
      </div>

      <p className="my-6 max-w-[16rem] text-sm leading-relaxed text-foreground">
        Something broke? Drop the evidence, paste a screencap, and send it to the tracker.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] text-muted-foreground">
          <Camera className="mb-1 h-3.5 w-3.5 text-primary" /> drag & drop
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] text-muted-foreground">
          <Clipboard className="mb-1 h-3.5 w-3.5 text-primary" /> paste image
        </div>
      </div>

      <Link to="/bugs" className="dashboard-action-button mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90">
        Report a bug <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </GlassCard>
  );
}
