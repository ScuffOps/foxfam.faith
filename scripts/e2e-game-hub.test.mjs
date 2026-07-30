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

test("game hub playtest separates desktop keyboard and mobile touch interactions", () => {
  assert.match(runnerSource, /async function activateControl\(page, locator, viewport\)/);
  assert.match(runnerSource, /viewport\.isMobile/);
  assert.match(runnerSource, /page\.keyboard\.press\("Space"\)/);
  assert.match(runnerSource, /page\.keyboard\.press\(key\)/);
  assert.match(runnerSource, /page\.keyboard\.press\(String\(ordinal\)\)/);
  assert.match(runnerSource, /keyboard activation/);
  assert.match(runnerSource, /start and leap in the clocktower/);
  assert.match(runnerSource, /bloom a valid word by/);
});

test("game hub playtest includes profile integration for relic and charm presentation", () => {
  assert.match(runnerSource, /slug: "profile", path: "\/profile"/);
  assert.match(runnerSource, /slug: "collections", path: "\/collections"/);
  assert.match(runnerSource, /slug: "familiar-wardrobe", path: "\/profile\/familiar"/);
});
