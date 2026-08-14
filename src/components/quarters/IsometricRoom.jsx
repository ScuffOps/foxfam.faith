import { Archive, Armchair, BookOpen, DoorOpen, Hammer, Shirt } from "lucide-react";
import FamiliarAvatar from "@/games/shared/familiar/FamiliarAvatar";
import InteractionPrompt from "@/games/shared/ui/InteractionPrompt";
import { getApprovedGameArtAsset } from "@/games/shared/art/gameArtManifest";
import { getQuartersOptionalArt } from "./quartersActiveArt.js";
import { normalizeQuartersDecor } from "./quartersDecorCatalog.js";
import { QUARTERS_SCENE_PLANE, QUARTERS_STATIONS, scenePercentToPoint } from "./quartersSceneModel";

const STATION_ICONS = {
  forge: Hammer,
  customize: Shirt,
  decorate: Armchair,
  trophies: Archive,
  collections: BookOpen,
  courtyard: DoorOpen,
};

const QUARTERS_ROOM_ASSET = getApprovedGameArtAsset("quarters.room");
const QUARTERS_FIXTURES_ASSET = getApprovedGameArtAsset("quarters.room-fixtures");
const QUARTERS_FOREGROUND_ASSET = getApprovedGameArtAsset("quarters.room-foreground");
const QUARTERS_COMPOSITE_ART_READY = Boolean(QUARTERS_ROOM_ASSET?.endsWith(".png"));
const QUARTERS_APPROVED_ART_READY = Boolean(
  QUARTERS_ROOM_ASSET
  && (QUARTERS_COMPOSITE_ART_READY || (QUARTERS_FIXTURES_ASSET && QUARTERS_FOREGROUND_ASSET)),
);
const QUARTERS_OPTIONAL_ART = getQuartersOptionalArt();
const QUARTERS_FAMILIAR_IDLE_ART = QUARTERS_OPTIONAL_ART.familiarIdle;

function getOptionalArtStyle(layer) {
  const { anchor } = layer;
  return {
    left: `${anchor.x}%`,
    top: `${anchor.y}%`,
    width: `${anchor.width}%`,
    height: `${anchor.height}%`,
    zIndex: layer.zIndex,
    transform: `translate(-${anchor.originX}%, -${anchor.originY}%)`,
  };
}

