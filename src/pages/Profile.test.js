import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const pageDir = dirname(fileURLToPath(import.meta.url));
const srcDir = join(pageDir, "..");
const appSource = readFileSync(join(srcDir, "App.jsx"), "utf8");
const profileSource = readFileSync(join(pageDir, "Profile.jsx"), "utf8");

test("profile supports owner and public routes", () => {
  assert.ok(appSource.includes('<Route path="/profile" element={<Profile />} />'));
  assert.ok(appSource.includes('<Route path="/profile/:profileId" element={<Profile />} />'));
  assert.match(profileSource, /useParams/);
  assert.match(profileSource, /PublicTrophyCase/);
});
