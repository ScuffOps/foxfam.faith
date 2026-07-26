import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DEFAULT_FAMILIAR } from "./familiarCatalog.js";
import { resolveVisibleFamiliar } from "./familiarSession.js";

const saved = { ...DEFAULT_FAMILIAR, coat: "rose" };
const guest = { ...DEFAULT_FAMILIAR, coat: "mist" };
const providerSource = readFileSync(new URL("./FamiliarProvider.jsx", import.meta.url), "utf8");
const customizerSource = readFileSync(new URL("./FamiliarCustomizer.jsx", import.meta.url), "utf8");

test("never exposes a familiar loaded for a previous account", () => {
  assert.deepEqual(resolveVisibleFamiliar({ ownerId: "new", loadedOwnerId: "old", saved, guest }), DEFAULT_FAMILIAR);
});

test("uses the loaded familiar only for its current owner", () => {
  assert.deepEqual(resolveVisibleFamiliar({ ownerId: "same", loadedOwnerId: "same", saved, guest }), saved);
});

test("uses the guest preview only while signed out", () => {
  assert.deepEqual(resolveVisibleFamiliar({ ownerId: "", loadedOwnerId: "", saved, guest }), guest);
});

test("authenticated load failures cannot save default-derived familiar state", () => {
  assert.match(providerSource, /loadedOwnerId:\s*""[\s\S]*status:\s*"error"/);
  assert.match(providerSource, /state\.loadedOwnerId\s*!==\s*ownerId/);
  assert.match(providerSource, /retryLoad/);
  assert.match(customizerSource, /isRemoteUnavailable/);
  assert.match(customizerSource, /disabled=\{isRemoteUnavailable/);
  assert.match(customizerSource, />Retry</);
});
