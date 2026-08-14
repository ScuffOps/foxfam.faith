import { Hammer, LockKeyhole, LogIn, PackageOpen, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { isMatchMergeBoardLocked } from "@/games/matchMerge/simulation/matchMergeRules";
import "./match-merge.css";

function formatRewardKey(value) {
  return String(value || "reward")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function MatchMergeHud({
  state,
  mode = "practice",
  rewardReceipt = null,
  isPending = false,
  rewardError = "",
  onClaim,
  onReset,
  onRetry,
  onSignIn,
  onPractice,
}) {
  const isRewarded = mode === "rewarded";
  const readyScore = Math.max(0, state.score - (state.claimedScore || 0));
  const locked = isMatchMergeBoardLocked(state.grid);
  const materials = rewardReceipt?.materials || [];
  const achievements = rewardReceipt?.achievements || [];

  return (
    <div className="reliquary-hud">
      <section className="reliquary-request" aria-labelledby="reliquary-request-title">
        <div className="reliquary-request__heading">
          <span aria-hidden="true"><PackageOpen /></span>
          <div>
            <p>{isRewarded ? "Rewarded run" : "Practice bench"}</p>
            <h2 id="reliquary-request-title">Prepare the offering</h2>
          </div>
        </div>

        <dl className="reliquary-stats">
          <div><dt>Refinement</dt><dd>{state.score}</dd></div>
          <div><dt>Chain</dt><dd>{state.mergeStreak}</dd></div>
          <div><dt>{isRewarded ? "Ready" : "Local"}</dt><dd>{readyScore}</dd></div>
        </dl>

        <p className="reliquary-alert" aria-live="polite">
          {isRewarded
            ? <><Sparkles aria-hidden="true" /> Rewarded run. The Priory records each merge.</>
            : <><LockKeyhole aria-hidden="true" /> Practice progress is local and grants no portal rewards.</>}
        </p>

        {locked && !rewardError ? (
          <p className="reliquary-alert">
            <LockKeyhole aria-hidden="true" /> No neighboring twins remain. {isRewarded ? "Claim the bench." : "Reset the bench."}
          </p>
        ) : null}

        {rewardError ? (
          <p className="reliquary-alert" role="alert">{rewardError}</p>
        ) : null}

        <div className="reliquary-request__actions">
          {isRewarded ? (
            rewardError && onRetry ? (
              <>
                <button type="button" onClick={onRetry} disabled={isPending}>
                  <Sparkles aria-hidden="true" /> {isPending ? "Retrying..." : "Retry"}
                </button>
                {onPractice ? (
                  <button type="button" onClick={onPractice} disabled={isPending}>
                    <Hammer aria-hidden="true" /> Play practice
                  </button>
                ) : null}
              </>
            ) : (
              <button type="button" onClick={onClaim} disabled={isPending || readyScore <= 0}>
                <Hammer aria-hidden="true" /> {isPending ? "Claiming..." : "Claim rewards"}
              </button>
            )
          ) : (
            <button type="button" onClick={onSignIn} disabled={isPending || typeof onSignIn !== "function"}>
              <LogIn aria-hidden="true" /> Sign in to earn
            </button>
          )}
          {onReset ? (
            <button type="button" onClick={onReset} disabled={isPending}>
              <RotateCcw aria-hidden="true" /> {isRewarded && rewardReceipt ? "New rewarded run" : "Reset bench"}
            </button>
          ) : null}
        </div>

        <details className="reliquary-request__goals">
          <summary><Trophy aria-hidden="true" /> Bench notes</summary>
          <span data-complete={state.moves > 0 || undefined}>Complete your first merge</span>
          <span data-complete={Math.max(state.bestChain || 0, state.mergeStreak || 0) >= 4 || undefined}>Build a four-link quiet chain</span>
          <span data-complete={state.highestTier >= 4 || undefined}>Shape a tier four sigil</span>
        </details>
      </section>

      {isRewarded && rewardReceipt ? (
        <section className="reliquary-ledger" aria-labelledby="reliquary-receipt-title" aria-live="polite">
          <div>
            <p>Priory receipt</p>
            <h2 id="reliquary-receipt-title">Rewards received</h2>
          </div>
          <ol>
            <li>
              <Sparkles aria-hidden="true" />
              <span>
                <strong>+{rewardReceipt.favor?.delta || 0} Favor</strong>
                <small>{rewardReceipt.favor?.balance ?? 0} total</small>
              </span>
            </li>
            {materials.map((material) => (
              <li key={material.key}>
                <Sparkles aria-hidden="true" />
                <span>
                  <strong>+{material.delta} {formatRewardKey(material.key)}</strong>
                  <small>{material.balance} stored</small>
                </span>
              </li>
            ))}
            {achievements.map((achievement) => (
              <li key={achievement.key}>
                <Trophy aria-hidden="true" />
                <span><strong>{achievement.title}</strong><small>Achievement unlocked</small></span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
