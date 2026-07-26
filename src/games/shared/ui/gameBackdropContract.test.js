import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const layoutSource = readFileSync(join(here, "../../../components/Layout.jsx"), "utf8");
const appCssSource = readFileSync(join(here, "../../../index.css"), "utf8");

test("game routes use a flat-vector backdrop without changing portal pages", () => {
  for (const route of [
    "/quarters",
    "/relic-forge",
    "/profile/familiar",
    "/starfishing",
    "/match-merge",
    "/boba-cafe",
    "/find-vezmir",
    "/time-runner",
    "/word-garden",
  ]) {
    assert.match(layoutSource, new RegExp(`"${route}"`));
  }
  assert.match(layoutSource, /app-viewport--game/);
  assert.match(appCssSource, /\.app-viewport--game::before\s*\{\s*background:\s*#[0-9a-f]{6};\s*\}/i);
  assert.match(appCssSource, /\.app-viewport--game::after\s*\{\s*background:\s*#[0-9a-f]{6};\s*clip-path:/i);

  const gameBackdrop = [
    appCssSource.match(/\.app-viewport--game::before\s*\{[^}]+\}/i)?.[0],
    appCssSource.match(/\.app-viewport--game::after\s*\{[^}]+\}/i)?.[0],
  ].join("\n");
  assert.doesNotMatch(gameBackdrop, /url\(|gradient\(|filter:|backdrop-filter:|mix-blend-mode:/i);
});