function RoomArtwork() {
  return (
    <svg
      className="quarters-scene__art"
      viewBox="0 0 1200 760"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="A cozy isometric room with a relic forge, wardrobe, trophy shelf, collection cabinet, and familiar nook"
    >
      <g className="scene-linejoin">
        <path className="scene-wall scene-wall--blue" d="M78 76 600 212v278L78 626Z" />
        <path className="scene-wall scene-wall--rose" d="m600 212 522-136v550L600 490Z" />
        <path className="scene-floor" d="m78 626 522-136 522 136-522 136Z" />
        <path className="scene-wall-shadow scene-wall-shadow--left" d="m78 589 522-136v37L78 626Z" />
        <path className="scene-wall-shadow scene-wall-shadow--right" d="m600 453 522 136v37L600 490Z" />
        <path className="scene-floor-shadow" d="m600 726 401-104 121 4-522 136-522-136 121-4Z" />

        <g className="scene-beams">
          <path d="M600 212v278M78 76l522 136 522-136M78 626l522-136 522 136" />
          <path d="m184 598 521 136m-415-164 521 136M394 543l521 135m-417-162 521 135" />
          <path d="m1016 598-521 136m415-164L389 706M806 543 285 678M702 516 181 651" />
        </g>

        <g className="room-window">
          <path d="M130 142 282 181v180l-152-39Z" />
          <path className="room-window__sky" d="m147 164 118 30v139l-118-30Z" />
          <path d="m206 180v139M147 234l118 30" />
          <path className="room-window__moon" d="M229 212c-19 5-27 31-9 43 9 6 19 5 28-1-5 18-27 29-44 18-25-16-17-55 10-64 5-2 10-1 15 4Z" />
          <circle className="room-window__star" cx="177" cy="206" r="5" />
          <circle className="room-window__star" cx="239" cy="292" r="4" />
        </g>
        <g className="wall-sprigs">
          <path d="m449 190 17 22m-10-13-14 1m20 7 13-6" />
          <circle cx="441" cy="200" r="4" />
          <circle cx="475" cy="201" r="4" />
          <path d="m746 183-18 24m11-14 14 1m-20 7-13-6" />
          <circle cx="754" cy="194" r="4" />
          <circle cx="720" cy="195" r="4" />
        </g>

        <g className="collection-cabinet">
          <path className="wood-shadow" d="m228 275 18 21v160l-18 11Z" />
          <path className="wood-dark" d="m228 275 168 44v192l-168-44Z" />
          <path className="wood" d="m246 296 132 34v160l-132-34Z" />
          <path className="glass" d="m260 315 104 27v104l-104-27Z" />
          <path d="m312 329v104m-52-66 104 27" />
          <path className="book-blue" d="m271 436 18 5v28l-18-5Z" />
          <path className="book-rose" d="m293 442 17 4v28l-17-4Z" />
          <path className="book-gold" d="m314 447 18 5v28l-18-5Z" />
          <path className="jar" d="m334 412 18 5v34l-18-5Z" />
          <path className="cabinet-sigil" d="m277 342 14 4-7 14-14-4Zm59 15 14 4-7 14-14-4Z" />
          <circle className="metal" cx="362" cy="414" r="5" />
        </g>

        <g className="trophy-shelf">
          <path className="wood-dark" d="m348 231 214 56v24l-214-56Z" />
          <path className="wood" d="m359 234 192 50v12l-192-50Z" />
          <g className="trophy-cup">
            <path d="m382 218 34 9v21c0 13-9 19-17 17-9-2-17-13-17-26Z" />
            <path d="m382 225-14-4v10c0 9 6 15 14 16m34-14 14 4v10c0 8-6 11-14 7m-17 11v13m-15-4 30 8" />
          </g>
          <g className="relic-orb">
            <circle cx="462" cy="265" r="22" />
            <path d="m452 268 8-15 8 11 11-5-8 17Z" />
          </g>
          <g className="fish-trophy">
            <path d="M502 258c18-9 37-2 44 12-12 12-31 14-45 1l-16 7 6-14-9-12Z" />
            <circle cx="532" cy="266" r="3" />
          </g>
        </g>

        <g className="familiar-nook">
          <path className="nook-rug" d="m140 472 138-36 126 33-138 36Z" />
          <path className="sofa-side" d="m134 405 155 40v99l-155-40Z" />
          <path className="sofa-front" d="m289 445 101-26v99l-101 26Z" />
          <path className="sofa-cushion" d="m153 388 144 37 79-20-144-37Z" />
          <path className="pillow pillow--blue" d="m174 396 54 14 36-10-55-14Z" />
          <path className="pillow pillow--rose" d="m237 412 48 12 34-9-49-12Z" />
          <path className="basket" d="m345 493 65 17-43 32-65-17Z" />
          <path className="blanket" d="m322 501 49 13-27 19-48-12Z" />
          <path className="plant-pot" d="m111 432 46 12-10 55-29-8Z" />
          <path className="plant" d="M128 438c-30-26-17-54 5-41 5-31 36-32 33-5 28-15 43 11 18 29 17 20-9 37-26 19Z" />
          <g className="plant-blooms">
            <circle cx="133" cy="406" r="7" />
            <circle cx="164" cy="399" r="6" />
            <circle cx="177" cy="423" r="6" />
          </g>
        </g>

        <g className="tea-table">
          <path className="wood-dark" d="m426 507 187 48-121 78-186-49Z" />
          <path className="wood" d="m426 486 187 49-121 77-186-48Z" />
          <path d="m330 570v55m257-77v53m-95 11v49" />
          <path className="tea-tray" d="m411 516 74 19-45 28-74-19Z" />
          <path className="teapot" d="m406 513 29 7 2 24-29-8Z" />
          <path d="m407 519-14 1m43 7 14 7" />
          <ellipse className="tea-cup" cx="472" cy="545" rx="13" ry="8" />
          <path className="charm-piece" d="m529 529 10 11-7 15-17 4-11-11 7-15Z" />
        </g>

        <g className="relic-forge">
          <path className="forge-side" d="m859 239 128 33v181l-128-33Z" />
          <path className="forge-front" d="m987 272 94-24v181l-94 24Z" />
          <path className="forge-top" d="m859 239 94-24 128 33-94 24Z" />
          <path className="forge-arch" d="m888 310 69 18v76l-69-18Zm15 38 39 10v25l-39-10Z" />
          <path className="forge-fire" d="m910 374 10-25 9 15 9-9 5 29Z" />
          <g className="forge-bricks">
            <path d="m877 279 92 24m-92 21 92 24m-92 21 92 24" />
            <path d="m906 286-5 20m41-11-5 20m-31 13-5 20m41-11-5 20m-31 13-5 20m41-11-5 20" />
          </g>
          <path className="forge-anvil" d="m805 321 82 21-43 28-67-18 19-13Z" />
          <path d="m832 363-8 54m30-49 9 54" />
          <path className="metal" d="m1019 254 18-4v-42l-18 4Z" />
          <path className="smoke" d="M1027 209c-19-24 15-34-4-57 23-15 31 11 21 26 24 13 10 35-17 31Z" />
        </g>

        <g className="wardrobe">
          <path className="wardrobe-side" d="m928 418 115 30v178l-115-30Z" />
          <path className="wardrobe-front" d="m1043 448 70-18v177l-70 19Z" />
          <path className="wardrobe-top" d="m928 418 70-18 115 30-70 18Z" />
          <path d="m984 433v178m59-163v178" />
          <path className="wardrobe-panel" d="m946 456 79 20v105l-79-20Zm113 11 36-9v111l-36 9Z" />
          <circle className="wardrobe-knob" cx="1029" cy="527" r="5" />
          <path className="hanger" d="m1058 480 20-5 19 11-38 10 19-21" />
          <path className="hat" d="m1059 554 35-9 12 10-48 12Z" />
        </g>

        <g className="courtyard-door">
          <path className="door-frame" d="m1004 484 100-26v147l-100 26Z" />
          <path className="door-leaf" d="m1020 506 67-17v99l-67 18Z" />
          <path className="door-window" d="m1033 522 41-11v30l-41 11Z" />
          <circle className="door-knob" cx="1071" cy="567" r="4" />
          <path className="vine" d="M1011 493c-17 17-25 40-21 67m12-42-19 1m16 22-18 11" />
          <path className="door-sigil" d="m1054 559 8 7-8 11-8-7Z" />
        </g>
      </g>
    </svg>
  );
}

