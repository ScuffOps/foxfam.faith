import { useRef } from "react";
import { Eraser, Send } from "lucide-react";
import { BOBA_CAFE_INGREDIENT_GROUPS, SWEETNESS_LEVELS } from "../content/bobaCatalog";

const STATIONS = [
  ...BOBA_CAFE_INGREDIENT_GROUPS.map((group) => ({ key: group.key, label: group.label, options: group.options })),
  { key: "sweetness", label: "Sweet", options: SWEETNESS_LEVELS },
];

function StationIcon({ stationKey }) {
  return (
    <svg className="boba-stations__icon" viewBox="0 0 32 32" aria-hidden="true">
      {stationKey === "tea" ? <path d="M7 9h16l-2 16H9Zm16 3h3c4 0 4 7-1 8h-3M11 5c0-2 2-2 2-4m5 4c0-2 2-2 2-4" /> : null}
      {stationKey === "milk" ? <path d="m10 4 12 3v19H10ZM10 4l5 5 7-2M14 14h4v7h-4Z" /> : null}
      {stationKey === "topping" ? <path d="M7 10h18l-2 16H9Zm3-4h12M12 16h1m5 0h1m-4 5h1" /> : null}
      {stationKey === "charm" ? <path d="m16 4 3 7 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z" /> : null}
      {stationKey === "sweetness" ? <path d="M8 10h16v16H8Zm4-5h8l3 5H9Zm2 11h4m-2-2v4" /> : null}
    </svg>
  );
}

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
  const tabRefs = useRef([]);

  const handleTabKeyDown = (event, index) => {
    let nextIndex = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % STATIONS.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + STATIONS.length) % STATIONS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = STATIONS.length - 1;
    else return;

    event.preventDefault();
    onStationChange(STATIONS[nextIndex].key);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <section className="boba-stations" aria-labelledby="boba-station-title">
      <div className="boba-stations__tabs" role="tablist" aria-label="Drink stations">
        {STATIONS.map((item, index) => (
          <button
            key={item.key}
            id={`boba-tab-${item.key}`}
            ref={(node) => { tabRefs.current[index] = node; }}
            type="button"
            role="tab"
            aria-selected={item.key === station.key}
            aria-controls="boba-station-panel"
            tabIndex={item.key === station.key ? 0 : -1}
            onClick={() => onStationChange(item.key)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            <StationIcon stationKey={item.key} />
            <span>{item.label}</span>
            <i aria-label={tray?.[item.key] ? "Selected" : "Not selected"}>{tray?.[item.key] ? "✓" : ""}</i>
          </button>
        ))}
      </div>

      <div id="boba-station-panel" className="boba-stations__panel" role="tabpanel" aria-labelledby={`boba-tab-${station.key}`}>
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
                aria-label={`${option.label}${option.value ? `, ${option.value}% sweetness` : ""}${selected ? ", selected" : ""}`}
                onClick={() => onOptionSelect(station.key, index + 1)}
              >
                <kbd>{index + 1}</kbd>
                <span className="boba-stations__ingredient" data-station={station.key} style={{ "--option-color": option.accent || "#dfd8ab" }} aria-hidden="true">
                  <i />
                </span>
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
