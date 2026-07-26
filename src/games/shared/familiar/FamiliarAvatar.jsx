import { DEFAULT_FAMILIAR, FAMILIAR_COATS, FAMILIAR_SPECIES, normalizeFamiliarSelection } from "./familiarCatalog";
import "./familiar-avatar.css";

export default function FamiliarAvatar({ familiar = DEFAULT_FAMILIAR, size = 112, pose = "idle", className = "" }) {
  const selection = normalizeFamiliarSelection(familiar);
  const species = FAMILIAR_SPECIES[selection.species];
  const coat = FAMILIAR_COATS[selection.coat] || FAMILIAR_COATS.cream;
  const style = {
    "--familiar-size": typeof size === "number" ? `${size}px` : size,
    "--familiar-coat": coat.base,
    "--familiar-detail": coat.detail,
  };

  return (
    <figure
      className={`familiar-avatar familiar-avatar--${species.tailStyle} ${className}`.trim()}
      data-pose={pose}
      data-species={selection.species}
      data-coat={selection.coat}
      data-marking={selection.markings}
      style={style}
      role="img"
      aria-label={`${species.label} familiar wearing ${selection.outfit.replaceAll("-", " ")}`}
    >
      <img className="familiar-avatar__art" src={species.asset} alt="" draggable="false" aria-hidden="true" />
      <span className="familiar-avatar__marking" data-marking={selection.markings} aria-hidden="true" />
      <span className="familiar-avatar__outfit" data-outfit={selection.outfit} aria-hidden="true" />
      {selection.accessory !== "none" ? <span className="familiar-avatar__accessory" data-accessory={selection.accessory} aria-hidden="true" /> : null}
      {selection.charmFx !== "none" ? <span className="familiar-avatar__fx" data-fx={selection.charmFx} aria-hidden="true" /> : null}
    </figure>
  );
}
