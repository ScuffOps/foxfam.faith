import { z } from "zod";

export const BUG_STATUS_LABELS = {
  open: "Open",
  investigating: "Investigating",
  fixed: "Fixed",
  cannot_reproduce: "Cannot Reproduce",
  veri_broke_it_live: "Veri broke it live on stream",
};

export const BUG_REPORT_DESCRIPTION =
  "Found something broken on the Foxfam portal? Drop the details below so we can track it, fix it, and pretend this was all part of the lore. Screenshots help a ton.";

export const BUG_SEVERITY_LABELS = {
  low: "Tiny visual scuff",
  medium: "Annoying but usable",
  high: "Feature is broken",
  blocked: "Cannot use the portal",
  stream_fire: "The shrine is on fire",
};

export const bugReportSchema = z.object({
  display_name: z.string().trim().optional(),
  contact_handle: z.string().trim().optional(),
  title: z.string().trim().min(3, "Give the bug a short title."),
  area: z.string().trim().optional(),
  attempted_action: z.string().trim().optional(),
  description: z.string().trim().min(8, "Tell us what happened instead."),
  steps_to_reproduce: z.string().trim().optional(),
  expected_behavior: z.string().trim().optional(),
  severity: z.enum(["low", "medium", "high", "blocked", "stream_fire"]),
  device: z.string().trim().optional(),
  browser_name: z.string().trim().optional(),
  recurrence: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export function getClientBugMetadata() {
  if (typeof window === "undefined") {
    return {
      browser: "Unknown",
      os: "Unknown",
      screen_resolution: "Unknown",
      page_url: "",
      submitted_at: new Date().toISOString(),
    };
  }

  const nav = /** @type {Navigator & { userAgentData?: { platform?: string } }} */ (navigator);
  const userAgent = nav.userAgent || "Unknown browser";
  const platform = nav.userAgentData?.platform || nav.platform || "Unknown OS";
  const screen_resolution = `${window.screen?.width || 0}x${window.screen?.height || 0}`;

  return {
    browser: userAgent,
    os: platform,
    screen_resolution,
    page_url: window.location.href,
    submitted_at: new Date().toISOString(),
  };
}

export function formatFileSize(size = 0) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
