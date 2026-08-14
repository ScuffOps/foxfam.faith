import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../../../App.jsx", import.meta.url), "utf8");
const quarters = readFileSync(new URL("../../../pages/QuartersHub.jsx", import.meta.url), "utf8");
const wardrobe = readFileSync(new URL("../../../pages/FamiliarWardrobe.jsx", import.meta.url), "utf8");
const customizer = readFileSync(new URL("./FamiliarCustomizer.jsx", import.meta.url), "utf8");
const calling = readFileSync(new URL("./FamiliarCalling.jsx", import.meta.url), "utf8");

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

test("wardrobe exposes a semantic page heading in every loading state", () => {
  assert.match(wardrobe, /<h1[^>]*>Familiar Wardrobe<\/h1>/);
});

test("wardrobe offers an optional calling that returns its choice to the persistent customizer", () => {
  assert.match(wardrobe, /Take the Familiar Calling/);
  assert.match(wardrobe, /<FamiliarCalling/);
  assert.match(wardrobe, /startingFamiliar=\{callingSelection \|\| familiar\}/);
  assert.match(calling, /A calling is a suggestion, never a command/);
  assert.match(calling, /Every familiar may still choose you/);
  assert.match(calling, /role="radiogroup"/);
  assert.match(calling, /aria-checked=/);
});
