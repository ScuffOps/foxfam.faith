import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Delete, RefreshCcw, Sparkles, Trophy } from "lucide-react";
import { COMMUNITY_WORDLE_WORD_LENGTH, getLocalDateKey } from "@/games/communityWordle/content/wordBank";
import {
  buildCommunityWordleRewardIntent,
  calculateCommunityWordleScore,
  COMMUNITY_WORDLE_MAX_ATTEMPTS,
  COMMUNITY_WORDLE_REWARD_LOG_KEY,
  COMMUNITY_WORDLE_STATUS,
  COMMUNITY_WORDLE_STORAGE_KEY,
  createInitialCommunityWordleState,
  getKeyboardLetterResults,
  LETTER_RESULT,
  normalizeWord,
  readLocalJson,
  submitCommunityWordleGuess,
  writeLocalJson,
} from "@/games/communityWordle/simulation/communityWordleRules";

const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

const TILE_CLASS = {
  [LETTER_RESULT.correct]: "border-emerald-200/80 bg-emerald-300 text-emerald-950 shadow-[0_0_22px_rgba(110,231,183,0.34)]",
  [LETTER_RESULT.present]: "border-amber-200/80 bg-amber-300 text-amber-950 shadow-[0_0_18px_rgba(252,211,77,0.28)]",
  [LETTER_RESULT.absent]: "border-slate-500/60 bg-slate-800 text-slate-200",
  [LETTER_RESULT.empty]: "border-white/14 bg-white/[0.055] text-slate-100",
};

function createSavedState() {
  const seedKey = getLocalDateKey();
  const savedState = readLocalJson(COMMUNITY_WORDLE_STORAGE_KEY, null);
  if (savedState?.seedKey === seedKey && savedState?.targetWord) {
    return savedState;
  }
  return createInitialCommunityWordleState({ seedKey });
}

