import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const cronSecret = Deno.env.get("NOTIFICATION_CRON_SECRET") || "";
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
const fromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL") || "Foxfam <notifications@foxfam.faith>";

function authorized(req: Request) {
  const supplied = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(cronSecret && supplied === cronSecret);
}

async function sendEmail(to: string, title: string, message: string, url: string) {
  if (!resendApiKey || !to) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject: title,
      text: `${message}\n\nOpen Foxfam: ${url}`,
    }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST" || !authorized(req)) return new Response("Unauthorized", { status: 401 });
  if (!supabaseUrl || !serviceRoleKey) return new Response("Server configuration missing", { status: 500 });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: notifications, error } = await admin
    .from("user_notifications")
    .select("id,user_id,data,push_delivered_at,email_delivered_at")
    .is("delivery_attempted_at", null)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (vapidPublicKey && vapidPrivateKey) webpush.setVapidDetails("mailto:notifications@foxfam.faith", vapidPublicKey, vapidPrivateKey);
  let delivered = 0;

  for (const notification of notifications || []) {
    const payload = notification.data || {};
    const { data: profile } = await admin.from("profiles").select("email,notification_preferences").eq("id", notification.user_id).maybeSingle();
    const channels = profile?.notification_preferences?.channels || {};
    const topics = profile?.notification_preferences?.topics || {};
    const topicEnabled = payload.type ? topics[payload.type] !== false : true;
    const updates: Record<string, unknown> = { delivery_attempted_at: new Date().toISOString(), delivery_error: null };
    const errors: string[] = [];

    if (topicEnabled && channels.push && vapidPublicKey && vapidPrivateKey) {
      const { data: subscriptions } = await admin.from("notification_push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", notification.user_id);
      for (const subscription of subscriptions || []) {
        try {
          await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: payload.title || "Foxfam", body: payload.message || "Something new is waiting at the shrine.", url: payload.url || "/" }));
          updates.push_delivered_at = new Date().toISOString();
        } catch (pushError) {
          const statusCode = Number((pushError as { statusCode?: number })?.statusCode || 0);
          if ([404, 410].includes(statusCode)) await admin.from("notification_push_subscriptions").delete().eq("id", subscription.id);
          errors.push(`push:${statusCode || "failed"}`);
        }
      }
    }

    if (topicEnabled && channels.email && !notification.email_delivered_at) {
      try {
        if (await sendEmail(profile?.email || "", payload.title || "Foxfam", payload.message || "Something new is waiting at the shrine.", payload.url || "https://foxfam.faith")) updates.email_delivered_at = new Date().toISOString();
      } catch (emailError) {
        errors.push(`email:${emailError instanceof Error ? emailError.message : "failed"}`);
      }
    }

    if (errors.length) updates.delivery_error = errors.join(", ").slice(0, 500);
    await admin.from("user_notifications").update(updates).eq("id", notification.id);
    delivered += 1;
  }

  return Response.json({ ok: true, processed: delivered });
});
