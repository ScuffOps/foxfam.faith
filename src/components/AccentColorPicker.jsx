import { useAccentColor, ACCENT_COLORS } from "@/hooks/useAccentColor";
import ColorSwatchPicker from "./ColorSwatchPicker";

export default function AccentColorPicker() {
  const { accent, setAccent } = useAccentColor();

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">Accent Color</p>
      <ColorSwatchPicker value={accent} onChange={(next) => next && setAccent(next)} swatches={ACCENT_COLORS} allowClear={false} size={34} />
    </div>
  );
}
