const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
    if (!webhookUrl) {
      return Response.json(
        { error: "DISCORD_WEBHOOK_URL is not configured" },
        { status: 501, headers: corsHeaders },
      );
    }

    const body = await request.json();
    const message = String(body.message || "").trim();
    if (!message) {
      return Response.json({ error: "Message is required" }, { status: 400, headers: corsHeaders });
    }

    const author = body.is_anonymous ? "Anonymous" : String(body.author_name || "Foxfam").trim();
    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "New Prayer Wall Message",
            description: message,
            color: 0x7c5cbf,
            footer: { text: `Submitted by ${author}` },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!discordResponse.ok) {
      return Response.json(
        { error: "Discord webhook rejected the message" },
        { status: 502, headers: corsHeaders },
      );
    }

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch {
    return Response.json({ error: "Unable to send Discord notification" }, { status: 500, headers: corsHeaders });
  }
});
