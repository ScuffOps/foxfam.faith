import FamiliarAvatar from "./FamiliarAvatar";
import { useFamiliar } from "./useFamiliar";

export default function GameFamiliarCompanion({ label }) {
  const { familiar } = useFamiliar();

  return (
    <aside className="game-familiar-companion" aria-label={`${label} familiar companion`}>
      <FamiliarAvatar familiar={familiar} size="clamp(64px, 7vw, 82px)" pose="idle" />
      <span>{label}</span>
    </aside>
  );
}
