import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;

const UPLOAD_BUCKET = import.meta.env.VITE_SUPABASE_UPLOAD_BUCKET || "community-uploads";
const DEFAULT_AUTH_REDIRECT_PATH = "/settings";
export const LOGIN_EVENT_NAME = "foxfam:open-login";
const PUBLIC_ROW_SELECT = "id,data,created_at,updated_at";
const PUBLIC_PROFILE_SELECT =
  "id,role,display_name,avatar_url,accent_color,notification_preferences,onboarded,created_at,updated_at";
const AUTO_PROFILE_NAMES = new Set(["guest", "guest fox", "foxfam member"]);

const ENTITY_TABLES = {
  Birthday: "birthdays",
  Blessing: "blessings",
  BlessingComment: "blessing_comments",
  BugReport: "bug_reports",
  Codex: "codex_entries",
  CollabRequest: "collab_requests",
  CommunityPost: "community_posts",
  CommunityPostComment: "community_post_comments",
  CommunityThread: "community_threads",
  CommunityThreadComment: "community_thread_comments",
  Event: "events",
  Offering: "offerings",
  Prayer: "prayers",
  ReliquaryComment: "reliquary_comments",
  ReliquaryEntry: "reliquary_entries",
  ScuffoxUpdate: "scuffox_updates",
  ShiftPlannerAssignment: "shift_planner_assignments",
  Medication: "medications",
  MedDose: "medication_doses",
  ModShift: "mod_shifts",
  BotCommand: "bot_commands",
  Suggestion: "suggestions",
  StaffAvailability: "staff_availabilities",
  StaffTask: "staff_tasks",
  StaffTimeEntry: "staff_time_entries",
  StreamLog: "stream_logs",
  SyncState: "sync_states",
  Thought: "thoughts",
  UserLevel: "user_levels",
  UserNotification: "user_notifications",
  UserRelic: "user_relics",
  UserRelicCharm: "user_relic_charms",
};

const RESERVED_ROW_KEYS = new Set([
  "id",
  "user_id",
  "created_by",
  "created_at",
  "updated_at",
  "created_date",
  "updated_date",
  "data",
]);

function getClient() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.",
    );
  }
  return supabase;
}

function getTable(entityName) {
  const table = ENTITY_TABLES[entityName];
  if (!table) throw new Error(`Unknown entity: ${entityName}`);
  return table;
}

function getAuthRedirectUrl(path = DEFAULT_AUTH_REDIRECT_PATH) {
  if (typeof window === "undefined") return undefined;
  if (!path) return window.location.origin;
  if (/^https?:\/\//i.test(path)) return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function dataOnly(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => !RESERVED_ROW_KEYS.has(key)),
  );
}

function normalizeRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    created_date: row.created_at,
    updated_date: row.updated_at,
    ...(row.data || {}),
  };
}

function normalizeProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email || "",
    created_date: row.created_at,
    updated_date: row.updated_at,
    role: row.role || "user",
    display_name: row.display_name || "Guest",
    avatar_url: row.avatar_url || "",
    accent_color: row.accent_color || "",
    notification_preferences: row.notification_preferences || {},
    onboarded: row.onboarded ?? false,
  };
}

function cleanPublicText(value) {
  return String(value || "").trim();
}

function isEmailLike(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanPublicText(value));
}

function readIdentityValue(identity, key) {
  const identityData = identity?.identity_data || {};
  return identityData[key] || identityData.custom_claims?.[key] || "";
}

function getAuthMetadataValues(user, keys) {
  const metadata = user?.user_metadata || {};
  const identityValues = (user?.identities || [])
    .flatMap((identity) => keys.map((key) => readIdentityValue(identity, key)));

  return [...keys.map((key) => metadata[key]), ...identityValues];
}

function getAuthDisplayName(user) {
  const displayName = getAuthMetadataValues(user, [
    "display_name",
    "full_name",
    "global_name",
    "name",
    "preferred_username",
    "user_name",
    "username",
  ]).find((value) => {
    const cleaned = cleanPublicText(value);
    return cleaned && !isEmailLike(cleaned);
  });

  return cleanPublicText(displayName);
}

