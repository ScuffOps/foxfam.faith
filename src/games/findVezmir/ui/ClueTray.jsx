import { Check, Eye, LockKeyhole, Search } from "lucide-react";
import {
  FIND_VEZMIR_CLUE_ATLAS,
  FIND_VEZMIR_INTERACTIVE_ART,
  getFindVezmirAtlasStyle,
} from "../art/findVezmirInteractiveArt.js";

export default function ClueTray({ targets, activeHintRegion, currentTargetKey, foundCount = 0 }) {
  return (
    <details className="vezmir-clue-tray">
      <summary className="vezmir-clue-tray__title">
        <span aria-hidden="true"><Eye /></span>
        <div>
          <p>Priory casebook</p>
          <strong>Clue journal</strong>
        </div>
        <small>{foundCount}/{targets.length}</small>
      </summary>

      <div className="vezmir-clue-tray__body">
        {activeHintRegion ? (
          <p className="vezmir-clue-tray__hint" role="status">Look around the <strong>{activeHintRegion}</strong>.</p>
        ) : null}

        <ol className="vezmir-clue-list" aria-label="Clue progress">
          {targets.map((target) => (
            <li
              key={target.key}
              data-current={target.key === currentTargetKey || undefined}
              data-found={target.found || undefined}
              data-hinted={target.hinted || undefined}
              aria-current={target.key === currentTargetKey ? "step" : undefined}
            >
              <span className="vezmir-clue-list__icon" aria-hidden="true">
                {FIND_VEZMIR_INTERACTIVE_ART ? (
                  target.key === "vezmir" ? (
                    <img
                      className="vezmir-clue-list__vezmir-art"
                      src={FIND_VEZMIR_INTERACTIVE_ART.vezmir}
                      alt=""
                      draggable="false"
                    />
                  ) : (
                    <span className="vezmir-clue-list__atlas-art">
                      <img
                        src={FIND_VEZMIR_INTERACTIVE_ART.clues}
                        alt=""
                        draggable="false"
                        style={getFindVezmirAtlasStyle(FIND_VEZMIR_CLUE_ATLAS, target.key)}
                      />
                    </span>
                  )
                ) : target.found ? <Check /> : target.locked ? <LockKeyhole /> : <Search />}
              </span>
              <span>
                <strong>{target.label}</strong>
                <small>{target.locked ? "Fill the tray to coax them out" : target.region}</small>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}
