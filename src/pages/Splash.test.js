import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "Splash.jsx"), "utf8");

test("splash lantern is a static focal stage with attached flame effects", () => {
  assert.match(source, /data-testid="splash-lantern-stage"/);
  assert.match(source, /<button\s+data-testid="splash-lantern-stage"/);
  assert.match(source, /data-testid="splash-lantern-flames"/);
  assert.match(source, /data-testid="splash-lantern"/);
  assert.match(source, /data-testid="splash-lantern-hit-target"/);
  assert.match(source, /\.splash-lantern-stage:focus \.splash-lantern-flames/);
});
