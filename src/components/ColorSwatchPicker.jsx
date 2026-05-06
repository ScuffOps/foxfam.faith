import { Check } from "lucide-react";
import { USER_COLOR_SWATCHES } from "@/lib/userColorSwatches";

export default function ColorSwatchPicker({
  value,
  onChange,
  swatches = USER_COLOR_SWATCHES,
  allowClear = true,
  className = "",
  size = 36,
}) {
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2.5">
        {swatches.map((swatch) => {
          const swatchValue = swatch.value || swatch.hex;
          const isSelected = value === swatchValue;
          return (
            <button
              key={swatchValue}
              type="button"
              title={swatch.label}
              aria-label={swatch.label}
              aria-pressed={isSelected}
              onClick={() => onChange(isSelected && allowClear ? "" : swatchValue)}
              className="group relative flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              style={{ width: size, height: size }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 drop-shadow-[0_0_7px_rgba(80,180,255,0.16)] transition-[filter,opacity]"
                style={{
                  backgroundColor: swatch.hex,
                  maskImage: "url('/assets/seal-swatch-mask.png')",
                  WebkitMaskImage: "url('/assets/seal-swatch-mask.png')",
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                  maskPosition: "center",
                  WebkitMaskPosition: "center",
                  maskSize: "contain",
                  WebkitMaskSize: "contain",
                  filter: isSelected ? `drop-shadow(0 0 8px ${swatch.hex}) drop-shadow(0 0 14px ${swatch.hex})` : undefined,
                  opacity: isSelected ? 1 : 0.82,
                }}
              />
              {isSelected && (
                <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-background/70 text-foreground shadow-sm">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
