import { ArrowLeft, MapPin } from "lucide-react";
import FamiliarAvatar from "@/games/shared/familiar/FamiliarAvatar";
import { buildCourtyardStations } from "./quartersSceneModel";

function CourtyardArtwork() {
  return (
    <svg
      className="courtyard-scene__art"
      viewBox="0 0 1200 760"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="An isometric Priory courtyard with a chapel, constellation pond, gardens, and paths to other worlds"
    >
      <g className="scene-linejoin">
        <path className="courtyard-ground" d="M30 146 600 12l570 134v478L600 758 30 624Z" />
        <path className="courtyard-border" d="M30 146 600 280l570-134M600 280v478" />

        <g className="priory-building">
          <path className="priory-side" d="m430 76 173 41v177l-173-41Z" />
          <path className="priory-front" d="m603 117 169-40v177l-169 40Z" />
          <path className="priory-roof" d="m399 84 202-71 202 71-200 76Z" />
          <path className="priory-roof priory-roof--cap" d="m500 41 101-35 101 35-100 39Z" />
          <path className="priory-door" d="m660 182 55-13v70l-55 13Z" />
          <path className="priory-window" d="m477 150 62 15v55l-62-15Z" />
          <path className="priory-window" d="m721 118 28-7v36l-28 7Z" />
          <path className="priory-star" d="m601 86 8 15 17 2-12 12 3 17-16-8-15 8 3-17-12-12 17-2Z" />
        </g>

        <g className="courtyard-paths">
          <path d="m570 291 63-15 11 47-63 15Z" />
          <path d="m553 351 95-22 24 101-95 22Z" />
          <path d="m354 409 217-52 19 80-217 51Z" />
          <path d="m654 332 245 58-20 80-244-57Z" />
          <path d="m359 493 219-52 22 92-219 51Z" />
          <path d="m621 432 230 54-22 93-230-54Z" />
          <path d="m528 552 73-18 74 18-74 91Z" />
        </g>

        <g className="constellation-pond">
          <path className="pond-rim" d="M366 388c91-82 278-90 405-18 110 62 83 153-59 190-138 36-337 0-390-68-29-37-10-71 44-104Z" />
          <path className="pond-water" d="M385 402c83-69 248-76 361-17 96 50 70 124-58 156-122 29-294 0-341-55-27-31-9-57 38-84Z" />
          <path className="pond-shine" d="M421 429c41-27 93-40 143-42m121 19c31 7 56 18 72 31" />
          <g className="pond-stars">
            <circle cx="465" cy="448" r="7" /><circle cx="531" cy="418" r="5" /><circle cx="596" cy="468" r="8" />
            <circle cx="661" cy="426" r="5" /><circle cx="708" cy="475" r="7" /><circle cx="561" cy="517" r="5" />
            <path d="m465 448 66-30 65 50 65-42 47 49-147 42-96-69Z" />
          </g>
          <path className="lily-pad" d="M417 495c25-14 55-8 59 9-12 16-44 20-63 6l25-9Z" />
          <path className="lily-pad" d="M689 504c24-13 50-8 54 8-11 15-40 18-57 6l22-9Z" />
          <path className="pond-flower" d="M437 494c-9-10 2-20 11-11 1-13 17-13 18 0 10-9 21 2 12 12-5 7-28 7-41-1Z" />
        </g>

        <g className="garden garden--left">
          <path className="garden-bed" d="m76 341 214-50 120 28-215 51Z" />
          <path className="garden-soil" d="m102 338 188-44 91 22-188 44Z" />
          <g className="garden-stems"><path d="m140 333 8-34m43 24 6-35m48 25 8-36m44 27 5-32m35 23 8-27" /></g>
          <g className="garden-blooms"><circle cx="149" cy="296" r="12" /><circle cx="198" cy="285" r="11" /><circle cx="247" cy="274" r="13" /><circle cx="304" cy="269" r="10" /><circle cx="347" cy="255" r="12" /></g>
        </g>

        <g className="garden garden--right">
          <path className="garden-bed" d="m835 283 190-45 111 27-191 45Z" />
          <path className="garden-soil" d="m859 282 166-39 83 20-166 39Z" />
          <g className="garden-stems"><path d="m891 278 4-32m43 21 6-31m45 21 8-32m44 23 4-29m36 21 7-27" /></g>
          <g className="garden-blooms"><circle cx="895" cy="244" r="10" /><circle cx="944" cy="233" r="12" /><circle cx="997" cy="222" r="11" /><circle cx="1047" cy="217" r="13" /><circle cx="1089" cy="207" r="10" /></g>
        </g>

        <g className="courtyard-trees">
          <g transform="translate(82 146)"><path className="tree-trunk" d="m52 94 30 7-7 85-30-7Z" /><path className="tree-crown tree-crown--rose" d="M16 91C-9 60 15 35 45 43 44 9 84 1 95 32c30-10 49 21 29 43 24 23-7 54-34 42-13 27-56 18-57-10-17 2-28-4-17-16Z" /></g>
          <g transform="translate(1000 400)"><path className="tree-trunk" d="m52 94 30 7-7 85-30-7Z" /><path className="tree-crown tree-crown--blue" d="M16 91C-9 60 15 35 45 43 44 9 84 1 95 32c30-10 49 21 29 43 24 23-7 54-34 42-13 27-56 18-57-10-17 2-28-4-17-16Z" /></g>
          <g transform="translate(72 500) scale(.78)"><path className="tree-trunk" d="m52 94 30 7-7 85-30-7Z" /><path className="tree-crown" d="M16 91C-9 60 15 35 45 43 44 9 84 1 95 32c30-10 49 21 29 43 24 23-7 54-34 42-13 27-56 18-57-10-17 2-28-4-17-16Z" /></g>
        </g>

        <g className="courtyard-lanterns">
          <g transform="translate(317 367)"><path d="M0 0v74" /><path className="lantern" d="m-12 7 12-12L12 7 6 32l-12 3Z" /></g>
          <g transform="translate(862 401)"><path d="M0 0v74" /><path className="lantern" d="m-12 7 12-12L12 7 6 32l-12 3Z" /></g>
          <g transform="translate(394 578)"><path d="M0 0v64" /><path className="lantern" d="m-12 7 12-12L12 7 6 32l-12 3Z" /></g>
          <g transform="translate(810 581)"><path d="M0 0v64" /><path className="lantern" d="m-12 7 12-12L12 7 6 32l-12 3Z" /></g>
        </g>
      </g>
    </svg>
  );
}

