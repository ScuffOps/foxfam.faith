import {
  COLLECTIBLE_ART_KINDS,
  getApprovedCollectibleArtAsset,
} from "../../../components/relics/collectibleArtManifest.js";

export default function StarfishingCatchEffect({ effect }) {
  const approvedAsset = effect?.key
    ? getApprovedCollectibleArtAsset(COLLECTIBLE_ART_KINDS.catchEffect, effect.key)
    : null;

  if (!approvedAsset) return null;

  return (
    <div className="starfishing-catch-effect" role="status" aria-label={`${effect.label} catch effect`}>
      <img src={approvedAsset} alt="" aria-hidden="true" draggable="false" data-art-source="approved" />
    </div>
  );
}