function getAuthAvatarUrl(user) {
  return cleanPublicText(
    getAuthMetadataValues(user, ["avatar_url", "picture"]).find(cleanPublicText),
  );
}

function shouldRepairProfileName(profile) {
  const currentName = cleanPublicText(profile?.display_name).toLowerCase();
  if (!currentName) return true;
  if (currentName === "foxfam member" || currentName === "guest fox") return true;
  return !profile?.onboarded && AUTO_PROFILE_NAMES.has(currentName);
}

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  const aDate = typeof a === "string" ? Date.parse(a) : Number.NaN;
  const bDate = typeof b === "string" ? Date.parse(b) : Number.NaN;
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return aDate - bDate;

  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function sortRows(rows, orderBy = "-created_date") {
  if (!orderBy) return rows;
  const descending = orderBy.startsWith("-");
  const field = descending ? orderBy.slice(1) : orderBy;
  return [...rows].sort((a, b) => {
    const result = compareValues(a[field], b[field]);
    return descending ? -result : result;
  });
}

function matchesFilter(row, filters = {}) {
  return Object.entries(filters).every(([key, expected]) => {
    const actual = row[key];
    if (Array.isArray(expected)) return expected.includes(actual);
    return actual === expected;
  });
}

async function getCurrentSessionUser() {
  const client = getClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) {
    const authError = new Error("Authentication required");
    authError.status = 401;
    throw authError;
  }
  return data.user;
}

async function ensureProfile(user) {
  const client = getClient();
  const fallbackName = getAuthDisplayName(user) || "Foxfam Member";
  const fallbackAvatar = getAuthAvatarUrl(user);

  const existing = await client.from("profiles").select(PUBLIC_PROFILE_SELECT).eq("id", user.id).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    const profile = normalizeProfile(existing.data);
    const repairUpdates = {};
    if (fallbackName && shouldRepairProfileName(profile)) {
      repairUpdates.display_name = fallbackName;
    }
    if (fallbackAvatar && !profile.avatar_url) {
      repairUpdates.avatar_url = fallbackAvatar;
    }

    if (Object.keys(repairUpdates).length > 0) {
      const { data: updatedProfile, error: updateError } = await client
        .from("profiles")
        .update(repairUpdates)
        .eq("id", user.id)
        .select(PUBLIC_PROFILE_SELECT)
        .single();
      if (!updateError && updatedProfile) {
        return { ...normalizeProfile(updatedProfile), email: user.email || "" };
      }
      return { ...profile, ...repairUpdates, email: user.email || "" };
    }

    return { ...profile, email: user.email || "" };
  }

  const { data, error } = await client
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email,
      display_name: fallbackName,
    })
    .select(PUBLIC_PROFILE_SELECT)
    .single();
  if (error) throw error;
  return { ...normalizeProfile(data), email: user.email || "" };
}

function createEntityApi(entityName) {
  const table = getTable(entityName);

  return {
    async list(orderBy = "-created_date", limit = 1000) {
      const client = getClient();
      const { data, error } = await client.from(table).select(PUBLIC_ROW_SELECT).limit(1000);
      if (error) throw error;
      return sortRows((data || []).map(normalizeRow), orderBy).slice(0, limit);
    },

    async filter(filters = {}, orderBy = "-created_date", limit = 1000) {
      const rows = await this.list(orderBy, 1000);
      return rows.filter((row) => matchesFilter(row, filters)).slice(0, limit);
    },

    async get(id) {
      const client = getClient();
      const { data, error } = await client.from(table).select(PUBLIC_ROW_SELECT).eq("id", id).single();
      if (error) throw error;
      return normalizeRow(data);
    },

    async create(payload = {}) {
      const client = getClient();
      const { data: authData } = await client.auth.getUser();
      const user = authData?.user;
      const { data, error } = await client
        .from(table)
        .insert({
          user_id: user?.id || null,
          created_by: null,
          data: dataOnly(payload),
        })
        .select(PUBLIC_ROW_SELECT)
        .single();
      if (error) throw error;
      return normalizeRow(data);
    },

    async update(id, payload = {}) {
      const client = getClient();
      const current = await this.get(id);
      const { data, error } = await client
        .from(table)
        .update({ data: { ...dataOnly(current), ...dataOnly(payload) } })
        .eq("id", id)
        .select(PUBLIC_ROW_SELECT)
        .single();
      if (error) throw error;
      return normalizeRow(data);
    },

    async delete(id) {
      const client = getClient();
      const { error } = await client.from(table).delete().eq("id", id);
      if (error) throw error;
      return true;
    },
  };
}

