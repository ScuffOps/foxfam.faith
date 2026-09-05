import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { Player, type PlayerRef } from "@remotion/player";
import {
  ArrowDown,
  Check,
  RotateCcw,
  Settings2,
  SkipForward,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { ClockScene } from "./ClockScene";
import {
  chooseFlavor,
  demoResult,
  dragProgress,
  FLAVOR,
  RARITIES,
  RollSession,
  type Phase,
  type Rarity,
  type RollProvider,
  type RollResult,
} from "./domain";
import { PullSound } from "./sound";
import "./style.css";

const preferencesKey = "foxfam-motion-lab-preferences-v1";
function readPreferences() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(preferencesKey) || "{}",
    ) as Record<string, unknown>;
    return { sound: saved.sound === true, reduce: saved.reduce === true };
  } catch {
    return { sound: false, reduce: false };
  }
}
function App() {
  const [preferences, setPreferences] = useState(readPreferences);
  const [systemReduced, setSystemReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const reduced = preferences.reduce || systemReduced;
  const [phase, setPhase] = useState<Phase>("idle");
  const [rarity, setRarity] = useState<Rarity>("mythic");
  const [result, setResult] = useState<RollResult>(demoResult("mythic"));
  const [progress, setProgress] = useState(0);
  const [flavor, setFlavor] = useState(0);
  const [settings, setSettings] = useState(false);
  const [notice, setNotice] = useState("");
  const [fault, setFault] = useState("normal");
  const [history, setHistory] = useState<RollResult[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const player = useRef<PlayerRef>(null);
  const stage = useRef<HTMLDivElement>(null);
  const leverButton = useRef<HTMLButtonElement>(null);
  const resultButton = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ id: number; start: number; moved: boolean }>();
  const suppressClick = useRef(false);
  const session = useRef(new RollSession());
  const busy = useRef(false);
  const sound = useRef(new PullSound());
  const abort = useRef<AbortController>();
  const mounted = useRef(true);
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;
  const requestRarity = useRef<Rarity>(rarity);
  const working = phase === "pending" || phase === "reveal";
  const meta = RARITIES[result.charm.rarity];

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setSystemReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(preferencesKey, JSON.stringify(preferences));
    } catch {
      /* Preference storage is optional. */
    }
    if (!preferences.sound) sound.current.stop();
  }, [preferences]);
  useEffect(
    () => () => {
      mounted.current = false;
      abort.current?.abort();
      sound.current.dispose();
    },
    [],
  );
  useEffect(() => {
    if (phase === "complete")
      resultButton.current?.focus({ preventScroll: true });
  }, [phase]);

  const finish = useCallback(() => {
    sound.current.stop();
    setPhase("complete");
    busy.current = false;
  }, []);
  useEffect(() => {
    if (phase !== "reveal") return;
    if (reduced) {
      finish();
      return;
    }
    const current = player.current;
    current?.addEventListener("ended", finish);
    return () => current?.removeEventListener("ended", finish);
  }, [phase, reduced, finish]);

  async function pull() {
    if (busy.current || phase === "complete") return;
    busy.current = true;
    if (phase !== "error") requestRarity.current = rarity;
    const selected = requestRarity.current;
    if (preferences.sound)
      void sound.current
        .unlock()
        .catch(() =>
          setNotice(
            "Sound is unavailable in this browser. The pull still works.",
          ),
        );
    setNotice("");
    setProgress(0);
    setPhase("pending");
    setFlavor((last) => chooseFlavor(Math.random(), last));
    const controller = new AbortController();
    abort.current = controller;
    const deadline = window.setTimeout(() => controller.abort(), 10000);
    const provider: RollProvider = ({ requestId, signal }) =>
      new Promise((resolve, reject) => {
        // Preview adapter only. Replace with an authenticated, idempotent server
        // endpoint before product integration. Never call the old client RNG here.
        const timer = window.setTimeout(
          () => {
            signal.removeEventListener("abort", cancel);
            if (fault === "error")
              reject(new Error("Preview service unavailable."));
            else resolve(demoResult(selected, requestId));
          },
          fault === "slow" ? 6000 : 700,
        );
        function cancel() {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        }
        signal.addEventListener("abort", cancel, { once: true });
      });
    try {
      const rolled = await session.current.request(provider, controller.signal);
      if (!mounted.current) return;
      setResult(rolled);
      setHistory((all) =>
        all.some((item) => item.rollId === rolled.rollId)
          ? all
          : [rolled, ...all].slice(0, 12),
      );
      if (reduced) {
        setPhase("complete");
        busy.current = false;
      } else {
        setPhase("reveal");
        if (preferencesRef.current.sound)
          void sound.current
            .play(RARITIES[rolled.charm.rarity].family)
            .catch(() =>
              setNotice(
                "The charm is ready, but its sound could not be played.",
              ),
            );
      }
    } catch {
      if (!mounted.current) return;
      busy.current = false;
      setPhase("error");
      setNotice(
        "The Aether lost the connection. No new pull will be created when you retry this request.",
      );
    } finally {
      clearTimeout(deadline);
    }
  }

  function reset() {
    session.current.next();
    setPhase("idle");
    setProgress(0);
    setNotice("");
    setCopied(false);
    requestAnimationFrame(() =>
      leverButton.current?.focus({ preventScroll: true }),
    );
  }
  const sceneProps = useMemo(
    () => ({ phase, result, reducedMotion: reduced, progress }),
    [phase, result, reduced, progress],
  );
  const title =
    phase === "pending"
      ? "The archive is listening"
      : phase === "reveal"
        ? "A moment, unbound"
        : phase === "complete"
          ? result.charm.name
          : phase === "error"
            ? "A moment out of reach"
            : "Borrow a little tomorrow.";

  return (
    <main
      className="observatory"
      style={{ "--rarity": meta.color } as React.CSSProperties}
    >
      <header className="topbar">
        <div className="brand">
          <img src="/art/tenko.png" alt="" />
          <div>
            FoxFam<span>AETHER OBSERVATORY</span>
          </div>
        </div>
        <span className="lab-label">
          Motion lab <span aria-hidden="true">/</span> No Favor spent
        </span>
        <div className="tools">
          <button
            aria-label={preferences.sound ? "Mute sound" : "Enable sound"}
            title={preferences.sound ? "Mute sound" : "Enable sound"}
            aria-pressed={preferences.sound}
            onClick={() => {
              if (!preferences.sound)
                void sound.current
                  .unlock()
                  .catch(() => setNotice("Sound is unavailable."));
              setPreferences((p) => ({ ...p, sound: !p.sound }));
            }}
          >
            {preferences.sound ? <Volume2 /> : <VolumeX />}
          </button>
          <button
            aria-label="Open settings"
            title="Settings"
            aria-expanded={settings}
            onClick={() => setSettings(!settings)}
          >
            <Settings2 />
          </button>
        </div>
      </header>

      <section className="ritual" aria-label="Aether charm pull">
        <div className="ritual-heading">
          <div className="eyebrow">
            <span /> THE MOMENT BETWEEN MOMENTS
          </div>
          <h1>{title}</h1>
        </div>
        <div className="world-window">
          <div className="world" ref={stage}>
            <Player
              key={
                phase === "pending"
                  ? "pending"
                  : phase === "reveal"
                    ? `reveal-${result.rollId}`
                    : "still"
              }
              ref={player}
              component={ClockScene}
              inputProps={sceneProps}
              durationInFrames={phase === "pending" ? 360 : meta.frames}
              compositionWidth={1500}
              compositionHeight={1050}
              fps={30}
              style={{ width: "100%", height: "100%" }}
              autoPlay={working && !reduced}
              loop={phase === "pending"}
              controls={false}
              clickToPlay={false}
              doubleClickToFullscreen={false}
              spaceKeyToPlayOrPause={false}
              showVolumeControls={false}
              acknowledgeRemotionLicense
              errorFallback={() => (
                <div className="scene-error">
                  The scene could not load. Your result is still available
                  below.
                </div>
              )}
            />
            <button
              ref={leverButton}
              className="lever-target"
              aria-label="Pull the Aether lever"
              title="Pull the Aether lever"
              disabled={working || phase === "complete"}
              onPointerDown={(e) => {
                if (e.button !== 0 || busy.current) return;
                suppressClick.current = false;
                drag.current = {
                  id: e.pointerId,
                  start: e.clientY,
                  moved: false,
                };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!drag.current || drag.current.id !== e.pointerId) return;
                if (Math.abs(e.clientY - drag.current.start) > 4)
                  drag.current.moved = true;
                setProgress(
                  dragProgress(
                    drag.current.start,
                    e.clientY,
                    stage.current?.clientHeight || 400,
                  ),
                );
              }}
              onPointerUp={(e) => {
                const active = drag.current;
                if (!active || active.id !== e.pointerId) return;
                const complete =
                  dragProgress(
                    active.start,
                    e.clientY,
                    stage.current?.clientHeight || 400,
                  ) >= 0.82;
                suppressClick.current = active.moved;
                drag.current = undefined;
                setProgress(0);
                if (complete) {
                  suppressClick.current = true;
                  void pull();
                }
              }}
              onPointerCancel={() => {
                drag.current = undefined;
                suppressClick.current = true;
                setProgress(0);
              }}
              onLostPointerCapture={() => {
                drag.current = undefined;
                setProgress(0);
              }}
              onClick={(e) => {
                if (e.detail === 0 || !suppressClick.current) void pull();
                suppressClick.current = false;
              }}
            >
              <span className="lever-hint" aria-hidden="true">
                <ArrowDown />
              </span>
            </button>
          </div>
        </div>
        <div className="ritual-footer">
          {phase === "complete" ? (
            <div className="reward-copy">
              <div
                className="stars"
                aria-label={`${meta.stars} stars, ${meta.label}`}
              >
                {Array.from({ length: meta.stars }, (_, i) => (
                  <Star key={i} size={19} fill="currentColor" />
                ))}
              </div>
              <p>{result.charm.description}</p>
              <button ref={resultButton} className="primary" onClick={reset}>
                <Check size={18} /> Keep this moment
              </button>
              <button
                className="text-button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      `${result.charm.name} · ${meta.stars} stars\n${result.charm.description}`,
                    );
                    setCopied(true);
                  } catch {
                    setNotice(
                      "Could not copy. You can select the charm text above.",
                    );
                  }
                }}
              >
                {copied ? "Copied" : "Copy keepsake"}
              </button>
            </div>
          ) : (
            <>
              <p className="flavor">
                {phase === "idle"
                  ? "One small pull. A thousand possible moments."
                  : FLAVOR[flavor]}
              </p>
              {phase === "reveal" ? (
                <button className="secondary" onClick={finish}>
                  <SkipForward size={18} /> Reveal now
                </button>
              ) : (
                <button
                  className="primary"
                  disabled={phase === "pending"}
                  onClick={() => void pull()}
                >
                  {phase === "pending" ? (
                    <span className="waiting-mark" aria-hidden="true">
                      ···
                    </span>
                  ) : phase === "error" ? (
                    <RotateCcw size={18} />
                  ) : (
                    <Sparkles size={18} />
                  )}{" "}
                  {phase === "pending"
                    ? "Listening to the Aether"
                    : phase === "error"
                      ? "Retry this pull"
                      : "Pull the lever"}
                </button>
              )}
            </>
          )}
          <div role="status" aria-live="polite" className="status">
            {notice ||
              (phase === "pending"
                ? "Connecting. Your pull is still in progress."
                : phase === "complete"
                  ? `${result.charm.name} revealed. Preview keepsake only.`
                  : "")}
          </div>
        </div>
      </section>

      <footer className="lab-footer">
        <span>The shrine remembers every kindness.</span>
        <button className="text-button" onClick={() => setHistoryOpen(true)}>
          Recent moments <span className="count">{history.length}</span>
        </button>
      </footer>

      {settings && (
        <div
          className="scrim"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSettings(false);
          }}
        >
          <SettingsPanel close={() => setSettings(false)}>
            <label className="setting-row">
              <span>
                Quiet motion
                <small>
                  {systemReduced
                    ? "Your device requests reduced motion."
                    : "Gentle fades, no spinning or bursts."}
                </small>
              </span>
              <input
                type="checkbox"
                checked={reduced}
                disabled={systemReduced}
                onChange={(e) =>
                  setPreferences((p) => ({ ...p, reduce: e.target.checked }))
                }
              />
            </label>
            <label className="setting-row">
              <span>
                Sound<small>Original clockwork and chime motif</small>
              </span>
              <input
                type="checkbox"
                checked={preferences.sound}
                onChange={(e) => {
                  if (e.target.checked)
                    void sound.current
                      .unlock()
                      .catch(() => setNotice("Sound is unavailable."));
                  setPreferences((p) => ({ ...p, sound: e.target.checked }));
                }}
              />
            </label>
            <div className="settings-divider" />
            <label className="field">
              Preview rarity
              <select
                value={rarity}
                disabled={working || phase === "error"}
                onChange={(e) => {
                  setRarity(e.target.value as Rarity);
                  if (phase === "complete") reset();
                }}
              >
                <option value="common">1 star · Common</option>
                <option value="uncommon">2 stars · Uncommon</option>
                <option value="rare">3 stars · Rare</option>
                <option value="epic">4 stars · Epic</option>
                <option value="mythic">5 stars · Mythic</option>
              </select>
            </label>
            <label className="field">
              Preview connection
              <select
                value={fault}
                disabled={working}
                onChange={(e) => setFault(e.target.value)}
              >
                <option value="normal">Normal</option>
                <option value="slow">Slow response (6 seconds)</option>
                <option value="error">Unavailable</option>
              </select>
            </label>
            <p className="caption">
              A standalone prototype. Rolls and recent moments stay in this tab.
              Nothing is charged or added to your portal inventory.
            </p>
          </SettingsPanel>
        </div>
      )}
      {historyOpen && (
        <div
          className="scrim"
          onClick={(e) => {
            if (e.target === e.currentTarget) setHistoryOpen(false);
          }}
        >
          <SettingsPanel
            close={() => setHistoryOpen(false)}
            title="Recent moments"
          >
            {!history.length ? (
              <p>No moments caught just yet.</p>
            ) : (
              <ul className="history">
                {history.map((item) => (
                  <li key={item.rollId}>
                    <img
                      src={`/art/${item.charm.art === "geas" ? "eye-geas" : item.charm.art}.png`}
                      alt=""
                    />
                    <div>
                      {item.charm.name}
                      <small>
                        {RARITIES[item.charm.rarity].label} ·{" "}
                        {RARITIES[item.charm.rarity].stars} stars
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SettingsPanel>
        </div>
      )}
    </main>
  );
}

function SettingsPanel({
  children,
  close,
  title = "Ritual settings",
}: {
  children: React.ReactNode;
  close: () => void;
  title?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab") return;
      const focusables = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled)",
        ) || [],
      );
      const first = focusables[0],
        last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      ref={panel}
      className="settings-panel"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="panel-title">
        <h2>{title}</h2>
        <button onClick={close} aria-label="Close dialog" title="Close">
          <X />
        </button>
      </div>
      {children}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
