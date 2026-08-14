import FamiliarAvatar from "@/games/shared/familiar/FamiliarAvatar";
import { getApprovedGameArtFamily } from "@/games/shared/art/gameArtManifest";
import {
  BOBA_CAFE_CUSTOMER_ATLAS,
  BOBA_CAFE_DRINK_ATLAS,
  getBobaCafeAtlasCell,
  getBobaCafeDrinkState,
  resolveApprovedBobaCafeAuthoredArt,
} from "../art/bobaCafeAuthoredArt";
import { BOBA_INGREDIENTS_BY_KEY, SWEETNESS_BY_KEY } from "../content/bobaCatalog";
import BobaAtlasSprite from "./BobaAtlasSprite";

const BOBA_APPROVED_ART = getApprovedGameArtFamily([
  "boba-cafe.room-bg",
  "boba-cafe.workstations",
  "boba-cafe.counter-fg",
]);
const BOBA_ENVIRONMENT_ASSET = BOBA_APPROVED_ART?.["boba-cafe.room-bg"] || null;
const BOBA_WORKSTATIONS_ASSET = BOBA_APPROVED_ART?.["boba-cafe.workstations"] || null;
const BOBA_COUNTER_FOREGROUND_ASSET = BOBA_APPROVED_ART?.["boba-cafe.counter-fg"] || null;
const BOBA_APPROVED_ART_READY = Boolean(BOBA_APPROVED_ART);
const BOBA_AUTHORED_ART = resolveApprovedBobaCafeAuthoredArt();

const CUSTOMER_FAMILIARS = Object.freeze({
  "choir-helper": { species: "cloud-poodle", coat: "lily", markings: "petal-cheeks", outfit: "priory-apron", accessory: "hymn-charm", charmFx: "none" },
  "library-visitor": { species: "moon-rabbit", coat: "lavender", markings: "moon-brow", outfit: "stargazer-cape", accessory: "moon-ribbon", charmFx: "none" },
  "courtyard-runner": { species: "fox-cat", coat: "rose", markings: "soft-mask", outfit: "teal-tunic", accessory: "none", charmFx: "none" },
  "relic-polisher": { species: "moss-turtle", coat: "taupe", markings: "temple-mask", outfit: "priory-apron", accessory: "forge-goggles", charmFx: "none" },
  "vesper-guest": { species: "shrine-cat", coat: "cream", markings: "brow-star", outfit: "rose-cardigan", accessory: "petal-crown", charmFx: "none" },
});

function CafeCustomer({ customer }) {
  const familiar = CUSTOMER_FAMILIARS[customer?.key] || CUSTOMER_FAMILIARS["choir-helper"];
  const customerCell = getBobaCafeAtlasCell(BOBA_CAFE_CUSTOMER_ATLAS, customer?.key);

  return (
    <div className="boba-counter__customer">
      {BOBA_AUTHORED_ART ? (
        <BobaAtlasSprite
          atlas={BOBA_CAFE_CUSTOMER_ATLAS}
          cell={customerCell}
          src={BOBA_AUTHORED_ART.customers}
          className="boba-counter__customer-art"
        />
      ) : (
        <FamiliarAvatar familiar={familiar} size="clamp(108px, 13vw, 164px)" pose="idle" />
      )}
    </div>
  );
}

