import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const pageDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(pageDir, "CollabRequests.jsx"), "utf8");

test("one-on-one requests cannot retain shared chat", () => {
  assert.match(source, /!isOneOnOne && \(/);
  assert.match(source, /shared_chat: isOneOnOne \? false : form\.shared_chat/);
  assert.match(source, /value === REQUEST_TYPES\.oneOnOne \? \{ shared_chat: false \}/);
});

test("admin and lead mod collab management uses role management access", () => {
  assert.match(source, /canManageRoles\(user\)/);
  assert.match(source, /Edit Collab Request/);
  assert.match(source, /Collab restored/);
  assert.match(source, /Collab request deleted/);
});
