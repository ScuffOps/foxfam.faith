import { useAccentColor, ACCENT_COLORS } from "@/hooks/useAccentColor";
import { communityClient } from "@/api/communityClient";
import ColorSwatchPicker from "./ColorSwatchPicker";

export default function AccentColorPicker() {
  const { accent, setAccent } = useAccentColor();
  const handleChange = (next) => {
    if (!next) return;
    setAccent(next);
    const selected = ACCENT_COLORS.find((swatch) => swatch.value === next);
    if (selected?.hex) {
      communityClient.auth.updateMe({ accent_color: selected.hex }).catch(() => {});
    }
  };

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">Accent Color</p>
      <ColorSwatchPicker value={accent} onChange={handleChange} swatches={ACCENT_COLORS} allowClear={false} size={34} />
    </div>
  );
}
