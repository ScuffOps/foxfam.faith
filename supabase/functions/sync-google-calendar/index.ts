const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

type PortalEvent = {
  id?: string;
  title?: string;
  description?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  all_day?: boolean;
  google_event_id?: string;
  google_calendar_id?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireEnv() {
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error("Supabase Edge Function secrets are not configured.");
  }
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    throw Object.assign(new Error("Missing authorization."), { status: 401 });
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: authorization,
      apikey: anonKey,
    },
  });

  if (!response.ok) {
    throw Object.assign(new Error("Invalid session."), { status: 401 });
  }

  return await response.json();
}

async function rest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Supabase REST request failed: ${response.status}`);
  }

  if (response.status === 204) return null;
  return await response.json();
}

async function readProfile(userId: string) {
  const rows = await rest(`profiles?select=id,role&id=eq.${encodeURIComponent(userId)}&limit=1`, {
    method: "GET",
  });
  return Array.isArray(rows) ? rows[0] : null;
}

function canSyncCalendar(profile: { role?: string } | null) {
  return ["admin", "lead_mod", "mod"].includes(String(profile?.role || "").toLowerCase());
}

function toIsoDate(value?: string) {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function toGoogleEvent(event: PortalEvent) {
  const startIso = toIsoDate(event.start_date);
  const endIso = toIsoDate(event.end_date || event.start_date);

  if (event.all_day) {
    return {
      summary: event.title || "Foxfam event",
      description: event.description || "",
      location: event.location || "",
      start: { date: startIso.slice(0, 10) },
      end: { date: endIso.slice(0, 10) },
      extendedProperties: { private: { foxfam_event_id: event.id || "" } },
    };
  }

  return {
    summary: event.title || "Foxfam event",
    description: event.description || "",
    location: event.location || "",
    start: { dateTime: startIso },
    end: { dateTime: endIso },
    extendedProperties: { private: { foxfam_event_id: event.id || "" } },
  };
}

async function getToken(userId: string) {
  const rows = await rest(`oauth_tokens?select=*&user_id=eq.${encodeURIComponent(userId)}&provider=eq.google&limit=1`, {
    method: "GET",
  });
  const token = Array.isArray(rows) ? rows[0] : null;
  if (!token?.access_token) {
    throw Object.assign(new Error("Google Calendar is not connected yet."), { status: 409 });
  }
  return token;
}

async function refreshAccessToken(token: Record<string, string>) {
  if (!token.refresh_token || !googleClientId || !googleClientSecret) {
    throw Object.assign(new Error("Google Calendar needs re-authentication."), { status: 409 });
  }

  const body = new URLSearchParams({
    client_id: googleClientId,
    client_secret: googleClientSecret,
    refresh_token: token.refresh_token,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw Object.assign(new Error("Google token refresh failed."), { status: 409 });
  }

  const refreshed = await response.json();
  const expiresAt = new Date(Date.now() + Number(refreshed.expires_in || 3600) * 1000).toISOString();
  const updated = await rest(`oauth_tokens?user_id=eq.${encodeURIComponent(String(token.user_id))}&provider=eq.google`, {
    method: "PATCH",
    body: JSON.stringify({
      access_token: refreshed.access_token,
      expires_at: expiresAt,
      scopes: String(refreshed.scope || "").split(" ").filter(Boolean),
    }),
  });
  return Array.isArray(updated) ? updated[0] : { ...token, access_token: refreshed.access_token, expires_at: expiresAt };
}

async function getUsableToken(userId: string) {
  const token = await getToken(userId);
  if (!token.expires_at) return token;
  const expiresAt = new Date(token.expires_at).getTime();
  if (Number.isNaN(expiresAt) || expiresAt - Date.now() > 90_000) return token;
  return await refreshAccessToken(token);
}

async function upsertConnection(userId: string, payload: Record<string, unknown>) {
  const rows = await rest("calendar_sync_connections?on_conflict=user_id,provider", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      user_id: userId,
      provider: "google",
      calendar_id: "primary",
      sync_enabled: true,
      ...payload,
    }),
  });
  return Array.isArray(rows) ? rows[0] : null;
}

async function storeToken(userId: string, body: Record<string, unknown>) {
  const accessToken = String(body.access_token || "");
  if (!accessToken) {
    throw Object.assign(new Error("No Google access token found in the current session."), { status: 400 });
  }

  const expiresAt = body.expires_at
    ? new Date(String(body.expires_at)).toISOString()
    : new Date(Date.now() + Number(body.expires_in || 3600) * 1000).toISOString();
  const scopes = Array.isArray(body.scopes)
    ? body.scopes.map(String)
    : String(body.scopes || "").split(" ").filter(Boolean);

  await rest("oauth_tokens?on_conflict=user_id,provider", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      provider: "google",
      access_token: accessToken,
      refresh_token: body.refresh_token || null,
      expires_at: expiresAt,
      scopes,
    }),
  });

  const connection = await upsertConnection(userId, {
    status: "connected",
    scopes,
    last_error: null,
  });

  return jsonResponse({ ok: true, connection });
}

async function readStatus(userId: string) {
  const rows = await rest(`calendar_sync_connections?select=*&user_id=eq.${encodeURIComponent(userId)}&provider=eq.google&limit=1`, {
    method: "GET",
  });
  return jsonResponse({ ok: true, connection: Array.isArray(rows) ? rows[0] || null : null });
}

async function logRun(payload: Record<string, unknown>) {
  await rest("calendar_sync_runs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
}

async function updatePortalEvent(event: PortalEvent, googleEventId: string, calendarId: string) {
  if (!event.id) return;
  const rows = await rest(`events?select=id,data&id=eq.${encodeURIComponent(event.id)}&limit=1`, { method: "GET" });
  const current = Array.isArray(rows) ? rows[0] : null;
  if (!current?.data) return;

  await rest(`events?id=eq.${encodeURIComponent(event.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      data: {
        ...current.data,
        google_event_id: googleEventId,
        google_calendar_id: calendarId,
        google_synced_at: new Date().toISOString(),
      },
    }),
  });
}

