import { ArrowLeft, MapPin } from "lucide-react";
import FamiliarAvatar from "@/games/shared/familiar/FamiliarAvatar";
import { getApprovedGameArtAsset } from "@/games/shared/art/gameArtManifest";
import { buildCourtyardStations } from "./quartersSceneModel";

const PRIORY_COURTYARD_ASSET = getApprovedGameArtAsset("quarters.courtyard");

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

        <g className="priory-building" data-world-key="match-merge">
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

        <g className="garden garden--left" data-world-key="word-garden">
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

        <g className="courtyard-landmarks" aria-hidden="true">
          <g className="courtyard-landmark courtyard-landmark--vezmir" data-world-key="puzzle-cat" transform="translate(158 470)">
            <path className="landmark-shadow" d="m-55 90 142-34 94 22-143 35Z" />
            <path className="landmark-stone" d="m-40 72 115-27 78 19-115 28Z" />
            <path className="landmark-wall" d="m-18 63 22-35 18 26M98 45l17-29 18 23" />
            <path className="landmark-arch" d="M30 54V18c0-24 42-24 42 0v26" />
            <path className="landmark-vine" d="M1 69c12-9 22-17 31-28M116 53c-10-8-18-15-24-25" />
            <circle className="landmark-flower" cx="1" cy="67" r="6" />
            <circle className="landmark-flower" cx="116" cy="52" r="6" />
          </g>

          <g className="courtyard-landmark courtyard-landmark--pier" data-world-key="starfishing" transform="translate(502 514)">
            <path className="landmark-shadow" d="m-18 78 154 37 70-18-153-38Z" />
            <path className="pier-top" d="m0 51 121 29 55-13-121-30Z" />
            <path className="pier-front" d="m0 51 55 14v18L0 69ZM55 65l121-29v18L55 83Z" />
            <path className="pier-posts" d="M11 67v31M49 77v31M143 50v29M174 42v28" />
            <path className="pier-rope" d="M11 85c13-9 25-6 38 8M143 66c11-8 21-7 31-3" />
            <path className="pier-boat" d="m83 91 58 14c-13 19-43 21-69 6Z" />
          </g>

          <g className="courtyard-landmark courtyard-landmark--clock" data-world-key="time-runner" transform="translate(886 430)">
            <path className="landmark-shadow" d="m-35 163 110-26 72 17-109 27Z" />
            <path className="clock-side" d="m25 33 51 12v105l-51-12Z" />
            <path className="clock-front" d="m76 45 49-12v105l-49 12Z" />
            <path className="clock-roof" d="M10 36 75 4l67 31-66 18Z" />
            <path className="clock-spire" d="M75 4 88-28l7 34Z" />
            <ellipse className="clock-face" cx="100" cy="68" rx="18" ry="22" transform="rotate(-13 100 68)" />
            <path className="clock-hands" d="m100 68 1-13m-1 13 10 5" />
            <path className="clock-door" d="m91 104 20-5v34l-20 5Z" />
          </g>

          <g className="courtyard-landmark courtyard-landmark--boba" data-world-key="boba-cafe" transform="translate(944 179)">
            <path className="landmark-shadow" d="m-66 117 151-36 96 23-150 36Z" />
            <path className="cart-side" d="m-42 65 75 18v48l-75-18Z" />
            <path className="cart-front" d="m33 83 100-24v48L33 131Z" />
            <path className="cart-counter" d="m-54 61 119-28 82 20L33 83Z" />
            <path className="cart-awning" d="m-37 18 112-26 58 14-111 27Z" />
            <path className="cart-awning-stripes" d="m-8 11 24 6m14-15 24 6m14-15 24 6" />
            <path className="cart-posts" d="M-34 23v38M128 8v45" />
            <circle className="cart-wheel" cx="-18" cy="120" r="13" />
            <circle className="cart-wheel" cx="104" cy="111" r="13" />
            <path className="cart-cup" d="m46 49 24-6-4 25-16 4Z" />
            <circle className="cart-pearl" cx="54" cy="61" r="3" />
            <circle className="cart-pearl" cx="62" cy="59" r="3" />
          </g>
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
        {PRIORY_COURTYARD_ASSET ? (
          <img
            className="courtyard-scene__illustration"
            src={PRIORY_COURTYARD_ASSET}
            alt=""
            aria-hidden="true"
            draggable="false"
          />
        ) : <CourtyardArtwork />}
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
