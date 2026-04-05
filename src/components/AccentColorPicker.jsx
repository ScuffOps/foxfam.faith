import { useAccentColor, ACCENT_COLORS } from "@/hooks/useAccentColor";
import { Check } from "lucide-react";

export default function AccentColorPicker() {
  const { accent, setAccent } = useAccentColor();

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">Accent Color</p>
      <div className="flex flex-wrap gap-2">
        {ACCENT_COLORS.map((c) => (
          <button
            key={c.value}
            title={c.label}
            onClick={() => setAccent(c.value)}
            className="relative h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
            style={{ background: `hsl(${c.value})` }}
          >
            {accent === c.value && (
              <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}