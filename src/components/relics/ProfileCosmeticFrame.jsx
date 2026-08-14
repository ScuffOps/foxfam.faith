import { Circle, Flower2, PawPrint, Sparkles, Star, Wind } from "lucide-react";
import {
  COLLECTIBLE_ART_KINDS,
  getApprovedCollectibleArtAsset,
} from "./collectibleArtManifest.js";

const MOTIF_ICONS = Object.freeze({
  bubble: Circle,
  paw: PawPrint,
  petal: Flower2,
  sigil: Sparkles,
  star: Star,
  steam: Wind,
});

export default function ProfileCosmeticFrame({ frame, particle, children }) {
  const ParticleIcon = MOTIF_ICONS[particle?.motif] || Sparkles;
  const approvedParticleAsset = particle?.key
    ? getApprovedCollectibleArtAsset(COLLECTIBLE_ART_KINDS.profileParticle, particle.key)
    : null;

  return (
    <div
      className="relative rounded-lg border-2 border-[#707989] bg-[#faf3eb] p-5 text-[#364152] shadow-[0_5px_0_#c7bbb0]"
      data-profile-particle={particle?.key || "none"}
    >
      {particle ? (
        <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
          {[
            "-left-2 top-5 h-4 w-4",
            "right-8 -top-2 h-5 w-5",
            "-right-2 bottom-12 h-4 w-4",
            "bottom-3 left-12 h-3.5 w-3.5",
          ].map((placement, index) => (
            <span
              key={`${particle.key}-${index}`}
              className={`absolute flex items-center justify-center ${placement}`}
              style={{ color: particle.color }}
              data-profile-particle-accent=""
            >
              {approvedParticleAsset ? (
                <img
                  src={approvedParticleAsset}
                  alt=""
                  className="h-full w-full object-contain"
                  draggable="false"
                  data-art-source="approved"
                />
              ) : (
                <ParticleIcon className="h-full w-full fill-current" data-art-source="fallback" />
              )}
            </span>
          ))}
        </div>
      ) : null}
      {particle ? <span className="sr-only">Equipped profile effect: {particle.label}</span> : null}
      {frame ? <span className="sr-only">Avatar frame active: {frame.label}</span> : null}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