const userEntity = {
  async list() {
    const client = getClient();
    const { data, error } = await client.from("profiles").select(PUBLIC_PROFILE_SELECT).order("display_name");
    if (error) throw error;
    return (data || []).map(normalizeProfile);
  },

  async filter(filters = {}) {
    const users = await this.list();
    return users.filter((user) => matchesFilter(user, filters));
  },

  async update(id, payload = {}) {
    const client = getClient();
    const displayName = payload.display_name;
    if (Object.keys(dataOnly(payload)).length !== 1 || typeof displayName !== "string") {
      throw new Error("Only display names can be changed from this screen.");
    }
    const { data, error } = await client.rpc("set_profile_display_name", {
      target_profile_id: id,
      new_display_name: displayName,
    });
    if (error) throw error;
    return normalizeProfile(Array.isArray(data) ? data[0] : data);
  },

  async setRole(id, role, reason = "") {
    const client = getClient();
    const { data, error } = await client
      .rpc("set_profile_role", {
        target_profile_id: id,
        new_role: role,
        reason: reason || null,
      })
      .single();
    if (error) throw error;
    return normalizeProfile(data);
  },
};


const notificationApi = {
  async markRead(ids = []) {
    const notificationIds = [...new Set(ids.filter(Boolean))];
    if (notificationIds.length === 0) return true;

    const client = getClient();
    await getCurrentSessionUser();
    const { error } = await client.rpc("mark_user_notifications_read", { notification_ids: notificationIds });
    if (error) throw error;
    return true;
  },
};

const communityInteractionApi = {
  async toggleCommentUpvote(commentId, actorKey) {
    const client = getClient();
    const { data, error } = await client.rpc("toggle_community_comment_upvote", {
      comment_id: commentId,
      actor_key: actorKey,
    });
    if (error) throw error;
    return normalizeRow(Array.isArray(data) ? data[0] : data);
  },
};

const entities = Object.fromEntries(
  Object.keys(ENTITY_TABLES).map((entityName) => [entityName, createEntityApi(entityName)]),
);
entities.User = userEntity;