export default function PrioryCourtyard({ worlds, familiar, onBack, onEnterWorld }) {
  const stations = buildCourtyardStations(worlds);

  return (
    <section className="courtyard-scene" aria-label="Priory Courtyard">
      <button type="button" className="courtyard-scene__back" onClick={onBack}>
        <ArrowLeft aria-hidden="true" /> <span>Quarters</span>
      </button>

      <div className="courtyard-scene__world">
        <CourtyardArtwork />
        {stations.map((station) => (
          <button
            key={station.key}
            type="button"
            className={`courtyard-gate courtyard-gate--${station.key}`}
            style={{ left: `${station.x}%`, top: `${station.y}%` }}
            onClick={() => onEnterWorld(station.route)}
            aria-label={`Enter ${station.label}. Rewards include ${station.rewardFocus}.`}
          >
            <span className="courtyard-gate__arch" aria-hidden="true"><MapPin /></span>
            <span className="courtyard-gate__sign">
              <strong>{station.shortLabel}</strong>
              <small>{station.rewardFocus.split(",")[0]}</small>
            </span>
          </button>
        ))}

        <div className="courtyard-scene__familiar">
          <span className="courtyard-scene__familiar-shadow" aria-hidden="true" />
          <FamiliarAvatar familiar={familiar} size="clamp(66px, 8vw, 102px)" />
        </div>
      </div>
    </section>
  );
}
