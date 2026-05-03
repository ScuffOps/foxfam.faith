import { useEffect, useState } from "react";
import { Mic2 } from "lucide-react";
import GlassCard from "../GlassCard";

const EREN_AGENT_ID = "70Z2rf5rjOarYmwgh1nY";
const WIDGET_SCRIPT_ID = "elevenlabs-convai-widget";
const WIDGET_SRC = "https://elevenlabs.io/convai-widget/index.js";

export default function ErenAgent() {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (customElements.get("elevenlabs-convai")) {
      setStatus("ready");
      return;
    }

    const existingScript = document.getElementById(WIDGET_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", () => setStatus("ready"), { once: true });
      existingScript.addEventListener("error", () => setStatus("error"), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = WIDGET_SCRIPT_ID;
    script.src = WIDGET_SRC;
    script.async = true;
    script.addEventListener("load", () => setStatus("ready"), { once: true });
    script.addEventListener("error", () => setStatus("error"), { once: true });
    document.body.appendChild(script);
  }, []);

  return (
    <GlassCard className="flex min-h-[220px] flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
          <Mic2 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-heading text-sm font-semibold">Talk to Eren</h3>
          <p className="text-xs text-muted-foreground">ElevenLabs voice agent</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/80 p-4">
        {status === "error" ? (
          <p className="text-center text-xs text-muted-foreground">
            Eren could not load right now. Try refreshing in a moment.
          </p>
        ) : status === "ready" ? (
          <elevenlabs-convai agent-id={EREN_AGENT_ID}></elevenlabs-convai>
        ) : (
          <p className="text-xs text-muted-foreground">summoning Eren...</p>
        )}
      </div>
    </GlassCard>
  );
}
