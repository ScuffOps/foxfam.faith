import { z } from "zod";

export const BUG_STATUS_LABELS = {
  open: "Open",
  investigating: "Investigating",
  fixed: "Fixed",
  cannot_reproduce: "Cannot Reproduce",
  veri_broke_it_live: "Veri broke it live on stream",
};

export const BUG_SEVERITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  stream_fire: "Stream Fire",
};

export const bugReportSchema = z.object({
  title: z.string().trim().min(3, "Give the bug a short title."),
  description: z.string().trim().min(8, "Tell us what happened."),
  steps_to_reproduce: z.string().trim().optional(),
  expected_behavior: z.string().trim().optional(),
  actual_behavior: z.string().trim().optional(),
  severity: z.enum(["low", "medium", "high", "stream_fire"]),
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