export default function CommunityWordle() {
  const [state, setState] = useState(createSavedState);
  const [draftGuess, setDraftGuess] = useState("");
  const [rewardLog, setRewardLog] = useState(() => readLocalJson(COMMUNITY_WORDLE_REWARD_LOG_KEY, []));

  const keyboardResults = useMemo(() => getKeyboardLetterResults(state.attempts), [state.attempts]);
  const score = useMemo(() => calculateCommunityWordleScore(state), [state]);
  const latestRewardIntent = rewardLog[0] || null;
  const canType = state.status === COMMUNITY_WORDLE_STATUS.playing;

  useEffect(() => {
    writeLocalJson(COMMUNITY_WORDLE_STORAGE_KEY, state);
  }, [state]);

  useEffect(() => {
    writeLocalJson(COMMUNITY_WORDLE_REWARD_LOG_KEY, rewardLog.slice(0, 25));
  }, [rewardLog]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Enter") {
        event.preventDefault();
        submitDraftGuess();
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        removeLetter();
        return;
      }
      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        appendLetter(event.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const appendLetter = (letter) => {
    if (!canType) return;
    setDraftGuess((current) => normalizeWord(`${current}${letter}`).slice(0, COMMUNITY_WORDLE_WORD_LENGTH));
  };

  const removeLetter = () => {
    if (!canType) return;
    setDraftGuess((current) => current.slice(0, -1));
  };

  const submitDraftGuess = () => {
    if (!canType) return;
    const previousStatus = state.status;
    const { state: nextState } = submitCommunityWordleGuess(state, draftGuess);

    setState(nextState);
    if (nextState.lastError) return;

    setDraftGuess("");
    if (previousStatus !== COMMUNITY_WORDLE_STATUS.solved && nextState.status === COMMUNITY_WORDLE_STATUS.solved) {
      const intent = buildCommunityWordleRewardIntent({
        state: nextState,
        durationMs: Math.max(0, Date.now() - new Date(nextState.startedAt).getTime()),
      });
      if (intent) {
        setRewardLog((current) => [intent, ...current].slice(0, 25));
      }
    }
  };

  const resetRound = () => {
    setState(createInitialCommunityWordleState({ seedKey: getLocalDateKey() }));
    setDraftGuess("");
  };

  return (
    <div className="community-dashboard mx-auto max-w-7xl animate-fade-in">
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            to="/quarters"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-muted-foreground transition-all hover:border-pink-200/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Quarters
          </Link>
          <div className="mb-2 mt-3 flex items-center gap-2 text-pink-100/75">
            <Sparkles className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em]">Community word shrine</span>
          </div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Community Wordle</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Guess the daily five-letter community word and bank a local reward preview for the future Twitch extension flow.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-200/10 px-3 py-1 text-xs font-bold text-emerald-100">
          <Trophy className="h-3.5 w-3.5" />
          Local prototype rewards
        </div>
      </header>

      <div className="grid gap-5">
        <main className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#15131f] shadow-2xl shadow-black/20">
          <section className="relative min-h-[9rem] overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_20%_15%,rgba(251,207,232,0.2),transparent_28%),linear-gradient(135deg,#21172f,#16233a_48%,#1f2f26)] px-5 py-5">
            <div className="absolute inset-x-8 bottom-0 h-10 rounded-t-[60%] bg-emerald-200/18" />
            <div className="absolute bottom-6 left-8 h-14 w-14 rounded-full border-4 border-pink-200/70 bg-pink-300 shadow-[0_0_26px_rgba(249,168,212,0.35)]" />
            <div className="absolute bottom-5 left-20 h-9 w-20 rounded-t-full border border-amber-100/50 bg-amber-200/90" />
            <div className="absolute bottom-8 right-12 grid grid-cols-3 gap-1">
              {["C", "O", "Z", "Y", "?", "!"].map((letter, index) => (
                <span
                  key={`${letter}-${index}`}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-white/35 bg-white/20 text-xs font-black text-white shadow-lg"
                >
                  {letter}
                </span>
              ))}
            </div>
            <div className="relative max-w-xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-pink-100/75">Flat vector shrine</p>
              <h2 className="mt-2 font-heading text-2xl font-black text-white">Letters, luck, and little ritual wins.</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">
                {getStatusCopy(state.status, state.targetWord, score)}
              </p>
            </div>
          </section>

          <section className="grid gap-5 p-4 lg:grid-cols-[minmax(18rem,1fr)_minmax(18rem,22rem)] lg:p-5">
            <div className="flex min-w-0 flex-col items-center justify-center gap-4">
              <WordGrid attempts={state.attempts} draftGuess={draftGuess} />
              {state.lastError && (
                <p className="w-full max-w-md rounded-lg border border-amber-200/30 bg-amber-200/10 px-3 py-2 text-center text-sm font-bold text-amber-100">
                  {state.lastError}
                </p>
              )}
              <Keyboard
                keyboardResults={keyboardResults}
                onLetter={appendLetter}
                onDelete={removeLetter}
                onEnter={submitDraftGuess}
                disabled={!canType}
              />
            </div>

            <aside className="min-w-0 space-y-3">
              <section className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Round</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <StatPill label="Attempts" value={`${state.attempts.length}/${COMMUNITY_WORDLE_MAX_ATTEMPTS}`} />
                  <StatPill label="Score" value={score} />
                  <StatPill label="Seed" value={state.seedKey.slice(5)} />
                  <StatPill label="Status" value={state.status} />
                </div>
                <button
                  type="button"
                  onClick={resetRound}
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm font-bold text-slate-100 transition hover:border-pink-200/35 hover:bg-pink-200/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reset local round
                </button>
              </section>

              <section className="rounded-xl border border-emerald-200/25 bg-emerald-200/10 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-100/70">Local reward intent</p>
                {latestRewardIntent ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-bold text-emerald-50">+{latestRewardIntent.favorPreview} Favor preview</p>
                    <div className="flex flex-wrap gap-2">
                      {latestRewardIntent.items.map((item) => (
                        <span
                          key={item.key}
                          className="rounded-full border border-emerald-100/25 bg-emerald-100/10 px-3 py-1 text-xs font-bold text-emerald-50"
                        >
                          {item.quantity} {item.label}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs leading-5 text-emerald-50/65">
                      Preview only. No Favor, charm, profile, or database mutation is made here.
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-emerald-50/70">
                    Solve the board to create a local-only reward event.
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Recent local log</p>
                {rewardLog.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No word rewards logged yet.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {rewardLog.slice(0, 4).map((intent) => (
                      <article key={intent.eventId} className="rounded-lg border border-white/10 bg-black/15 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-foreground">{intent.eventType}</span>
                          <span className="text-xs font-bold text-emerald-100">+{intent.favorPreview}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(intent.createdAt).toLocaleString()}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}

function WordGrid({ attempts, draftGuess }) {
  const rows = Array.from({ length: COMMUNITY_WORDLE_MAX_ATTEMPTS }, (_, rowIndex) => {
    const attempt = attempts[rowIndex];
    const letters = attempt
      ? attempt.result
      : Array.from({ length: COMMUNITY_WORDLE_WORD_LENGTH }, (_, index) => ({
          letter: rowIndex === attempts.length ? draftGuess[index] || "" : "",
          result: LETTER_RESULT.empty,
          index,
        }));

    return { key: attempt?.guess || `draft-${rowIndex}`, letters };
  });

  return (
    <div className="grid w-full max-w-md gap-2">
      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-5 gap-2">
          {row.letters.map((letter) => (
            <div
              key={letter.index}
              className={`flex aspect-square min-h-12 items-center justify-center rounded-lg border text-xl font-black transition-all sm:min-h-14 sm:text-2xl ${TILE_CLASS[letter.result]}`}
            >
              {letter.letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Keyboard({ keyboardResults, onLetter, onDelete, onEnter, disabled }) {
  return (
    <div className="w-full max-w-xl space-y-2">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={row} className={`flex justify-center gap-1.5 ${rowIndex === 1 ? "px-4" : ""}`}>
          {rowIndex === 2 && (
            <button
              type="button"
              onClick={onEnter}
              disabled={disabled}
              className="min-h-10 rounded-md border border-pink-200/25 bg-pink-200/15 px-3 text-xs font-black text-pink-50 transition hover:bg-pink-200/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-45"
            >
              Enter
            </button>
          )}
          {row.split("").map((letter) => {
            const result = keyboardResults[letter] || LETTER_RESULT.empty;
            return (
              <button
                key={letter}
                type="button"
                onClick={() => onLetter(letter)}
                disabled={disabled}
                className={`flex min-h-10 flex-1 items-center justify-center rounded-md border px-1 text-xs font-black transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-45 sm:text-sm ${TILE_CLASS[result]}`}
              >
                {letter}
              </button>
            );
          })}
          {rowIndex === 2 && (
            <button
              type="button"
              onClick={onDelete}
              disabled={disabled}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.055] px-3 text-slate-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-45"
              aria-label="Delete letter"
            >
              <Delete className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-50">{value}</p>
    </div>
  );
}

function getStatusCopy(status, targetWord, score) {
  if (status === COMMUNITY_WORDLE_STATUS.solved) {
    return `Solved for ${score} points. The word was ${targetWord}.`;
  }
  if (status === COMMUNITY_WORDLE_STATUS.lost) {
    return `The word was ${targetWord}. Reset locally when the shrine calls again.`;
  }
  return "Six guesses, deterministic letter checks, and a reward intent that stays safely on this device.";
}
