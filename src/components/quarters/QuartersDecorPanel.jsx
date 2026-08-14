import { useEffect, useRef, useState } from "react";
import { Armchair, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUARTERS_DECOR_SLOTS, normalizeQuartersDecor } from "./quartersDecorCatalog.js";

export default function QuartersDecorPanel({ layout, saving = false, error = "", onPreview, onSave, onClose }) {
  const [draft, setDraft] = useState(() => normalizeQuartersDecor(layout));
  const dialogRef = useRef(null);
  const firstControlRef = useRef(null);

  useEffect(() => {
    setDraft(normalizeQuartersDecor(layout));
  }, [layout]);

  useEffect(() => {
    const returnTarget = document.querySelector('[data-station-key="decorate"]');
    firstControlRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onPreview(layout);
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = [...(dialogRef.current?.querySelectorAll("button:not([disabled])") || [])];
      if (!controls.length) return;
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      returnTarget?.focus();
    };
  }, [layout, onClose, onPreview]);

  const choose = (slotKey, optionKey) => {
    const next = { ...draft, [slotKey]: optionKey };
    setDraft(next);
    onPreview(next);
  };

  return (
    <>
      <div className="quarters-station-panel__backdrop" aria-hidden="true" />
      <aside ref={dialogRef} className="quarters-station-panel quarters-decor-panel" role="dialog" aria-modal="true" aria-labelledby="quarters-decor-title">
      <button type="button" className="quarters-station-panel__close" onClick={() => { onPreview(layout); onClose(); }} aria-label="Close decor panel" title="Close">
        <X aria-hidden="true" />
      </button>
      <div className="quarters-station-panel__heading">
        <span className="quarters-station-panel__crest"><Armchair aria-hidden="true" /></span>
        <span><p>Home station</p><h2 id="quarters-decor-title">Decorate</h2></span>
      </div>
      <p className="quarters-station-panel__detail">Choose one keepsake for each stable room slot. Changes preview immediately and save to your Quarters.</p>
      {error ? <p className="quarters-decor-panel__error" role="alert">{error}</p> : null}
      <div className="quarters-decor-panel__slots">
        {QUARTERS_DECOR_SLOTS.map((slot, slotIndex) => (
          <fieldset key={slot.key}>
            <legend>{slot.label}</legend>
            <div>
              {slot.options.map((option, optionIndex) => (
                <button
                  key={option.key}
                  ref={slotIndex === 0 && optionIndex === 0 ? firstControlRef : undefined}
                  type="button"
                  data-palette={option.palette}
                  aria-pressed={draft[slot.key] === option.key}
                  onClick={() => choose(slot.key, option.key)}
                >
                  <span aria-hidden="true" />
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <Button type="button" className="quarters-station-panel__action" disabled={saving} onClick={() => onSave(draft)}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}
        {saving ? "Saving..." : "Save room"}
      </Button>
      </aside>
    </>
  );
}