function RoomDecor({ layout }) {
  const decor = normalizeQuartersDecor(layout);

  return (
    <svg className="quarters-scene__decor" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <g className="quarters-decor-art">
        <g data-decor-slot="rug" data-decor-key={decor.rug}>
          {decor.rug === "moonweave-rug" ? (
            <><path className="decor-rug decor-rug--blue" d="m420 579 180-47 180 47-180 48Z" /><path className="decor-symbol" d="M588 566q25 5 15 31-23 10-36-10 20 5 21-21Z" /></>
          ) : null}
          {decor.rug === "petal-rug" ? (
            <><path className="decor-rug decor-rug--rose" d="m420 579 180-47 180 47-180 48Z" /><path className="decor-symbol" d="m600 554 13 18 23-3-13 19 11 21-25-5-17 17-2-24-22-10 23-10Z" /></>
          ) : null}
          {decor.rug === "moss-rug" ? (
            <><path className="decor-rug decor-rug--sage" d="m420 579 180-47 180 47-180 48Z" /><path className="decor-symbol" d="M566 593q13-34 40-38-1 29-20 42 17-20 45-16-10 29-44 28Z" /></>
          ) : null}
        </g>

        <g data-decor-slot="wall" data-decor-key={decor.wall}>
          <path className={`decor-banner decor-banner--${decor.wall}`} d="m712 157 112-29v119l-56 34-56-5Z" />
          {decor.wall === "crescent-banner" ? <path className="decor-symbol" d="M767 174q31 5 18 40-30 15-47-13 26 7 29-27Z" /> : null}
          {decor.wall === "bloom-banner" ? <path className="decor-symbol" d="M768 170c25-29 43 5 22 21 31 17 3 44-20 23-18 29-46 3-24-21-30-17-3-43 22-23Z" /> : null}
          {decor.wall === "clock-banner" ? <><circle className="decor-symbol" cx="767" cy="198" r="31" /><path className="decor-line" d="m767 178v21l17 10" /></> : null}
        </g>

        <g data-decor-slot="shelf" data-decor-key={decor.shelf}>
          {decor.shelf === "star-lantern" ? <><path className="decor-prop decor-prop--gold" d="m485 228 27 7 9 43-34-9Z" /><path className="decor-line" d="m489 228 8-15 16 4 6 18m-17 6v25" /></> : null}
          {decor.shelf === "fish-keepsake" ? <path className="decor-prop decor-prop--blue" d="M470 250q28-30 58-1-25 32-56 9l-18 10 5-17-8-15Z" /> : null}
          {decor.shelf === "bloom-vase" ? <><path className="decor-prop decor-prop--rose" d="m484 243 31 8-6 32-22-6Z" /><path className="decor-line" d="m499 246-8-23m8 13 17-13m-21 7-12-8" /></> : null}
        </g>

        <g data-decor-slot="nook" data-decor-key={decor.nook}>
          {decor.nook === "moon-cushion" ? <><path className="decor-cushion decor-cushion--blue" d="m213 492 74-19 49 13-74 20Z" /><path className="decor-symbol" d="M267 480q17 4 10 20-15 7-24-7 13 3 14-13Z" /></> : null}
          {decor.nook === "petal-cushion" ? <><path className="decor-cushion decor-cushion--rose" d="m213 492 74-19 49 13-74 20Z" /><path className="decor-symbol" d="M270 477c12-14 22 3 11 10 15 9 1 21-10 11-9 14-22 2-11-10-15-8-1-21 10-11Z" /></> : null}
          {decor.nook === "moss-basket" ? <><path className="decor-cushion decor-cushion--sage" d="m213 489 74-19 49 13-74 20Z" /><path className="decor-line" d="m231 484 31 19m-3-25 31 18m-2-25 31 18" /></> : null}
        </g>
      </g>
    </svg>
  );
}

