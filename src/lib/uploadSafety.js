export const MAX_COMMUNITY_FILE_SIZE = 25 * 1024 * 1024;

const DANGEROUS_UPLOAD_EXTENSIONS = new Set([
  "aab", "apk", "app", "appimage", "appx", "appxbundle", "bat", "bin", "cmd", "com",
  "command", "deb", "dll", "dmg", "drv", "exe", "flatpak", "flatpakref", "flatpakrepo",
  "ipa", "iso", "jar", "js", "jse", "lnk", "macho", "mpkg", "msi", "msix", "msixbundle",
  "msp", "pkg", "pif", "ps1", "psm1", "reg", "rpm", "run", "scf", "scr", "sh", "snap",
  "so", "sys", "url", "vbe", "vbs", "vhd", "vhdx", "wsf", "wsh", "zsh",
]);

const DANGEROUS_UPLOAD_MIME_TYPES = new Set([
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

export function getUploadValidationError(file, { maxBytes = MAX_COMMUNITY_FILE_SIZE } = {}) {
  const fileName = String(file?.name || "").trim();
  const mimeType = String(file?.type || "").trim().toLowerCase();
  const extension = fileName.includes(".") ? fileName.split(".").pop().toLowerCase() : "";

  if (!fileName) return "Choose a file to upload.";
  if (DANGEROUS_UPLOAD_EXTENSIONS.has(extension) || DANGEROUS_UPLOAD_MIME_TYPES.has(mimeType)) {
    return "Installers, executables, and script files cannot be uploaded for community safety.";
  }
  if (file.size > maxBytes) {
    return `Please keep each file under ${Math.round(maxBytes / (1024 * 1024))} MB.`;
  }
  return "";
}

export function formatUploadSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
