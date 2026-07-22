import { z } from "zod";

export const OFFERING_STATUS = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
};

export const OFFERING_KIND_OPTIONS = [
  { value: "fanart", label: "Fanart" },
  { value: "song", label: "Song" },
  { value: "poetry", label: "Poetry" },
  { value: "story", label: "Story" },
  { value: "edit", label: "Edit" },
  { value: "other", label: "Other" },
];

const OFFERING_KINDS = new Set(OFFERING_KIND_OPTIONS.map((option) => option.value));
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DANGEROUS_OFFERING_EXTENSIONS = new Set([
  "aab", "apk", "app", "appimage", "appx", "appxbundle", "bat", "bin", "cmd", "com",
  "command", "deb", "dll", "dmg", "drv", "exe", "flatpak", "flatpakref", "flatpakrepo",
  "ipa", "iso", "jar", "js", "jse", "lnk", "macho", "mpkg", "msi", "msix", "msixbundle",
  "msp", "pkg", "pif", "ps1", "psm1", "reg", "rpm", "run", "scf", "scr", "sh", "snap",
  "so", "sys", "url", "vbe", "vbs", "vhd", "vhdx", "wsf", "wsh", "zsh",
]);

const DANGEROUS_OFFERING_MIME_TYPES = new Set([
  "application/java-archive",
  "application/vnd.android.package-archive",
  "application/vnd.microsoft.portable-executable",
  "application/x-apple-diskimage",
  "application/x-bat",
  "application/x-dosexec",
  "application/x-executable",
  "application/x-msdownload",
  "application/x-msi",
  "application/x-sh",
  "application/x-shellscript",
]);

export function getOfferingFileValidationError(file) {
  const fileName = String(file?.name || "").trim();
  const mimeType = String(file?.type || "").trim().toLowerCase();
  const extension = fileName.includes(".") ? fileName.split(".").pop().toLowerCase() : "";

  if (!fileName) return "Choose a file to upload.";
  if (DANGEROUS_OFFERING_EXTENSIONS.has(extension) || DANGEROUS_OFFERING_MIME_TYPES.has(mimeType)) {
    return "Installers, executables, and script files cannot be uploaded for community safety.";
  }
  return "";
}

export const offeringSchema = z
  .object({
    title: z.string().trim().min(2, "Title is required").max(120),
    kind: z.string().trim(),
    creatorName: z.string().trim().max(80).optional(),
    description: z.string().trim().max(5000).optional(),
    fileUrl: z.string().trim().url().optional().or(z.literal("")),
    fileName: z.string().trim().max(180).optional(),
    fileType: z.string().trim().max(120).optional(),
    externalUrl: z.string().trim().url().optional().or(z.literal("")),
  })
  .refine((value) => OFFERING_KINDS.has(value.kind), {
    message: "Choose a valid offering type",
    path: ["kind"],
  })
  .refine((value) => Boolean(value.description || value.fileUrl || value.externalUrl), {
    message: "Add a file, link, or note for the offering",
    path: ["description"],
  });

export function normalizeOfferingCreatorName(value, fallback = "Guest") {
  const cleaned = String(value || "").trim();
  if (!cleaned || EMAIL_PATTERN.test(cleaned)) return fallback;
  return cleaned;
}

export function buildOfferingPayload(input) {
  const parsed = offeringSchema.parse(input);
  return {
    title: parsed.title,
    kind: parsed.kind,
    creator_name: normalizeOfferingCreatorName(parsed.creatorName),
    description: parsed.description || "",
    file_url: parsed.fileUrl || "",
    file_name: parsed.fileName || "",
    file_type: parsed.fileType || "",
    external_url: parsed.externalUrl || "",
    status: OFFERING_STATUS.pending,
    featured: false,
    praise_count: 0,
  };
}

function compareOfferingDates(a, b) {
  return new Date(b.created_date || 0) - new Date(a.created_date || 0);
}

export function sortOfferings(offerings = []) {
  return [...offerings].sort((a, b) => {
    if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
    return compareOfferingDates(a, b);
  });
}

export function getPublicOfferings(offerings = []) {
  return sortOfferings(offerings.filter((offering) => offering.status === OFFERING_STATUS.approved));
}

export function getVisibleOfferings(offerings = [], canModerate = false) {
  return canModerate ? sortOfferings(offerings) : getPublicOfferings(offerings);
}
