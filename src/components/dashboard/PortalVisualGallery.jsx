import { useMemo, useState } from "react";
import { Image as ImageIcon, RotateCw } from "lucide-react";
import GlassCard from "../GlassCard";
import { Button } from "../ui/button";

const COMMUNITY_VISUALS = [
  {
    src: "/assets/drive/ttv-banner.png",
    alt: "Blue and gold stream banner artwork",
    label: "Stream signal",
  },
  {
    src: "/assets/drive/panel-lantern.png",
    alt: "Lantern panel artwork with a small blue flame",
    label: "Shrine light",
  },
  {
    src: "/assets/drive/veri-speak.gif",
    alt: "Veri speaking animation from the Foxfam visual archive",
    label: "Veri speaks",
  },
];

const STAFF_VISUALS = [
  {
    src: "/assets/drive/discord-welcome.png",
    alt: "Discord welcome banner artwork",
    label: "Community welcome",
  },
  {
    src: "/assets/drive/ttv-banner.png",
    alt: "Blue and gold stream banner artwork",
    label: "Stream signal",
  },
  {
    src: "/assets/drive/panel-lantern.png",
    alt: "Lantern panel artwork with a small blue flame",
    label: "Shrine light",
  },
];

export default function PortalVisualGallery({ mode = "community" }) {
  const visuals = mode === "staff" ? STAFF_VISUALS : COMMUNITY_VISUALS;
  const [activeIndex, setActiveIndex] = useState(0);
  const activeVisual = useMemo(() => visuals[activeIndex % visuals.length], [activeIndex, visuals]);

  function showNextVisual() {
    setActiveIndex((index) => (index + 1) % visuals.length);
  }

  return (
    <GlassCard className="overflow-hidden p-0">
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="dashboard-icon-well flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <ImageIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold">Visual Signal</h3>
            <p className="text-xs text-muted-foreground">
              {mode === "staff" ? "Reference art for the people keeping the shrine moving." : "A little color from the wider Foxfam archive."}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={showNextVisual}
          aria-label="Show another visual"
          title="Show another visual"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid min-h-40 grid-cols-[minmax(0,1fr)_7rem] gap-2 px-5 pb-5">
        <div className="relative overflow-hidden rounded-lg border border-border/70 bg-slate-950/70">
          <img
            key={activeVisual.src}
            src={activeVisual.src}
            alt={activeVisual.alt}
            className="h-full min-h-40 w-full object-cover transition-opacity duration-500 motion-reduce:transition-none"
            loading="lazy"
          />
          <span className="absolute bottom-2 left-2 rounded-md bg-slate-950/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-100">
            {activeVisual.label}
          </span>
        </div>

        <div className="grid grid-rows-3 gap-2">
          {visuals.map((visual, index) => (
            <button
              type="button"
              key={visual.src}
              onClick={() => setActiveIndex(index)}
              className={`overflow-hidden rounded-lg border bg-slate-950/70 transition ${
                index === activeIndex ? "border-primary shadow-[0_0_18px_rgba(111,86,255,0.24)]" : "border-border/50 opacity-70 hover:opacity-100"
              }`}
              aria-label={`Show ${visual.label}`}
            >
              <img src={visual.src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
