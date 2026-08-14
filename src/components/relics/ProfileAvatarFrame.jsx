import { BookOpen, Clock3, Diamond, Eye, Flower2, Sparkles } from "lucide-react";
import {
  COLLECTIBLE_ART_KINDS,
  getApprovedCollectibleArtAsset,
} from "./collectibleArtManifest.js";

const FRAME_ICONS = Object.freeze({
  book: BookOpen,
  clock: Clock3,
  diamond: Diamond,
  eye: Eye,
  flower: Flower2,
});

export default function ProfileAvatarFrame({ frame, children, className = "" }) {
  const FrameIcon = FRAME_ICONS[frame?.motif] || Sparkles;
  const approvedAsset = frame?.key
    ? getApprovedCollectibleArtAsset(COLLECTIBLE_ART_KINDS.profileFrame, frame.key)
    : null;
  const style = frame ? {
    "--avatar-frame-color": frame.color,
    "--avatar-frame-shade": frame.shade,
  } : undefined;

  return (
    <div
      className={`relative aspect-square h-20 w-20 shrink-0 ${className}`}
      style={style}
      data-profile-avatar-frame={frame?.key || "none"}
    >
      <div className="absolute inset-2 overflow-hidden rounded-xl">
        {children}
      </div>
      {frame ? (
        approvedAsset ? (
          <img
            src={approvedAsset}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            aria-hidden="true"
            draggable="false"
            data-art-source="approved"
          />
        ) : (
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl border-[3px] border-[var(--avatar-frame-color)] shadow-[3px_3px_0_var(--avatar-frame-shade)]"
            aria-hidden="true"
            data-art-source="fallback"
          >
            <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-lg border-2 border-[var(--avatar-frame-color)] bg-[#faf3eb] text-[#364152]">
              <FrameIcon className="h-3.5 w-3.5" />
            </span>
          </div>
        )
      ) : (
        <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-[#707989]" aria-hidden="true" />
      )}
      {frame ? <span className="sr-only">Equipped profile frame: {frame.label}</span> : null}
    </div>
  );
}
