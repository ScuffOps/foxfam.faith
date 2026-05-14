import { useEffect, useState } from "react";
import { Mic2 } from "lucide-react";
import GlassCard from "../GlassCard";

const EREN_AGENT = {
  name: "Eren",
  id: "agent_7101kr3a7dhnepr86rke5x97kakm",
  providerLabel: "ElevenAgents",
};
const WIDGET_SCRIPT_ID = "elevenlabs-convai-widget";
const WIDGET_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed";

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
    <GlassCard className="eren-agent-card flex min-h-[220px] flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="dashboard-icon-well flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Mic2 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-heading text-sm font-semibold">Talk to {EREN_AGENT.name}</h3>
          <p className="text-xs text-muted-foreground">{EREN_AGENT.providerLabel} voice agent</p>
        </div>
      </div>

      <div className="eren-agent-widget-shell flex flex-1 items-center justify-center rounded-[1.5rem] p-4">
        {status === "error" ? (
          <p className="text-center text-xs text-muted-foreground">
            {EREN_AGENT.name} could not load right now. Try refreshing in a moment.
          </p>
        ) : status === "ready" ? (
          <elevenlabs-convai key={EREN_AGENT.id} agent-id={EREN_AGENT.id}></elevenlabs-convai>
        ) : (
          <p className="text-xs text-muted-foreground">summoning {EREN_AGENT.name}...</p>
        )}
      </div>
    </GlassCard>
  );
}
