import { useRef } from "react";
import { Check, ChevronDown, ChevronUp, LocateFixed } from "lucide-react";
import { FIND_VEZMIR_OBJECTS } from "../content/hiddenObjects.js";
import "./find-vezmir.css";

const LAYER_LABELS = {
  foreground: "Near",
  room: "Cloister",
  background: "Far",
};

export default function CloisterDiorama({ state, targets, onSearch, onPan, onCycleLayer, disabled = false }) {
  const dragRef = useRef(null);
  const ignoreClickRef = useRef(false);
  const activeLayer = state.layers[state.activeLayer];

  const handlePointerDown = (event) => {
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
      <div className="vezmir-diorama__toolbar" role="group" aria-label="Diorama depth controls">
        <button type="button" onClick={() => onCycleLayer(-1)} aria-label="Show nearer depth layer" title="Show nearer depth layer"><ChevronDown aria-hidden="true" /><kbd>Q</kbd></button>
        <span>{LAYER_LABELS[activeLayer]} layer</span>
        <button type="button" onClick={() => onCycleLayer(1)} aria-label="Show farther depth layer" title="Show farther depth layer"><ChevronUp aria-hidden="true" /><kbd>E</kbd></button>
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
                <span className="vezmir-hotspot__marker" aria-hidden="true">
                  {target?.found ? <Check /> : target?.hinted ? <LocateFixed /> : null}
                </span>
                <span className="sr-only">{object.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="vezmir-diorama__help"><span>Drag to pan · WASD / arrow keys to pan · Q / E changes depth</span><span>Drag to pan · tap keepsakes · depth buttons move nearer or farther</span></p>
    </section>
  );
}

function CloisterArtwork({ activeLayer }) {
  return (
    <svg className="vezmir-cloister" viewBox="0 0 1200 760" role="img" aria-label="Flat-vector isometric priory cloister with arches, garden beds, and hidden keepsakes">
      <rect width="1200" height="760" fill="#d9e6ec" />
      <path d="M0 0h1200v132L930 96 610 140 278 92 0 137Z" fill="#b4c6dc" />
      <path d="M0 112 276 72l337 52 318-47 269 41v70H0Z" fill="#eae8df" />

      <g className="diorama-layer" data-layer="background" data-active={activeLayer === "background"}>
        <path d="m180 120 425-96 421 116-421 181Z" fill="#f0ede5" stroke="#485365" strokeWidth="9" strokeLinejoin="round" />
        <path d="M180 120v300l425 181V321Z" fill="#eadfd5" stroke="#485365" strokeWidth="9" strokeLinejoin="round" />
        <path d="M1026 140v288L605 601V321Z" fill="#c0d3d0" stroke="#485365" strokeWidth="9" strokeLinejoin="round" />

        <g fill="#80adbc" stroke="#485365" strokeWidth="7" strokeLinejoin="round">
          <path d="M230 142v225l94 41V121Z" />
          <path d="M370 110v318l92 39V89Z" />
          <path d="M852 194v268l101-42V166Z" />
        </g>
        <g fill="#faf3eb" stroke="#485365" strokeWidth="7">
          <path d="M248 173q29-36 58 0v171l-58-24Z" />
          <path d="M388 142q28-36 56 0v249l-56-24Z" />
          <path d="M872 219q31-38 62 0v173l-62 26Z" />
        </g>

        <path d="M515 69 606 48l92 25-92 42Z" fill="#f8e6e6" stroke="#485365" strokeWidth="7" strokeLinejoin="round" />
        <path d="M548 99q58-64 116 0v130H548Z" fill="#d5a1a3" stroke="#485365" strokeWidth="7" />
        <path d="M565 105q41-45 82 0v113h-82Z" fill="#faf3eb" stroke="#485365" strokeWidth="5" />
        <circle cx="606" cy="127" r="18" fill="#dfd8ab" stroke="#485365" strokeWidth="5" />

        <path d="M516 231q90-87 180 0v170H516Z" fill="#9f9bb8" stroke="#485365" strokeWidth="8" />
        <path d="M540 239q66-58 132 0v148H540Z" fill="#6f728b" stroke="#485365" strokeWidth="5" />
        <path d="M540 239q34 44 66 18 33 27 66-18v148H540Z" fill="#8e89a8" />
        <path d="M603 252v129" fill="none" stroke="#485365" strokeWidth="5" />

        <g transform="translate(606 336)" stroke="#3f4858" strokeLinejoin="round">
          <path d="M-34 11q4-44 34-44t34 44v38q-34 27-68 0Z" fill="#5e5968" strokeWidth="5" />
          <path d="m-27-21 9-22 15 18 18-18 10 23" fill="#5e5968" strokeWidth="5" />
          <path d="M20 25q38 7 42 35-30 18-56 2" fill="#5e5968" strokeWidth="8" strokeLinecap="round" />
          <path d="M25 34q17 3 24 14M18 46q19 4 28 13M9 57q18 5 27 12" fill="none" stroke="#dfd8ab" strokeWidth="5" strokeLinecap="round" />
          <circle cx="-12" cy="5" r="5" fill="#f1d5a7" strokeWidth="2" />
          <circle cx="11" cy="5" r="5" fill="#f1d5a7" strokeWidth="2" />
          <path d="M-7 19q7 7 14 0" fill="none" stroke="#f1d5a7" strokeWidth="4" strokeLinecap="round" />
          <path d="m-25 30-15 18 19 4" fill="#80adbc" strokeWidth="5" />
          <path d="m25 30 15 18-19 4" fill="#80adbc" strokeWidth="5" />
        </g>

        <path d="m914 206 62-25v61l-62 25Z" fill="#faf3eb" stroke="#485365" strokeWidth="6" strokeLinejoin="round" />
        <path d="m931 218 14-18 14 5 0 27-28 11Z" fill="#d5a1a3" stroke="#485365" strokeWidth="4" />
        <path d="m941 216 8 4-8 10Z" fill="#faf3eb" />

        <g fill="#7e9d78" stroke="#485365" strokeWidth="5">
          <path d="M193 187q-45-84 29-102 64 24 25 110Z" />
          <path d="M972 206q-12-91 58-86 58 42 4 105Z" />
        </g>
        <g fill="#f8e6e6" stroke="#485365" strokeWidth="3">
          <circle cx="205" cy="127" r="11" /><circle cx="235" cy="110" r="9" /><circle cx="1012" cy="158" r="11" /><circle cx="1036" cy="177" r="9" />
        </g>
      </g>

      <g className="diorama-layer" data-layer="room" data-active={activeLayer === "room"}>
        <path d="m180 420 425-183 421 191-421 230Z" fill="#e1d7cd" stroke="#485365" strokeWidth="10" strokeLinejoin="round" />
        <g fill="none" stroke="#b9a99f" strokeWidth="3">
          <path d="m255 388 424 188M334 353l423 187M414 319l422 185M495 283l420 184" />
          <path d="m952 395-420 229M872 360 451 588M792 325 372 552M712 289 292 516" />
        </g>

        <path d="m393 418 214-92 208 94-208 113Z" fill="#b9d5d1" stroke="#485365" strokeWidth="7" strokeLinejoin="round" />
        <ellipse cx="607" cy="421" rx="136" ry="71" fill="#80adbc" stroke="#485365" strokeWidth="7" />
        <ellipse cx="607" cy="414" rx="109" ry="54" fill="#c9e1df" stroke="#485365" strokeWidth="5" />
        <path d="M570 384q37-42 74 0v69q-37 31-74 0Z" fill="#faf3eb" stroke="#485365" strokeWidth="6" />
        <path d="m586 398 21-27 22 27-22 18Z" fill="#dfd8ab" stroke="#485365" strokeWidth="4" />

        <path d="m261 426 111-49 78 36-111 57Z" fill="#cab08b" stroke="#485365" strokeWidth="7" strokeLinejoin="round" />
        <path d="m765 427 113-53 83 38-115 61Z" fill="#cab08b" stroke="#485365" strokeWidth="7" strokeLinejoin="round" />
        <g fill="#7e9d78" stroke="#485365" strokeWidth="5">
          <circle cx="308" cy="369" r="39" /><circle cx="913" cy="362" r="42" />
        </g>
        <g fill="#d5a1a3" stroke="#485365" strokeWidth="3">
          <circle cx="290" cy="352" r="11" /><circle cx="322" cy="345" r="10" /><circle cx="334" cy="375" r="9" />
          <circle cx="893" cy="344" r="12" /><circle cx="926" cy="338" r="10" /><circle cx="938" cy="370" r="9" />
        </g>

        <g transform="translate(425 287)" stroke="#485365" strokeLinejoin="round">
          <path d="m-24 6 25-17 25 17-25 18Z" fill="#dfd8ab" strokeWidth="5" />
          <path d="M1 24v34" fill="none" strokeWidth="5" />
          <path d="M-12 57h26" fill="none" strokeWidth="5" />
          <path d="m-10 3 11 7 12-8" fill="none" strokeWidth="4" />
          <path d="M18 14q17 17 0 30" fill="none" stroke="#d5a1a3" strokeWidth="6" />
        </g>

        <g transform="translate(1010 525)" stroke="#485365" strokeLinejoin="round">
          <path d="M-26 9q26-32 52 0v42q-26 19-52 0Z" fill="#d5a1a3" strokeWidth="5" />
          <path d="m-25 16 51 0" fill="none" strokeWidth="4" />
          <path d="m-10 1 8-18 8 18" fill="#eaeee0" strokeWidth="4" />
          <circle cx="-10" cy="29" r="4" fill="#dfd8ab" strokeWidth="2" />
          <circle cx="10" cy="29" r="4" fill="#dfd8ab" strokeWidth="2" />
        </g>

        <path d="m353 530 102-49 94 44-103 54Z" fill="#f8e6e6" stroke="#485365" strokeWidth="6" strokeLinejoin="round" />
        <path d="m673 530 103-51 98 46-106 57Z" fill="#dfd8ab" stroke="#485365" strokeWidth="6" strokeLinejoin="round" />
        <path d="M382 522q64-47 126 0l-62 34Z" fill="#fae9e2" stroke="#485365" strokeWidth="4" />
        <path d="M707 521q61-47 125 0l-64 36Z" fill="#f0e7bd" stroke="#485365" strokeWidth="4" />
      </g>

      <g className="diorama-layer" data-layer="foreground" data-active={activeLayer === "foreground"}>
        <path d="m79 530 526 231 529-287v89L605 760 79 589Z" fill="#a89589" stroke="#485365" strokeWidth="10" strokeLinejoin="round" />
        <path d="m79 530 526 231 529-287-108-46-421 230-425-181Z" fill="#f0e6dc" stroke="#485365" strokeWidth="10" strokeLinejoin="round" />

        <path d="m96 512 175 77-89 57-174-78Z" fill="#c9b2a6" stroke="#485365" strokeWidth="7" strokeLinejoin="round" />
        <path d="m938 517 179-94 87 44-177 101Z" fill="#a9c7c2" stroke="#485365" strokeWidth="7" strokeLinejoin="round" />
        <path d="m116 523 126 55-60 38-127-57Z" fill="#d5a1a3" stroke="#485365" strokeWidth="5" />
        <path d="m969 520 124-66 58 29-123 70Z" fill="#80adbc" stroke="#485365" strokeWidth="5" />

        <g transform="translate(205 550)" stroke="#485365" strokeLinejoin="round">
          <path d="M-30 5q30-29 60 0v45q-30 23-60 0Z" fill="#80adbc" strokeWidth="5" />
          <path d="M-21 4h42" fill="none" strokeWidth="4" />
          <path d="M-14 4v-15h28V4" fill="#faf3eb" strokeWidth="4" />
          <path d="M30 14q23 2 13 25-7 11-18 5" fill="none" strokeWidth="6" />
          <path d="m-8 22 8-8 9 8-9 7Z" fill="#dfd8ab" strokeWidth="3" />
        </g>

        <g transform="translate(740 574)" stroke="#485365" strokeLinejoin="round">
          <circle cx="0" cy="0" r="24" fill="#d5a1a3" strokeWidth="5" />
          <path d="m-13-4 9-5 5 9 10-5 1 11-13 8Z" fill="#faf3eb" strokeWidth="4" />
          <path d="m-3-10 4-13 6 14" fill="#80adbc" strokeWidth="4" />
        </g>

        <path d="M65 335h75v250H65Z" fill="#cab08b" stroke="#485365" strokeWidth="9" />
        <path d="M1082 303h74v242h-74Z" fill="#cab08b" stroke="#485365" strokeWidth="9" />
        <path d="m43 335 60-35 61 34-62 33Z" fill="#dfd8ab" stroke="#485365" strokeWidth="7" />
        <path d="m1060 303 59-33 60 32-60 34Z" fill="#dfd8ab" stroke="#485365" strokeWidth="7" />
      </g>
    </svg>
  );
}
