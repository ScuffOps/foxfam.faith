import { ArrowLeft, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { getWorldAccent } from "../theme/gameTheme";
import "./game-shell.css";

export default function GameShell({
  world,
  title,
  eyebrow,
  status,
  actions,
  children,
  sidebar,
  onOpenSettings,
}) {
  const accent = getWorldAccent(world);

  return (
    <main
      className="game-shell"
      data-world={world}
      style={{ "--game-accent": accent.surface, "--game-accent-text": accent.text }}
    >
      <header className="game-shell__header">
        <Link className="game-icon-button" to="/quarters" aria-label="Return to Quarters" title="Return to Quarters">
          <ArrowLeft aria-hidden="true" />
        </Link>

        <div className="game-shell__identity">
          {eyebrow ? <p>{eyebrow}</p> : null}
          <h1>{title}</h1>
        </div>

        <div className="game-shell__status">{status}</div>
        <div className="game-shell__actions">
          {actions}
          {onOpenSettings ? (
            <button
              className="game-icon-button"
              type="button"
              onClick={onOpenSettings}
              aria-label="Open game settings"
              title="Game settings"
            >
              <Settings aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </header>

      <div className="game-shell__layout">
        <section className="game-shell__playfield">{children}</section>
        {sidebar ? <aside className="game-shell__sidebar">{sidebar}</aside> : null}
      </div>
    </main>
  );
}
