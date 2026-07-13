import { Hammer, LockKeyhole, PackageOpen, RotateCcw, Sparkles, Trophy } from "lucide-react";
import GameResultSheet from "@/games/shared/ui/GameResultSheet";
import { isMatchMergeBoardLocked } from "@/games/matchMerge/simulation/matchMergeRules";
import "./match-merge.css";

export default function MatchMergeHud({ state, rewardIntent, rewardLog = [], onClaim, onReset }) {
  const unclaimedScore = Math.max(0, state.score - state.claimedScore);
  const locked = isMatchMergeBoardLocked(state.grid);

  return (
    <div className="reliquary-hud">
      <section className="reliquary-request" aria-labelledby="reliquary-request-title">
        <div className="reliquary-request__heading">
          <span aria-hidden="true"><PackageOpen /></span>
          <div>
            <p>Forge request</p>
            <h2 id="reliquary-request-title">Prepare the offering</h2>
          </div>
        </div>

        <dl className="reliquary-stats">
          <div><dt>Refinement</dt><dd>{state.score}</dd></div>
          <div><dt>Chain</dt><dd>{state.mergeStreak}</dd></div>
          <div><dt>Ready</dt><dd>{unclaimedScore}</dd></div>
        </dl>

        <div className="reliquary-request__goals">
          <p><Trophy aria-hidden="true" /> Bench notes</p>
          <span data-complete={state.moves > 0 || undefined}>Complete your first merge</span>
          <span data-complete={state.mergeStreak >= 4 || undefined}>Build a four-link quiet chain</span>
          <span data-complete={state.highestTier >= 4 || undefined}>Shape a tier four sigil</span>
        </div>

        {locked ? (
          <p className="reliquary-alert"><LockKeyhole aria-hidden="true" /> No neighboring twins remain. Claim or reset the bench.</p>
        ) : null}

        <div className="reliquary-request__actions">
          <button type="button" onClick={onClaim} disabled={unclaimedScore <= 0}>
            <Hammer aria-hidden="true" /> Claim preview
          </button>
          <button type="button" onClick={onReset}>
            <RotateCcw aria-hidden="true" /> Reset bench
          </button>
        </div>
      </section>

      {rewardIntent ? (
        <GameResultSheet
          intent={rewardIntent}
          record={{ label: `${state.moves} merges`, value: `${rewardIntent.score} refinement claimed` }}
          title="Offering recorded"
        />
      ) : null}

      <section className="reliquary-ledger" aria-labelledby="reliquary-ledger-title">
        <div>
          <p>Local preview ledger</p>
          <h2 id="reliquary-ledger-title">Recent offerings</h2>
        </div>
        {rewardLog.length === 0 ? (
          <p className="reliquary-ledger__empty">Your first forge claim will be recorded here.</p>
        ) : (
          <ol>
            {rewardLog.slice(0, 3).map((intent) => (
              <li key={intent.eventId}>
                <Sparkles aria-hidden="true" />
                <span><strong>{intent.score} refinement</strong><small>{new Date(intent.createdAt).toLocaleString()}</small></span>
              </li>
            ))}
          </ol>
        )}
        <small>Preview only. Server validation remains reserved for Phase 2.</small>
      </section>
    </div>
  );
}