async function syncEvent(userId: string, body: Record<string, unknown>) {
  const profile = await readProfile(userId);
  if (!canSyncCalendar(profile)) {
    throw Object.assign(new Error("Only mods, lead mods, and admins can sync portal events."), { status: 403 });
  }

  const event = (body.event || {}) as PortalEvent;
  if (!event.title || !event.start_date) {
    throw Object.assign(new Error("Event title and start date are required."), { status: 400 });
  }

  const connectionRows = await rest(`calendar_sync_connections?select=*&user_id=eq.${encodeURIComponent(userId)}&provider=eq.google&limit=1`, {
    method: "GET",
  });
  const connection = Array.isArray(connectionRows) ? connectionRows[0] : null;
  const calendarId = String(body.calendar_id || connection?.calendar_id || event.google_calendar_id || "primary");
  const token = await getUsableToken(userId);
  const googleBody = toGoogleEvent(event);
  const existingGoogleId = String(event.google_event_id || "");
  const endpoint = existingGoogleId
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existingGoogleId)}`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const method = existingGoogleId ? "PATCH" : "POST";

  const response = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(googleBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    await upsertConnection(userId, { status: "error", last_error: errorText.slice(0, 500) });
    await logRun({
      user_id: userId,
      connection_id: connection?.id || null,
      event_id: event.id || null,
      provider: "google",
      action: existingGoogleId ? "update_event" : "create_event",
      status: "error",
      error: errorText.slice(0, 1000),
    });
    throw Object.assign(new Error("Google Calendar rejected the event sync."), { status: 502 });
  }

  const googleEvent = await response.json();
  const updatedConnection = await upsertConnection(userId, {
    status: "connected",
    last_synced_at: new Date().toISOString(),
    last_error: null,
  });
  await updatePortalEvent(event, googleEvent.id, calendarId);
  await logRun({
    user_id: userId,
    connection_id: updatedConnection?.id || connection?.id || null,
    event_id: event.id || null,
    provider: "google",
    action: existingGoogleId ? "update_event" : "create_event",
    status: "success",
    google_event_id: googleEvent.id,
  });

  return jsonResponse({ ok: true, google_event_id: googleEvent.id, calendar_id: calendarId });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed." }, 405);

  try {
    requireEnv();
    const user = await getAuthenticatedUser(request);
    const body = await readJson(request);
    const action = String(body.action || "status");

    if (action === "store_token") return await storeToken(user.id, body);
    if (action === "sync_event") return await syncEvent(user.id, body);
    return await readStatus(user.id);
  } catch (error) {
    const status = typeof (error as { status?: unknown })?.status === "number"
      ? Number((error as { status: number }).status)
      : 500;
    const message = error instanceof Error ? error.message : "Google Calendar sync failed.";
    return jsonResponse({ ok: false, error: message }, status);
  }
});
