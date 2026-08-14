import { useId } from "react";
import { Check, Clock3 } from "lucide-react";
import { getIngredientLabel } from "../content/bobaCatalog";

const RECIPE_FIELDS = [
  ["tea", "Tea"],
  ["milk", "Milk"],
  ["topping", "Pearls"],
  ["charm", "Charm"],
  ["sweetness", "Sweet"],
];

export default function BobaOrderTicket({ order, tray, patiencePercent = 0, ticketNumber, ticketTotal, compact = false }) {
  const titleId = useId();
  const filledSegments = Math.ceil(Math.max(0, patiencePercent) / 10);
  const matchedCount = RECIPE_FIELDS.filter(([key]) => order && tray?.[key] === order.recipe[key]).length;

  return (
    <article className={`boba-ticket${compact ? " boba-ticket--compact" : ""}`} aria-labelledby={titleId}>
      <header className="boba-ticket__header">
        <div>
          <p>Order {ticketNumber} of {ticketTotal}</p>
          <h2 id={titleId}>{order?.label || "Counter closed"}</h2>
        </div>
        <span className="boba-ticket__progress-copy">{matchedCount}/{RECIPE_FIELDS.length}</span>
        <Clock3 aria-hidden="true" />
      </header>

      <div
        className="boba-patience"
        role="progressbar"
        aria-label="Customer patience"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={patiencePercent}
      >
        {Array.from({ length: 10 }, (_, index) => (
          <span key={index} data-filled={index < filledSegments} />
        ))}
      </div>

      <p className="boba-ticket__customer">For {order?.customer?.label || "the last guest"}</p>
      <dl className="boba-ticket__recipe">
        {RECIPE_FIELDS.map(([key, label]) => {
          const matched = Boolean(order && tray?.[key] === order.recipe[key]);
          return (
            <div key={key} data-matched={matched}>
              <dt>{label}</dt>
              <dd>{getIngredientLabel(order?.recipe?.[key])}</dd>
              {matched ? <Check aria-label="Prepared" /> : <span aria-hidden="true" />}
            </div>
          );
        })}
      </dl>
    </article>
  );
}
