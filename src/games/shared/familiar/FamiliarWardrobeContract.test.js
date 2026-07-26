import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../../../App.jsx", import.meta.url), "utf8");
const quarters = readFileSync(new URL("../../../pages/QuartersHub.jsx", import.meta.url), "utf8");
const customizer = readFileSync(new URL("./FamiliarCustomizer.jsx", import.meta.url), "utf8");

test("registers the Familiar Wardrobe and points Quarters customization to it", () => {
  assert.match(app, /path="\/profile\/familiar"/);
  assert.match(quarters, /customize: "\/profile\/familiar"/);
  assert.match(quarters, /useFamiliar\(\)/);
});

test("wardrobe exposes keyboard tabs, pressed choices, save, and revert controls", () => {
  assert.match(customizer, /<Tabs/);
  assert.match(customizer, /aria-pressed=/);
  assert.match(customizer, />Save</);
  assert.match(customizer, />Revert</);
});
