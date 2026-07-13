import { useCallback, useEffect, useMemo, useState } from "react";
import { Gem, Sparkles } from "lucide-react";
import MatchMergeBoard from "@/games/matchMerge/ui/MatchMergeBoard";
import MatchMergeHud from "@/games/matchMerge/ui/MatchMergeHud";
import GameShell from "@/games/shared/ui/GameShell";
import { GAME_ACTIONS } from "@/games/shared/input/actions";
import { useGameControls } from "@/games/shared/input/useGameControls";
import {
  buildMatchMergeRewardIntent,
  confirmMatchMergeSelection,
  createInitialMatchMergeState,
  markMatchMergeClaimed,
  MATCH_MERGE_GRID_SIZE,
  MATCH_MERGE_REWARD_LOG_KEY,
  MATCH_MERGE_STORAGE_KEY,
  moveMatchMergeSelection,
  readLocalJson,
  selectMatchMergeCell,
  shuffleMatchMergeGrid,
  writeLocalJson,
} from "@/games/matchMerge/simulation/matchMergeRules";

const QUIET_FEEDBACK = { tone: "quiet", message: "Pair neighboring offerings to refine them." };

export default function MatchMerge() {
  const [state, setState] = useState(() => readLocalJson(MATCH_MERGE_STORAGE_KEY, null) || createInitialMatchMergeState());
  const [undoState, setUndoState] = useState(null);
  const [feedback, setFeedback] = useState(QUIET_FEEDBACK);
  const [rewardLog, setRewardLog] = useState(() => readLocalJson(MATCH_MERGE_REWARD_LOG_KEY, []));
  const startedAt = useMemo(() => Date.now(), []);
  const latestRewardIntent = rewardLog[0] || null;

  useEffect(() => {
    writeLocalJson(MATCH_MERGE_STORAGE_KEY, state);
  }, [state]);

  useEffect(() => {
    writeLocalJson(MATCH_MERGE_REWARD_LOG_KEY, rewardLog.slice(0, 25));
  }, [rewardLog]);

  const applySelection = useCallback((current, index) => {
    const cursor = {
      row: Math.floor(index / MATCH_MERGE_GRID_SIZE),
      column: index % MATCH_MERGE_GRID_SIZE,
    };
    const next = selectMatchMergeCell({ ...current, cursor }, index);
    if (next.score > current.score) {
      setUndoState(current);
      setFeedback({ tone: "success", message: `Refined into ${next.grid[index]?.label || "a higher offering"}. Chain ${next.mergeStreak}!` });
    } else if (current.selectedIndex !== null && current.selectedIndex !== index && current.grid[index]) {
      setFeedback({ tone: "warning", message: "Those offerings must be matching neighbors." });
    } else {
      setFeedback(QUIET_FEEDBACK);
    }
    return next;
  }, []);

  const handleSelectCell = useCallback((index) => {
    setState((current) => applySelection(current, index));
  }, [applySelection]);

  const handleDragSwap = useCallback((sourceIndex, targetIndex) => {
    setState((current) => {
      const sourceSelected = selectMatchMergeCell({ ...current, selectedIndex: null }, sourceIndex);
      return applySelection(sourceSelected, targetIndex);
    });
  }, [applySelection]);

  const handleGameAction = useCallback((action) => {
    const movement = {
      [GAME_ACTIONS.moveLeft]: [0, -1],
      [GAME_ACTIONS.moveUp]: [-1, 0],
      [GAME_ACTIONS.moveRight]: [0, 1],
      [GAME_ACTIONS.moveDown]: [1, 0],
    }[action];

    if (movement) {
      setState((current) => moveMatchMergeSelection(current, movement[0], movement[1]));
      return;
    }

    if ([GAME_ACTIONS.confirm, GAME_ACTIONS.interact, GAME_ACTIONS.primary].includes(action)) {
      setState((current) => {
        const cursor = current.cursor || { row: 0, column: 0 };
        const index = cursor.row * MATCH_MERGE_GRID_SIZE + cursor.column;
        const next = confirmMatchMergeSelection(current);
        if (next.score > current.score) {
          setUndoState(current);
          setFeedback({ tone: "success", message: `Refined into ${next.grid[index]?.label || "a higher offering"}. Chain ${next.mergeStreak}!` });
        } else if (current.selectedIndex !== null && current.selectedIndex !== index && current.grid[index]) {
          setFeedback({ tone: "warning", message: "Those offerings must be matching neighbors." });
        }
        return next;
      });
    }
  }, []);

  useGameControls({ onAction: handleGameAction });

  const handleUndo = () => {
    if (!undoState) return;
    setState(undoState);
    setUndoState(null);
    setFeedback({ tone: "quiet", message: "The last bench action was restored." });
  };

  const handleShuffle = () => {
    setState((current) => {
      setUndoState(current);
      return shuffleMatchMergeGrid(current);
    });
    setFeedback({ tone: "quiet", message: "The offerings have been gently rearranged." });
  };

  const handleClaim = () => {
    const intent = buildMatchMergeRewardIntent({ state, durationMs: Math.max(0, Date.now() - startedAt) });
    if (!intent) return;
    setRewardLog((current) => [intent, ...current].slice(0, 25));
    setState((current) => markMatchMergeClaimed(current));
    setUndoState(null);
  };

  const handleReset = () => {
    setUndoState(state);
    setState(createInitialMatchMergeState());
    setFeedback({ tone: "quiet", message: "A fresh set of offerings is ready." });
  };

  const status = (
    <div className="reliquary-shell-status" aria-label="Match and Merge status">
      <span><Gem aria-hidden="true" /> {state.score} refinement</span>
      <span><Sparkles aria-hidden="true" /> {state.mergeStreak} chain</span>
    </div>
  );

  return (
    <GameShell
      world="match-merge"
      eyebrow="Reliquary puzzle"
      title="Match & Merge"
      status={status}
      sidebar={(
        <MatchMergeHud
          state={state}
          rewardIntent={latestRewardIntent}
          rewardLog={rewardLog}
          onClaim={handleClaim}
          onReset={handleReset}
        />
      )}
    >
      <MatchMergeBoard
        state={state}
        feedback={feedback}
        canUndo={Boolean(undoState)}
        onSelectCell={handleSelectCell}
        onDragSwap={handleDragSwap}
        onUndo={handleUndo}
        onShuffle={handleShuffle}
      />
    </GameShell>
  );
}
