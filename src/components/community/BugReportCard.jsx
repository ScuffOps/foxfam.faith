import { AlertTriangle, ExternalLink, Monitor, RadioTower } from "lucide-react";
import GlassCard from "../GlassCard";
import { BUG_SEVERITY_LABELS, BUG_STATUS_LABELS } from "@/lib/bugReport";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";

const statusClasses = {
  open: "bg-chart-4/15 text-chart-4",
  investigating: "bg-accent/15 text-accent",
  fixed: "bg-success/15 text-success",
  closed: "bg-muted/60 text-muted-foreground",
  cannot_reproduce: "bg-muted/60 text-muted-foreground",
  veri_broke_it_live: "bg-chart-5/15 text-chart-5",
};

export default function BugReportCard({ report, isAdmin = false, onRefresh }) {
  const screenshots = report.screenshots || [];
  const isClosed = ["closed", "fixed", "cannot_reproduce"].includes(report.status);

  const updateStatus = async (status) => {
    await communityClient.entities.BugReport.update(report.id, { status });
    onRefresh?.();
  };

  return (
    <GlassCard className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="dashboard-icon-well flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <h3 className="font-heading text-sm font-semibold">{report.title}</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{report.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClasses[report.status] || statusClasses.open}`}>
            {BUG_STATUS_LABELS[report.status] || "Open"}
          </span>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            {BUG_SEVERITY_LABELS[report.severity] || "Medium"}
          </span>
        </div>
      </div>

      {(report.area || report.attempted_action || report.steps_to_reproduce || report.expected_behavior || report.recurrence || report.device || report.browser_name || report.notes) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["Area", report.area],
            ["Trying to do", report.attempted_action],
            ["Expected", report.expected_behavior],
            ["Repeatability", report.recurrence],
            ["Steps", report.steps_to_reproduce],
            ["Device", report.device],
            ["Browser", report.browser_name],
            ["Notes", report.notes],
          ].filter(([, value]) => value).map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border/70 bg-secondary/30 p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
              <p className="text-xs leading-relaxed text-foreground">{value}</p>
            </div>
          ))}
        </div>
      )}

      {screenshots.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-3">
          {screenshots.map((file, index) => (
            <a
              key={`${file.url}-${index}`}
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="group relative overflow-hidden rounded-lg border border-border bg-secondary/40"
            >
              <img src={file.url} alt={file.name || "Bug screenshot"} className="h-28 w-full object-cover transition-transform group-hover:scale-105" />
              <span className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-foreground backdrop-blur">
                <ExternalLink className="h-3 w-3" />
              </span>
            </a>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/70 pt-3 text-[11px] text-muted-foreground">
        <span>by {report.submitted_by_name || "Guest"}</span>
        <span className="flex items-center gap-1"><Monitor className="h-3 w-3" /> {report.screen_resolution || "unknown screen"}</span>
        <span className="flex min-w-0 items-center gap-1"><RadioTower className="h-3 w-3" /> <span className="truncate">{report.os || "unknown OS"}</span></span>
        {isAdmin && (
          <span className="ml-auto flex flex-wrap gap-2">
            {!isClosed ? (
              <>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus("investigating")}>Investigating</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus("fixed")}>Mark fixed</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateStatus("closed")}>Close</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus("open")}>Reopen</Button>
            )}
          </span>
        )}
      </div>
    </GlassCard>
  );
}
