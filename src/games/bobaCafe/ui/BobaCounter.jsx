import FamiliarAvatar from "@/games/shared/familiar/FamiliarAvatar";
import { BOBA_INGREDIENTS_BY_KEY, SWEETNESS_BY_KEY } from "../content/bobaCatalog";

export default function BobaCounter({ order, tray, phase, result }) {
  const tea = BOBA_INGREDIENTS_BY_KEY[tray?.tea];
  const milk = BOBA_INGREDIENTS_BY_KEY[tray?.milk];
  const topping = BOBA_INGREDIENTS_BY_KEY[tray?.topping];
  const charm = BOBA_INGREDIENTS_BY_KEY[tray?.charm];
  const sweetness = SWEETNESS_BY_KEY[tray?.sweetness];

  return (
    <section className="boba-counter" aria-label="Moonbrew shrine cafe counter">
      <div className="boba-counter__wall" aria-hidden="true">
        <span className="boba-counter__window" />
        <span className="boba-counter__menu">MOONBREW<br />TEA · PEARLS · CHARMS</span>
        <span className="boba-counter__shelf"><i /><i /><i /></span>
      </div>

      <div className="boba-counter__customer" aria-label={order?.customer?.label || "Cafe guest"}>
        <span className="boba-counter__customer-head" style={{ "--guest-coat": order?.customer?.palette?.[0] || "#d5a1a3" }} />
        <span className="boba-counter__customer-body" style={{ "--guest-apron": order?.customer?.palette?.[1] || "#b4c6dc" }} />
        <p>{result?.message || order?.label || "Shift complete"}</p>
      </div>

      <div className="boba-counter__familiar">
        <FamiliarAvatar size={88} pose="idle" familiar={{ species: "cat", coat: "cream", markings: "mask", outfit: "apron", accessory: "none", charmFx: "none" }} />
      </div>

      <div className="boba-counter__bar" aria-hidden="true">
        <span className="boba-counter__jar boba-counter__jar--one" />
        <span className="boba-counter__jar boba-counter__jar--two" />
        <span className="boba-counter__register" />
      </div>

      <div className="boba-cup" data-phase={phase}>
        <span className="boba-cup__straw" />
        <span className="boba-cup__lid" style={{ "--cup-charm": charm?.accent || "#f8e6e6" }} />
        <span className="boba-cup__glass">
          <i className="boba-cup__milk" style={{ "--cup-milk": milk?.accent || tea?.accent || "#d9e6ec" }} />
          <i className="boba-cup__tea" style={{ "--cup-tea": tea?.accent || "#80adbc" }} />
          {topping ? Array.from({ length: 8 }, (_, index) => <b key={index} style={{ "--pearl": topping.accent }} />) : null}
        </span>
        <em>{sweetness ? `${sweetness.value}%` : "ready"}</em>
      </div>
    </section>
  );
}
