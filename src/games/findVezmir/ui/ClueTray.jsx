import { Check, Eye, LockKeyhole, Search } from "lucide-react";

export default function ClueTray({ targets, activeHintRegion }) {
  return (
    <section className="vezmir-clue-tray" aria-labelledby="vezmir-clue-title">
      <div className="vezmir-clue-tray__title">
        <span aria-hidden="true"><Eye /></span>
        <div>
          <p>Priory casebook</p>
          <h2 id="vezmir-clue-title">Clue tray</h2>
        </div>
      </div>

      {activeHintRegion ? (
        <p className="vezmir-clue-tray__hint" role="status">Look around the <strong>{activeHintRegion}</strong>.</p>
      ) : null}

      <ol className="vezmir-clue-list">
        {targets.map((target) => (
          <li key={target.key} data-found={target.found || undefined} data-hinted={target.hinted || undefined}>
            <span className="vezmir-clue-list__icon" aria-hidden="true">
              {target.found ? <Check /> : target.locked ? <LockKeyhole /> : <Search />}
            </span>
            <span>
              <strong>{target.label}</strong>
              <small>{target.locked ? "Fill the tray to coax them out" : target.region}</small>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
