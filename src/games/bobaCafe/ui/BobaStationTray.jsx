import { Eraser, Send } from "lucide-react";
import { BOBA_CAFE_INGREDIENT_GROUPS, SWEETNESS_LEVELS } from "../content/bobaCatalog";

const STATIONS = [
  ...BOBA_CAFE_INGREDIENT_GROUPS.map((group) => ({ key: group.key, label: group.label, options: group.options })),
  { key: "sweetness", label: "Sweet", options: SWEETNESS_LEVELS },
];

export default function BobaStationTray({
  activeStation,
  tray,
  disabled,
  canServe,
  onStationChange,
  onOptionSelect,
  onClear,
  onServe,
}) {
  const station = STATIONS.find((item) => item.key === activeStation) || STATIONS[0];

  return (
    <section className="boba-stations" aria-labelledby="boba-station-title">
      <div className="boba-stations__tabs" role="tablist" aria-label="Drink stations">
        {STATIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={item.key === station.key}
            aria-controls="boba-station-panel"
            onClick={() => onStationChange(item.key)}
          >
            <span aria-hidden="true">{tray?.[item.key] ? "●" : "○"}</span>
            {item.label}
          </button>
        ))}
      </div>

      <div id="boba-station-panel" className="boba-stations__panel" role="tabpanel">
        <div className="boba-stations__heading">
          <div>
            <p>Active station</p>
            <h2 id="boba-station-title">Choose {station.label}</h2>
          </div>
          <kbd>1-{station.options.length}</kbd>
        </div>

        <div className="boba-stations__options">
          {station.options.map((option, index) => {
            const selected = tray?.[station.key] === option.key;
            return (
              <button
                key={option.key}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => onOptionSelect(station.key, index + 1)}
              >
                <kbd>{index + 1}</kbd>
                <span className="boba-stations__swatch" style={{ "--option-color": option.accent || "#dfd8ab" }} />
                <span><strong>{option.label}</strong>{option.value ? <small>{option.value}% sweetness</small> : null}</span>
              </button>
            );
          })}
        </div>

        <div className="boba-stations__actions">
          <button type="button" onClick={onClear} disabled={disabled} title="Clear tray">
            <Eraser aria-hidden="true" /> Clear
          </button>
          <button type="button" onClick={onServe} disabled={disabled || !canServe}>
            <Send aria-hidden="true" /> Serve <kbd>Enter</kbd>
          </button>
        </div>
      </div>
    </section>
  );
}
