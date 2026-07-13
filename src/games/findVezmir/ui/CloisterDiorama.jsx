import { useRef } from "react";
import { Check, LocateFixed } from "lucide-react";
import { FIND_VEZMIR_OBJECTS } from "../content/hiddenObjects.js";
import "./find-vezmir.css";

const LAYER_LABELS = {
  foreground: "Near",
  room: "Cloister",
  background: "Far",
};

export default function CloisterDiorama({ state, targets, onFind, onPan, onCycleLayer }) {
  const dragRef = useRef(null);
  const activeLayer = state.layers[state.activeLayer];

  const handlePointerDown = (event) => {
    if (event.target.closest("button")) return;
    dragRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current) return;
    const deltaX = (event.clientX - dragRef.current.x) / 18;
    const deltaY = (event.clientY - dragRef.current.y) / 18;
    dragRef.current = { x: event.clientX, y: event.clientY };
    onPan({ x: deltaX, y: deltaY });
  };

  const stopDragging = (event) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <section className="vezmir-diorama" aria-label="Isometric priory cloister hidden-object scene">
      <div className="vezmir-diorama__toolbar" aria-label="Diorama depth controls">
        <button type="button" onClick={() => onCycleLayer(-1)} aria-label="Show nearer depth layer">Q</button>
        <span>{LAYER_LABELS[activeLayer]} layer</span>
        <button type="button" onClick={() => onCycleLayer(1)} aria-label="Show farther depth layer">E</button>
      </div>

      <div
        className="vezmir-diorama__viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        <div
          className="vezmir-diorama__world"
          style={{ transform: `translate(${state.pan.x}%, ${state.pan.y}%) scale(1.04)` }}
        >
          <CloisterArtwork activeLayer={activeLayer} />

          {FIND_VEZMIR_OBJECTS.map((object) => {
            const target = targets.find((item) => item.key === object.key);
            const isActive = object.layer === activeLayer;
            return (
              <button
                key={object.key}
                type="button"
                className="vezmir-hotspot"
                data-active-layer={isActive}
                data-found={target?.found || undefined}
                data-hinted={target?.hinted || undefined}
                style={{
                  left: `${object.hotspot.x}%`,
                  top: `${object.hotspot.y}%`,
                  width: `${object.hotspot.width}%`,
                  height: `${object.hotspot.height}%`,
                }}
                onClick={() => onFind(object.key)}
                aria-label={`Search ${object.region} for ${object.label}`}
                aria-pressed={target?.found || false}
              >
                <span className="vezmir-hotspot__marker" aria-hidden="true">
                  {target?.found ? <Check /> : target?.hinted ? <LocateFixed /> : null}
                </span>
                <span className="sr-only">{object.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="vezmir-diorama__help">Drag to pan · WASD / arrows to move · Q / E changes depth</p>
    </section>
  );
}

function CloisterArtwork({ activeLayer }) {
  return (
    <svg className="vezmir-cloister" viewBox="0 0 1200 760" role="img" aria-label="Chalk-pastel isometric priory cloister">
      <defs>
        <filter id="cloisterShadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="12" stdDeviation="9" floodColor="#574f58" floodOpacity=".22" />
        </filter>
        <pattern id="floorTile" width="90" height="48" patternUnits="userSpaceOnUse" patternTransform="skewY(-27)">
          <rect width="90" height="48" fill="#e7d9c9" />
          <path d="M0 0H90V48H0Z" fill="none" stroke="#c7b6ac" strokeWidth="3" />
        </pattern>
      </defs>

      <rect width="1200" height="760" fill="#d9e9e9" />
      <circle cx="1030" cy="120" r="150" fill="#f7d9df" opacity=".72" />
      <circle cx="175" cy="125" r="125" fill="#e5eddb" opacity=".85" />

      <g className="diorama-layer" data-layer="background" data-active={activeLayer === "background"}>
        <path d="M222 118 605 18 991 132 609 295Z" fill="#ecdfd4" stroke="#786d70" strokeWidth="9" />
        <path d="M222 118v300l387 173V295Z" fill="#d6c5ba" stroke="#786d70" strokeWidth="9" />
        <path d="M991 132v294L609 591V295Z" fill="#c6d8d5" stroke="#786d70" strokeWidth="9" />
        <path d="M300 145v226l79 36V125Z" fill="#b9d1ce" stroke="#786d70" strokeWidth="7" />
        <path d="M440 105v326l82 36V83Z" fill="#f2d9dc" stroke="#786d70" strokeWidth="7" />
        <path d="M785 190v276l96-42V161Z" fill="#e6d9b8" stroke="#786d70" strokeWidth="7" />
        <path d="M866 169 929 149v211l-63 28Z" fill="#a9ccce" stroke="#786d70" strokeWidth="7" />
        <path d="M514 76 608 52l94 28-94 43Z" fill="#f5eee7" stroke="#786d70" strokeWidth="7" />
        <path d="M553 82q54-44 109 0v55H553Z" fill="#91babc" stroke="#786d70" strokeWidth="7" />
        <circle cx="608" cy="91" r="22" fill="#f4d7a6" stroke="#786d70" strokeWidth="5" />
        <path d="M535 231q73-72 146 0v160H535Z" fill="#8d819e" stroke="#786d70" strokeWidth="8" />
        <path d="M563 242q45-43 90 0v135h-90Z" fill="#ede6dd" />
        <path d="M589 278q19-17 38 0v56h-38Z" fill="#8baeb2" />
        <path d="M594 287q14-11 27 0v39h-27Z" fill="#4d6670" />
        <circle cx="601" cy="300" r="4" fill="#f7d8a1" />
        <circle cx="615" cy="300" r="4" fill="#f7d8a1" />
        <path d="m873 230 24-12 21 13-24 12Z" fill="#f4d797" stroke="#786d70" strokeWidth="4" />
      </g>

      <g className="diorama-layer" data-layer="room" data-active={activeLayer === "room"} filter="url(#cloisterShadow)">
        <path d="m222 418 387-171 382 179-382 213Z" fill="url(#floorTile)" stroke="#786d70" strokeWidth="10" />
        <path d="m334 413 276-121 266 126-268 147Z" fill="#e9ded3" stroke="#b8a4a2" strokeWidth="6" />
        <path d="m418 415 190-84 184 87-184 102Z" fill="#c1d8d3" stroke="#786d70" strokeWidth="6" />
        <path d="m455 414 154-67 147 70-148 81Z" fill="#acd0cc" />
        <ellipse cx="609" cy="420" rx="90" ry="46" fill="#8fc2c1" />
        <path d="M571 391q38-38 76 0v65q-38 29-76 0Z" fill="#edf2e8" stroke="#786d70" strokeWidth="6" />
        <path d="m586 405 23-23 24 23-24 17Z" fill="#f4d39b" />
        <path d="m278 425 84-38 55 27-85 43Z" fill="#b98f83" stroke="#786d70" strokeWidth="7" />
        <path d="m804 430 83-38 57 27-85 45Z" fill="#c0958c" stroke="#786d70" strokeWidth="7" />
        <g fill="#86a77c" stroke="#786d70" strokeWidth="5">
          <circle cx="320" cy="372" r="34" /><circle cx="873" cy="366" r="37" />
        </g>
        <g fill="#f3d6dd" stroke="#786d70" strokeWidth="4">
          <circle cx="305" cy="355" r="12" /><circle cx="337" cy="366" r="10" /><circle cx="858" cy="348" r="12" /><circle cx="890" cy="362" r="11" />
        </g>
        <path d="m355 515 92-43 87 42-90 48Z" fill="#e8bfc4" stroke="#786d70" strokeWidth="6" />
        <path d="m676 522 91-46 90 44-94 51Z" fill="#d8c79f" stroke="#786d70" strokeWidth="6" />
        <path d="M382 510q59-46 118 0l-56 31Z" fill="#f5d5d9" />
        <path d="M707 516q56-46 116 0l-59 32Z" fill="#e8dcb9" />
        <circle cx="452" cy="498" r="12" fill="#d7a85d" stroke="#786d70" strokeWidth="4" />
        <path d="m831 382 18-22 18 22-18 20Z" fill="#f5d29c" stroke="#786d70" strokeWidth="4" />
      </g>

      <g className="diorama-layer" data-layer="foreground" data-active={activeLayer === "foreground"} filter="url(#cloisterShadow)">
        <path d="m116 521 493 221 492-270v101L609 752 116 581Z" fill="#bfa89b" stroke="#786d70" strokeWidth="10" />
        <path d="m118 519 491 221 490-269-108-45-382 213-387-221Z" fill="#efe4d7" stroke="#786d70" strokeWidth="10" />
        <path d="m170 503 145 66-75 49-146-66Z" fill="#d6b0a7" stroke="#786d70" strokeWidth="7" />
        <path d="m953 496 146-80 79 42-146 83Z" fill="#b8d1ca" stroke="#786d70" strokeWidth="7" />
        <path d="m188 493 55 25-39 22-54-25Z" fill="#f1d6a1" stroke="#786d70" strokeWidth="5" />
        <path d="M183 484q33-26 66 0v34l-33 18-33-16Z" fill="#c5a0a3" stroke="#786d70" strokeWidth="5" />
        <path d="m698 610 67-35 64 31-67 38Z" fill="#c99fa9" stroke="#786d70" strokeWidth="6" />
        <path d="m731 601 29-15 28 14-29 16Z" fill="#f3ce92" stroke="#786d70" strokeWidth="4" />
        <g transform="translate(1004 464)">
          <ellipse cx="0" cy="32" rx="35" ry="16" fill="#786d70" opacity=".2" />
          <path d="M-23 18q23-38 46 0v34q-23 18-46 0Z" fill="#faf2e9" stroke="#786d70" strokeWidth="5" />
          <path d="m-19-1 8-19 12 17 12-17 8 21" fill="#d9b6c8" stroke="#786d70" strokeWidth="5" />
          <circle cx="-9" cy="18" r="4" fill="#635c65" /><circle cx="9" cy="18" r="4" fill="#635c65" />
          <path d="M-8 31q8 7 16 0" fill="none" stroke="#635c65" strokeWidth="4" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
