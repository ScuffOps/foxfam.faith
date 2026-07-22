import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

function isAuthorized(request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  return Boolean(expected && supplied === expected);
}

async function sendEmail({ to, title, message, url }) {
  if (!process.env.RESEND_API_KEY || !to) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.NOTIFICATION_FROM_EMAIL || "Foxfam <notifications@foxfam.faith>",
      to: [to],
      subject: title,
      text: `${message}\n\nOpen Foxfam: ${url}`,
    }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  return true;
}

export default async function handler(request, response) {
  if (!["GET", "POST"].includes(request.method) || !isAuthorized(request)) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return response.status(500).json({ error: "Server configuration missing" });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: notifications, error } = await admin.from("user_notifications")
    .select("id,user_id,data,push_delivered_at,email_delivered_at")
    .is("delivery_attempted_at", null)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) return response.status(500).json({ error: error.message });

  const pushReady = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  if (pushReady) webpush.setVapidDetails("mailto:notifications@foxfam.faith", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  let processed = 0;
  for (const notification of notifications || []) {
    const payload = notification.data || {};
    const { data: profile } = await admin.from("profiles").select("email,notification_preferences").eq("id", notification.user_id).maybeSingle();
    const channels = profile?.notification_preferences?.channels || {};
    const topics = profile?.notification_preferences?.topics || {};
    const topicEnabled = payload.type ? topics[payload.type] !== false : true;
    const updates = { delivery_attempted_at: new Date().toISOString(), delivery_error: null };
    const deliveryErrors = [];

    if (topicEnabled && channels.push && pushReady) {
      const { data: subscriptions } = await admin.from("notification_push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", notification.user_id);
      for (const subscription of subscriptions || []) {
        try {
          await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: payload.title || "Foxfam", body: payload.message || "Something new is waiting at the shrine.", url: payload.url || "/" }));
          updates.push_delivered_at = new Date().toISOString();
        } catch (pushError) {
          const statusCode = Number(pushError?.statusCode || 0);
          if ([404, 410].includes(statusCode)) await admin.from("notification_push_subscriptions").delete().eq("id", subscription.id);
          deliveryErrors.push(`push:${statusCode || "failed"}`);
        }
      }
    }

    if (topicEnabled && channels.email && !notification.email_delivered_at) {
      try {
        if (await sendEmail({ to: profile?.email || "", title: payload.title || "Foxfam", message: payload.message || "Something new is waiting at the shrine.", url: payload.url || "https://foxfam.faith" })) updates.email_delivered_at = new Date().toISOString();
        else deliveryErrors.push("email:not-configured");
      } catch (emailError) {
        deliveryErrors.push(`email:${emailError instanceof Error ? emailError.message : "failed"}`);
      }
    }

    if (deliveryErrors.length) updates.delivery_error = deliveryErrors.join(", ").slice(0, 500);
    await admin.from("user_notifications").update(updates).eq("id", notification.id);
    processed += 1;
  }

  return response.status(200).json({ ok: true, processed });
}