export default function IsometricRoom({ cursor, selectedStation, nearbyStation, familiar, decor, onMove, onActivate }) {
  const useApprovedFamiliarFallback = !familiar && QUARTERS_FAMILIAR_IDLE_ART;
  const handleFloorClick = (event) => {
    if (event.target.closest("button")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    onMove({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    });
  };

  return (
    <section
      className="quarters-scene"
      aria-label="Personal Quarters"
      data-scene-coordinate-space={`${QUARTERS_SCENE_PLANE.width}x${QUARTERS_SCENE_PLANE.height}`}
    >
      <div className="quarters-scene__world" onClick={handleFloorClick}>
        {QUARTERS_APPROVED_ART_READY ? (
          <>
            <img
              className="quarters-scene__illustration quarters-scene__illustration--room"
              data-scene-layer="environment"
              src={QUARTERS_ROOM_ASSET}
              alt=""
              aria-hidden="true"
              draggable="false"
            />
            {!QUARTERS_COMPOSITE_ART_READY ? (
              <img
                className="quarters-scene__illustration quarters-scene__illustration--fixtures"
                data-scene-layer="fixtures"
                src={QUARTERS_FIXTURES_ASSET}
                alt=""
                aria-hidden="true"
                draggable="false"
              />
            ) : null}
          </>
        ) : <RoomArtwork />}
        {!QUARTERS_COMPOSITE_ART_READY ? <RoomDecor layout={decor} /> : null}
        {QUARTERS_OPTIONAL_ART.props.map((layer) => (
          <img
            key={layer.layerId}
            id={layer.layerId}
            className="quarters-scene__optional-art quarters-scene__optional-art--prop"
            data-art-slot={layer.slotId}
            data-scene-layer="optional-prop"
            src={layer.assetPath}
            style={getOptionalArtStyle(layer)}
            alt=""
            aria-hidden="true"
            draggable="false"
          />
        ))}

        {QUARTERS_STATIONS.map((station) => {
          const Icon = STATION_ICONS[station.key];
          const point = scenePercentToPoint(station);
          return (
            <button
              key={station.key}
              type="button"
              data-station-key={station.key}
              className={`quarters-hotspot quarters-hotspot--${station.key} ${selectedStation === station.key ? "is-selected" : ""} ${nearbyStation === station.key ? "is-nearby" : ""}`}
              style={{ left: `${station.x}%`, top: `${station.y}%` }}
              data-scene-x={point.x}
              data-scene-y={point.y}
              onClick={(event) => { event.stopPropagation(); onActivate(station.key); }}
              aria-label={station.label}
              aria-pressed={selectedStation === station.key}
              title={station.label}
            >
              <span className="quarters-hotspot__icon"><Icon aria-hidden="true" /></span>
              <span className="quarters-hotspot__label">{station.label}</span>
            </button>
          );
        })}

        <div
          className="quarters-scene__familiar"
          style={{
            left: `${cursor.x}%`,
            top: `${cursor.y}%`,
            ...(useApprovedFamiliarFallback ? { width: "clamp(72px, 10vw, 118px)", aspectRatio: "3 / 4" } : {}),
          }}
        >
          <span className="quarters-scene__familiar-shadow" aria-hidden="true" />
          {useApprovedFamiliarFallback ? (
            <img
              id={QUARTERS_FAMILIAR_IDLE_ART.layerId}
              className="quarters-scene__optional-art quarters-scene__optional-art--familiar"
              data-art-slot={QUARTERS_FAMILIAR_IDLE_ART.slotId}
              data-scene-layer="optional-familiar"
              src={QUARTERS_FAMILIAR_IDLE_ART.assetPath}
              style={getOptionalArtStyle(QUARTERS_FAMILIAR_IDLE_ART)}
              alt=""
              aria-hidden="true"
              draggable="false"
            />
          ) : (
            <FamiliarAvatar familiar={familiar} size="clamp(72px, 10vw, 118px)" pose="walk" />
          )}
        </div>

        {QUARTERS_APPROVED_ART_READY && !QUARTERS_COMPOSITE_ART_READY ? (
          <img
            className="quarters-scene__illustration quarters-scene__illustration--foreground"
            data-scene-layer="foreground"
            src={QUARTERS_FOREGROUND_ASSET}
            alt=""
            aria-hidden="true"
            draggable="false"
          />
        ) : null}
      </div>
      <InteractionPrompt
        keys={["E"]}
        label={nearbyStation ? `Interact with ${QUARTERS_STATIONS.find((station) => station.key === nearbyStation)?.label}` : "Walk near a station"}
        className="quarters-scene__prompt"
      />
    </section>
  );
}
