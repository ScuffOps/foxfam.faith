import { pathToFileURL } from "node:url";

export const KNOWN_LIVE_PROJECT_REF = "wdypokgdqgvqpyabvshq";

function requiredValue(environment, key) {
  const value = environment[key]?.trim();
  if (!value) throw new Error(`Game-hub preview requires ${key}.`);
  return value;
}

function projectRefFromUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("VITE_SUPABASE_URL must be a valid Supabase project URL.");
  }

  const match = parsed.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
  if (parsed.protocol !== "https:" || !match || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("VITE_SUPABASE_URL must exactly match https://<project-ref>.supabase.co.");
  }
  return match[1];
}

function isPrivilegedKey(value) {
  if (/^sb_secret_/i.test(value)) return true;
  const [, payload] = value.split(".");
  if (!payload) return false;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return ["service_role", "supabase_admin"].includes(claims.role);
  } catch {
    return false;
  }
}

export function validateGameHubPreviewConfig(environment = process.env) {
  if (requiredValue(environment, "VITE_GAME_HUB_STAGING") !== "1") {
    throw new Error("VITE_GAME_HUB_STAGING must equal 1 for this preview branch.");
  }

  const projectRef = projectRefFromUrl(requiredValue(environment, "VITE_SUPABASE_URL"));
  if (projectRef === KNOWN_LIVE_PROJECT_REF) {
    throw new Error("Game-hub preview refuses the live Foxfam Supabase project.");
  }

  const publishableKey = requiredValue(environment, "VITE_SUPABASE_PUBLISHABLE_KEY");
  if (isPrivilegedKey(publishableKey)) {
    throw new Error("Game-hub preview refuses privileged Supabase credentials.");
  }

  return Object.freeze({ projectRef });
}

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainModule()) {
  const config = validateGameHubPreviewConfig();
  console.log(`Game-hub preview configuration verified for isolated project ${config.projectRef}.`);
}
