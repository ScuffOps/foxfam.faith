import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const here = fileURLToPath(new URL(".", import.meta.url));
const layoutSource = readFileSync(join(here, "../../../components/Layout.jsx"), "utf8");
const appCssSource = readFileSync(join(here, "../../../index.css"), "utf8");
const buttonSource = readFileSync(join(here, "../../../components/ui/button.jsx"), "utf8");

function loadRouteClassifier() {
  const classifierStart = layoutSource.indexOf("const FLAT_VECTOR_ROUTES");
  const classifierEnd = layoutSource.indexOf("\n\nexport default function Layout");
  assert.notEqual(classifierStart, -1, "Layout must declare its flat-vector route contract");
  assert.notEqual(classifierEnd, -1, "Layout must expose the route contract before rendering");

  const classifierSource = layoutSource
    .slice(classifierStart, classifierEnd)
    .replace("export function isFlatVectorRoute", "function isFlatVectorRoute");
  return runInNewContext(`${classifierSource}\nisFlatVectorRoute;`);
}

test("visitor Quarters routes receive the game backdrop without matching unrelated paths", () => {
  const isFlatVectorRoute = loadRouteClassifier();

  for (const pathname of ["/quarters", "/quarters/11111111-1111-4111-8111-111111111111"]) {
    assert.equal(isFlatVectorRoute(pathname), true, pathname);
  }

  for (const pathname of [
    "/quarters/",
    "/quarters/11111111-1111-4111-8111-111111111111/details",
    "/quarters-archive",
    "/community/quarters/11111111-1111-4111-8111-111111111111",
  ]) {
    assert.equal(isFlatVectorRoute(pathname), false, pathname);
  }
});

test("game routes use a flat-vector backdrop without changing portal pages", () => {
  for (const route of [
    "/quarters",
    "/relic-forge",
    "/profile",
    "/profile/familiar",
    "/starfishing",
    "/match-merge",
    "/boba-cafe",
    "/find-vezmir",
    "/time-runner",
    "/word-garden",
    "/collections",
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

test("game routes restyle shared portal buttons with solid flat-vector variants", () => {
  assert.match(buttonSource, /data-variant=\{variant \|\| "default"\}/);

  const gameButtonRules = appCssSource
    .match(/\.app-viewport--game \.portal-button[^{]*\{[^}]+\}/gi)
    ?.join("\n") || "";

  assert.match(gameButtonRules, /data-variant="destructive"/);
  assert.match(gameButtonRules, /data-variant="outline"/);
  assert.match(gameButtonRules, /data-variant="secondary"/);
  assert.match(gameButtonRules, /box-shadow:\s*0 3px 0 #485365/);
  assert.doesNotMatch(gameButtonRules, /gradient|rgba?\(|blur\(|drop-shadow|brightness/i);
});
