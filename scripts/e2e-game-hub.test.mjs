import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const runnerSource = readFileSync(new URL("./e2e-game-hub.mjs", import.meta.url), "utf8");

test("game hub playtest runs WCAG Axe checks across every route and viewport", () => {
  assert.match(runnerSource, /import AxeBuilder from "@axe-core\/playwright"/);
  assert.match(runnerSource, /\.withTags\(\["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"\]\)/);
  assert.match(runnerSource, /impact === "critical" \|\| impact === "serious"/);
  assert.match(runnerSource, /accessibility,/);
});
