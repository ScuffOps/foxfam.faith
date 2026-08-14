import { useRef } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  LocateFixed,
  ScanSearch,
} from "lucide-react";
import { getApprovedGameArtAsset } from "@/games/shared/art/gameArtManifest";
import {
  FIND_VEZMIR_CLUE_ATLAS,
  FIND_VEZMIR_DEPTH_ATLAS,
  FIND_VEZMIR_INTERACTIVE_ART,
  getFindVezmirAtlasStyle,
} from "../art/findVezmirInteractiveArt.js";
import { FIND_VEZMIR_OBJECTS } from "../content/hiddenObjects.js";
import "./find-vezmir.css";

const LAYER_LABELS = {
  foreground: "Near",
  room: "Cloister",
  background: "Far",
};

const CLOISTER_ART_ASSETS = Object.freeze([
  ["background", getApprovedGameArtAsset("find-vezmir.cloister-background")],
  ["room", getApprovedGameArtAsset("find-vezmir.cloister-room")],
  ["foreground", getApprovedGameArtAsset("find-vezmir.cloister-foreground")],
]);
const HAS_APPROVED_CLOISTER_ART = CLOISTER_ART_ASSETS.every(([, assetPath]) => Boolean(assetPath));

export default function CloisterDiorama({
  state,
  targets,
  currentTarget,
  message,
  onSearch,
  onPan,
  onSelectLayer,
  onRecenter,
  disabled = false,
}) {
  const dragRef = useRef(null);
  const ignoreClickRef = useRef(false);
  const activeLayer = state.layers[state.activeLayer];

  const handlePointerDown = (event) => {
    if (disabled) return;
    if (event.target.closest("button")) return;
    dragRef.current = {
      lastX: event.clientX,
      lastY: event.clientY,
      originX: event.clientX,
      originY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (disabled) return;
    if (!dragRef.current) return;
    const deltaX = (event.clientX - dragRef.current.lastX) / 18;
    const deltaY = (event.clientY - dragRef.current.lastY) / 18;
    dragRef.current.lastX = event.clientX;
    dragRef.current.lastY = event.clientY;
    onPan({ x: deltaX, y: deltaY });
  };

  const stopDragging = (event) => {
    if (dragRef.current) {
      const distance = Math.hypot(
        event.clientX - dragRef.current.originX,
        event.clientY - dragRef.current.originY,
      );
      ignoreClickRef.current = distance > 7;
    }
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const searchBlankArea = (event) => {
    if (disabled) return;
    if (ignoreClickRef.current) {
      ignoreClickRef.current = false;
      return;
    }
    if (event.target.closest("button")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    onSearch({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
      layer: activeLayer,
    });
  };

  return (
    <section className="vezmir-diorama" aria-label="Isometric priory cloister hidden-object scene" aria-busy={disabled}>
      <header className="vezmir-diorama__mission-bar">
        <button
          className="vezmir-current-target"
          type="button"
          disabled={disabled || !currentTarget}
          onClick={() => currentTarget && onSelectLayer(currentTarget.layer)}
          aria-label={currentTarget ? `Show ${LAYER_LABELS[currentTarget.layer]} depth for ${currentTarget.label}` : "Case complete"}
        >
          <span className="vezmir-current-target__icon" aria-hidden="true"><ScanSearch /></span>
          <span>
            <small>Current target</small>
            <strong>{currentTarget?.label || "Case complete"}</strong>
            <em>{currentTarget ? `${currentTarget.region} · ${LAYER_LABELS[currentTarget.layer]} depth` : "Every keepsake is accounted for"}</em>
          </span>
        </button>

        <div className="vezmir-depth-control" role="group" aria-label="Choose diorama depth">
          <span>Depth</span>
          <div>
            {state.layers.map((layer) => (
              <button
                key={layer}
                type="button"
                disabled={disabled}
                aria-pressed={layer === activeLayer}
                onClick={() => onSelectLayer(layer)}
              >
                {FIND_VEZMIR_INTERACTIVE_ART ? (
                  <span className="vezmir-depth-control__art" aria-hidden="true">
                    <img
                      src={FIND_VEZMIR_INTERACTIVE_ART.depth}
                      alt=""
                      draggable="false"
                      style={getFindVezmirAtlasStyle(FIND_VEZMIR_DEPTH_ATLAS, layer)}
                    />
                  </span>
                ) : null}
                <span>{LAYER_LABELS[layer]}</span>
              </button>
            ))}
          </div>
          <small><kbd>Q</kbd><kbd>E</kbd> cycle</small>
        </div>
      </header>

      <div
        className="vezmir-diorama__viewport"
        tabIndex={disabled ? -1 : 0}
        aria-label="Search scene. Drag or use arrow keys to pan."
        aria-describedby="vezmir-scene-help"
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown W A S D Q E"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        <div
          className="vezmir-diorama__world"
          style={{ transform: `translate(${state.pan.x}%, ${state.pan.y}%) scale(var(--vezmir-world-scale, 1.04))` }}
          onClick={searchBlankArea}
        >
          <CloisterArtwork activeLayer={activeLayer} />

          {FIND_VEZMIR_OBJECTS.filter((object) => object.layer === activeLayer).map((object) => {
            const target = targets.find((item) => item.key === object.key);
            return (
              <button
                key={object.key}
                type="button"
                disabled={disabled}
                className="vezmir-hotspot"
                data-found={target?.found || undefined}
                data-hinted={target?.hinted || undefined}
                style={{
                  left: `${object.hotspot.x}%`,
                  top: `${object.hotspot.y}%`,
                  width: `${object.hotspot.width}%`,
                  height: `${object.hotspot.height}%`,
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSearch({ objectKey: object.key, layer: activeLayer });
                }}
                aria-label={`Search ${object.region} for ${object.label}`}
                aria-pressed={target?.found || false}
              >
                <FindVezmirObjectArt object={object} target={target} />
                <span className="vezmir-hotspot__marker" aria-hidden="true">
                  {target?.found ? <Check /> : target?.hinted ? <LocateFixed /> : null}
                </span>
                <span className="sr-only">{object.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <footer className="vezmir-diorama__control-rail">
        <div className="vezmir-diorama__feedback" role="status">
          <strong>{message}</strong>
          <span id="vezmir-scene-help"><span>Drag · WASD / arrows pan · Q / E depth</span><span>Drag to pan · tap keepsakes · choose a depth above</span></span>
        </div>
        <div className="vezmir-pan-controls" role="group" aria-label="Pan search scene">
          <button type="button" disabled={disabled} onClick={() => onPan({ x: 0, y: 4 })} aria-label="Pan scene up" title="Pan up"><ArrowUp aria-hidden="true" /></button>
          <button type="button" disabled={disabled} onClick={() => onPan({ x: 4, y: 0 })} aria-label="Pan scene left" title="Pan left"><ArrowLeft aria-hidden="true" /></button>
          <button type="button" disabled={disabled} onClick={onRecenter} aria-label="Recenter search scene" title="Recenter"><LocateFixed aria-hidden="true" /></button>
          <button type="button" disabled={disabled} onClick={() => onPan({ x: -4, y: 0 })} aria-label="Pan scene right" title="Pan right"><ArrowRight aria-hidden="true" /></button>
          <button type="button" disabled={disabled} onClick={() => onPan({ x: 0, y: -4 })} aria-label="Pan scene down" title="Pan down"><ArrowDown aria-hidden="true" /></button>
        </div>
      </footer>
    </section>
  );
}

function FindVezmirObjectArt({ object, target }) {
  if (!FIND_VEZMIR_INTERACTIVE_ART) return null;

  if (object.role === "final") {
    if (target?.locked) return null;
    return (
      <span className="vezmir-hotspot__authored-object vezmir-hotspot__authored-object--vezmir" aria-hidden="true">
        <img
          src={FIND_VEZMIR_INTERACTIVE_ART.vezmir}
          alt=""
          draggable="false"
        />
      </span>
    );
  }

  return (
    <span className="vezmir-hotspot__authored-object" aria-hidden="true">
      <img
        src={FIND_VEZMIR_INTERACTIVE_ART.clues}
        alt=""
        draggable="false"
        style={getFindVezmirAtlasStyle(FIND_VEZMIR_CLUE_ATLAS, object.key)}
      />
    </span>
  );
}

function CloisterArtwork({ activeLayer }) {
  return (
    <figure className="vezmir-cloister" aria-label="Flat-vector isometric priory cloister with arches, garden beds, and hidden keepsakes">
      {HAS_APPROVED_CLOISTER_ART ? (
        <span className="vezmir-cloister__art-stack" aria-hidden="true">
          {CLOISTER_ART_ASSETS.map(([layer, assetPath]) => (
            <img
              key={layer}
              className="vezmir-cloister__plate"
              data-layer={layer}
              src={assetPath}
              alt=""
              draggable="false"
            />
          ))}
        </span>
      ) : <CloisterFallback />}
      <span
        className="vezmir-cloister__focus"
        data-layer={activeLayer}
        aria-hidden="true"
      />
    </figure>
  );
}

function CloisterFallback() {
  return (
    <svg className="vezmir-cloister__fallback" viewBox="0 0 1200 675" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g className="vezmir-cloister__linework">
        <path className="cloister-sky" d="M0 0h1200v675H0Z" />
        <path className="cloister-floor" d="m92 399 506-235 510 235-508 238Z" />
        <path className="cloister-floor-shadow" d="m600 593 508-238v44L600 637 92 399v-44Z" />
        <path className="cloister-wall cloister-wall--left" d="M92 112 598 0v164L92 399Z" />
        <path className="cloister-wall cloister-wall--right" d="M598 0 1108 112v287L598 164Z" />
        <g className="cloister-arches">
          <path d="M170 344V191c0-73 112-73 112 0v101M344 263V153c0-64 105-64 105 0v62M752 215V153c0-64 105-64 105 0v110M920 292V191c0-73 112-73 112 0v153" />
        </g>
        <path className="cloister-pool-rim" d="M403 392c72-49 244-49 316 0 72 49 24 110-109 123-130 12-273-27-255-75 7-18 24-34 48-48Z" />
        <path className="cloister-pool" d="M425 400c66-39 216-39 279 1 58 36 14 80-101 90-111 9-229-22-219-56 5-14 18-25 41-35Z" />
        <path className="cloister-water-mark" d="M447 425c39-18 84-24 126-21m64 8c25 4 48 11 66 21" />
        <g className="cloister-planters">
          <path className="cloister-bed" d="m167 414 162-76 105 49-163 77Z" />
          <path className="cloister-bed-shadow" d="m271 440 163-77v24l-163 77-104-50v-23Z" />
          <path className="cloister-bed" d="m770 387 105-49 162 76-105 50Z" />
          <path className="cloister-bed-shadow" d="m932 440 105-49v23l-105 50-162-77v-24Z" />
          <path className="cloister-leaves" d="M236 371c-28-38 9-65 36-38 13-43 57-27 49 9 43-10 55 30 19 48-28 16-82 9-104-19ZM851 342c-8-36 36-52 49-9 27-27 64 0 36 38-22 28-76 35-104 19-36-18-24-58 19-48Z" />
        </g>
        <path className="cloister-pedestal" d="m548 382 52-24 53 24-53 25Z" />
        <path className="cloister-pedestal-shadow" d="m600 407 53-25v61l-53 25-52-25v-61Z" />
        <path className="cloister-sigil" d="m600 382 13 14-13 18-13-18Z" />
      </g>
    </svg>
  );
}