export default function BobaCounter({ familiar, order, tray, phase, result }) {
  const tea = BOBA_INGREDIENTS_BY_KEY[tray?.tea];
  const milk = BOBA_INGREDIENTS_BY_KEY[tray?.milk];
  const topping = BOBA_INGREDIENTS_BY_KEY[tray?.topping];
  const charm = BOBA_INGREDIENTS_BY_KEY[tray?.charm];
  const sweetness = SWEETNESS_BY_KEY[tray?.sweetness];
  const drinkState = getBobaCafeDrinkState(tray);
  const drinkCell = getBobaCafeAtlasCell(BOBA_CAFE_DRINK_ATLAS, drinkState);

  return (
    <section
      className="boba-counter"
      aria-label="Moonbrew shrine cafe counter"
      data-scene-coordinate-space="1920x1080"
    >
      {BOBA_APPROVED_ART_READY ? (
        <img
          className="boba-counter__layer boba-counter__layer--environment"
          data-scene-layer="environment"
          src={BOBA_ENVIRONMENT_ASSET}
          alt=""
          aria-hidden="true"
          draggable="false"
        />
      ) : <svg
        className="boba-counter__layer boba-counter__layer--environment"
        data-scene-layer="environment"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="A cozy isometric tea counter with a kettle, pearl jars, sealing machine, and garden window"
      >
        <g transform="translate(110 0) scale(1.77)">
        <path className="boba-art__wall" d="M0 0h960v344L480 500 0 344Z" />
        <path className="boba-art__floor" d="M0 344 480 500l480-156v266H0Z" />
        <g className="boba-art__floor-lines">
          <path d="m112 380 368 120 368-120M42 444l438 143 438-143M254 427 109 610M410 478 333 610M550 478l77 132M706 427l145 183" />
        </g>

        <g className="boba-art__window">
          <path className="boba-art__frame" d="M70 58h290v194H70Z" />
          <path className="boba-art__sky" d="M86 74h258v162H86Z" />
          <path className="boba-art__garden" d="M86 171c55-45 95-18 132-51 43 28 80 11 126 50v66H86Z" />
          <path className="boba-art__mullion" d="M215 74v162M86 153h258" />
          <path className="boba-art__cloud" d="M116 112c13-23 43-18 48 2 17-9 38 3 36 22h-90c-5-10-1-19 6-24ZM261 98c11-18 35-13 39 4 15-7 31 3 29 18h-76c-4-8 0-17 8-22Z" />
        </g>

        <g className="boba-art__sign">
          <path className="boba-art__paper" d="M617 51 853 72l-13 138-236-21Z" />
          <path className="boba-art__ink" d="M659 94h150M684 125h99M645 158h177" />
          <path className="boba-art__moon" d="M634 79c20 3 30 25 17 41-16-2-26-21-17-41Z" />
          <text x="719" y="113">MOONBREW</text>
          <text x="698" y="149">TEA AND CHARMS</text>
        </g>
        </g>
      </svg>}

      {BOBA_APPROVED_ART_READY ? (
        <img
          className="boba-counter__layer boba-counter__layer--workstations"
          data-scene-layer="workstations"
          src={BOBA_WORKSTATIONS_ASSET}
          alt=""
          aria-hidden="true"
          draggable="false"
        />
      ) : <svg
        className="boba-counter__layer boba-counter__layer--workstations"
        data-scene-layer="workstations"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <g transform="translate(110 0) scale(1.77)">
        <g className="boba-art__shelf">
          <path className="boba-art__wood-top" d="m601 260 257 23-25 22-257-24Z" />
          <path className="boba-art__wood-front" d="m576 281 257 24v18l-257-24Z" />
          <g className="boba-art__jar" transform="translate(619 209)">
            <path d="M0 10 23 0l30 3 10 14-5 53-25 12L5 70Z" />
            <path className="boba-art__jar-fill boba-art__jar-fill--rose" d="m7 38 49 5-3 24-21 10-22-10Z" />
            <path className="boba-art__lid" d="m0 10 23-10 30 3 10 14-26 10-32-3Z" />
          </g>
          <g className="boba-art__jar" transform="translate(700 216)">
            <path d="M0 10 23 0l30 3 10 14-5 53-25 12L5 70Z" />
            <path className="boba-art__jar-fill boba-art__jar-fill--gold" d="m7 38 49 5-3 24-21 10-22-10Z" />
            <path className="boba-art__lid" d="m0 10 23-10 30 3 10 14-26 10-32-3Z" />
          </g>
          <g className="boba-art__jar" transform="translate(779 224)">
            <path d="M0 10 23 0l30 3 10 14-5 53-25 12L5 70Z" />
            <path className="boba-art__jar-fill boba-art__jar-fill--teal" d="m7 38 49 5-3 24-21 10-22-10Z" />
            <path className="boba-art__lid" d="m0 10 23-10 30 3 10 14-26 10-32-3Z" />
          </g>
        </g>

        <g className="boba-art__counter">
          <path className="boba-art__counter-top" d="m180 361 519-79 201 80-522 91Z" />
          <path className="boba-art__counter-front" d="m378 453 522-91v159l-522 89Z" />
          <path className="boba-art__counter-side" d="m180 361 198 92v157l-198-93Z" />
          <path className="boba-art__panel" d="m421 478 142-24v94l-142 25ZM601 447l142-25v95l-142 24ZM782 415l87-15v94l-87 15Z" />
          <path className="boba-art__counter-trim" d="m180 395 198 91 522-90" />
        </g>

        <g className="boba-art__kettle" transform="translate(242 285)">
          <path className="boba-art__metal" d="M25 30c0-30 69-30 69 0l-5 65H30Z" />
          <path className="boba-art__metal-dark" d="M33 16h54l-8-20H42ZM90 40c35 0 45 35 18 53" />
          <path className="boba-art__handle" d="M30 36C-6 41-5 91 29 92" />
          <path className="boba-art__button" d="M55 47h12v12H55Z" />
        </g>

        <g className="boba-art__sealer" transform="translate(725 282)">
          <path className="boba-art__machine" d="M0 35 58 13l70 23v74l-63 24-65-24Z" />
          <path className="boba-art__machine-top" d="M0 35 58 13l70 23-63 24Z" />
          <path className="boba-art__screen" d="m79 48 31 10v22L79 70Z" />
          <path className="boba-art__slot" d="m21 78 43-15 39 13-43 17Z" />
        </g>
        </g>
      </svg>}

      <div className="boba-counter__characters" data-scene-layer="characters">
        <CafeCustomer customer={order?.customer} />

        <div className="boba-counter__familiar" aria-label="Your familiar helps behind the counter">
          <FamiliarAvatar size="clamp(104px, 12vw, 156px)" pose="idle" familiar={familiar} />
        </div>
      </div>

      {BOBA_APPROVED_ART_READY ? (
        <img
          className="boba-counter__layer boba-counter__layer--counter-foreground"
          data-scene-layer="counter-foreground"
          src={BOBA_COUNTER_FOREGROUND_ASSET}
          alt=""
          aria-hidden="true"
          draggable="false"
        />
      ) : null}

      <div className="boba-counter__interface" data-scene-layer="interface">
        <div className="boba-counter__speech" aria-live="polite">
          <span>{order?.customer?.label || "Cafe guest"}</span>
          <p>{result?.message || order?.label || "Shift complete"}</p>
        </div>

        <div className="boba-cup" data-phase={phase} aria-label="Drink being prepared">
          {BOBA_AUTHORED_ART ? (
            <BobaAtlasSprite
              atlas={BOBA_CAFE_DRINK_ATLAS}
              cell={drinkCell}
              src={BOBA_AUTHORED_ART.drinkStates}
              className="boba-cup__authored-art"
            />
          ) : (
            <>
              <span className="boba-cup__straw" />
              <span className="boba-cup__lid" style={{ "--cup-charm": charm?.accent || "#f8e6e6" }} />
              <span className="boba-cup__glass">
                <i className="boba-cup__milk" style={{ "--cup-milk": milk?.accent || tea?.accent || "#d9e6ec" }} />
                <i className="boba-cup__tea" style={{ "--cup-tea": tea?.accent || "#80adbc" }} />
                {topping ? Array.from({ length: 8 }, (_, index) => <b key={index} style={{ "--pearl": topping.accent }} />) : null}
              </span>
            </>
          )}
          <em>{sweetness ? `${sweetness.value}%` : "ready"}</em>
        </div>
      </div>
    </section>
  );
}