export const communityClient = {
  auth: {
    async me() {
      const user = await getCurrentSessionUser();
      return ensureProfile(user);
    },

    async getSession() {
      const client = getClient();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data?.session || null;
    },

    async updateMe(updates = {}) {
      const client = getClient();
      const user = await getCurrentSessionUser();
      const { data, error } = await client
        .from("profiles")
        .update(dataOnly(updates))
        .eq("id", user.id)
        .select(PUBLIC_PROFILE_SELECT)
        .single();
      if (error) throw error;
      return { ...normalizeProfile(data), email: user.email || "" };
    },

    async updateEmail(email) {
      const client = getClient();
      await getCurrentSessionUser();
      const cleanedEmail = String(email || "").trim();
      if (!cleanedEmail) throw new Error("Enter an email address.");
      const { data, error } = await client.auth.updateUser(
        { email: cleanedEmail },
        { emailRedirectTo: getAuthRedirectUrl("/settings") },
      );
      if (error) throw error;
      return data;
    },

    async signInWithEmailPassword(email, password) {
      const client = getClient();
      const cleanedEmail = String(email || "").trim();
      if (!cleanedEmail) throw new Error("Enter an email address.");
      if (!password) throw new Error("Enter your password.");
      const { error } = await client.auth.signInWithPassword({
        email: cleanedEmail,
        password,
      });
      if (error) throw error;
      return true;
    },

    async signUpWithEmailPassword({ email, password, displayName = "" } = {}) {
      const client = getClient();
      const cleanedEmail = String(email || "").trim();
      const cleanedDisplayName = String(displayName || "").trim();
      if (!cleanedEmail) throw new Error("Enter an email address.");
      if (!password || password.length < 6) throw new Error("Use a password with at least 6 characters.");
      const { data, error } = await client.auth.signUp({
        email: cleanedEmail,
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          data: cleanedDisplayName ? { display_name: cleanedDisplayName, name: cleanedDisplayName } : undefined,
        },
      });
      if (error) throw error;
      return data;
    },

    async redirectToLogin() {
      if (typeof window !== "undefined") {
        const loginEvent = new CustomEvent(LOGIN_EVENT_NAME, { cancelable: true });
        window.dispatchEvent(loginEvent);
        if (loginEvent.defaultPrevented) return null;
      }

      const email = window.prompt("Enter your email:");
      if (!email) return null;
      const password = window.prompt("Enter your password:");
      if (!password) return null;
      await this.signInWithEmailPassword(email, password);
      return null;
    },

    async signInWithProvider(provider, options = {}) {
      const client = getClient();
      const redirectTo = options.redirectTo || getAuthRedirectUrl(options.redirectPath);
      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          ...options,
          redirectTo,
        },
      });
      if (error) throw error;
      return data;
    },

    async linkIdentity(provider, options = {}) {
      const client = getClient();
      await getCurrentSessionUser();
      const redirectTo = options.redirectTo || getAuthRedirectUrl(options.redirectPath);
      const { data, error } = await client.auth.linkIdentity({
        provider,
        options: {
          ...options,
          redirectTo,
        },
      });
      if (error) throw error;
      return data;
    },

    async getLinkedIdentities() {
      const client = getClient();
      await getCurrentSessionUser();
      const { data, error } = await client.auth.getUserIdentities();
      if (error) throw error;
      return data?.identities || [];
    },

    async unlinkIdentity(identity) {
      const client = getClient();
      await getCurrentSessionUser();
      const { error } = await client.auth.unlinkIdentity(identity);
      if (error) throw error;
      return true;
    },

    async logout(redirectTo = window.location.href) {
      const client = getClient();
      await client.auth.signOut();
      if (redirectTo) window.location.assign(redirectTo);
    },
  },

  entities,

  notifications: notificationApi,

  community: communityInteractionApi,

  integrations: {
    Core: {
      async UploadFile({ file, folder = "uploads" }) {
        const client = getClient();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
        const { error } = await client.storage.from(UPLOAD_BUCKET).upload(path, file, {
          cacheControl: "3600",
          contentType: file.type || undefined,
          upsert: false,
        });
        if (error) throw error;
        const { data } = client.storage.from(UPLOAD_BUCKET).getPublicUrl(path);
        return { file_url: data.publicUrl, path };
      },
    },

    GoogleCalendar: {
      async getStatus() {
        const client = getClient();
        const { data, error } = await client.functions.invoke("sync-google-calendar", {
          body: { action: "status" },
        });
        if (error) throw error;
        return data?.connection || null;
      },

      async captureSessionToken() {
        const session = await communityClient.auth.getSession();
        if (!session?.provider_token) {
          return { ok: false, reason: "no_provider_token" };
        }

        const client = getClient();
        const { data, error } = await client.functions.invoke("sync-google-calendar", {
          body: {
            action: "store_token",
            access_token: session.provider_token,
            refresh_token: session.provider_refresh_token || null,
            expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
            scopes: session.scopes || "",
          },
        });
        if (error) throw error;
        return data;
      },

      async syncEvent(event) {
        const client = getClient();
        const { data, error } = await client.functions.invoke("sync-google-calendar", {
          body: { action: "sync_event", event },
        });
        if (error) throw error;
        if (data?.ok === false) throw new Error(data.error || "Google Calendar sync failed.");
        return data;
      },
    },
  },
};
