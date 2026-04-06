import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, author_name, is_anonymous } = await req.json();

    const webhookUrl = Deno.env.get("DISCORD_PRAYER_WEBHOOK_URL");
    if (!webhookUrl) {
      return Response.json({ error: 'Discord webhook not configured' }, { status: 500 });
    }

    const displayName = is_anonymous ? "🕊️ Anonymous" : (author_name || user.full_name || "A community member");

    const embed = {
      title: "✦ A Prayer for Veri ✦",
      description: message,
      color: 0x7c5cbf,
      footer: {
        text: `From: ${displayName} · Foxfam.Faith Prayer Wall`
      },
      timestamp: new Date().toISOString()
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] })
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});