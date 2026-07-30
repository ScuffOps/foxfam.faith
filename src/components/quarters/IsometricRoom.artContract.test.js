import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const roomSource = readFileSync(new URL("./IsometricRoom.jsx", import.meta.url), "utf8");
const roomCss = readFileSync(new URL("./quarters-scene.css", import.meta.url), "utf8");

test("Quarters art uses explicit flat fills without rendering filters", () => {
  const combined = `${roomSource}\n${roomCss}`;
  assert.doesNotMatch(
    combined,
    /(?:linear|radial)-gradient|<filter|feGaussianBlur|feDropShadow|mix-blend-mode|backdrop-filter/i,
  );
  const roomArtworkCss = roomCss.slice(0, roomCss.indexOf(".quarters-hotspot"));
  assert.doesNotMatch(roomArtworkCss, /opacity:/i);
  assert.match(roomSource, /scene-wall-shadow--left/);
  assert.match(roomSource, /scene-wall-shadow--right/);
  assert.match(roomSource, /scene-floor-shadow/);
});

test("Quarters palette keeps distinct wall, floor, wood, forge, and wardrobe families", () => {
  const requiredSelectors = [
    ".scene-wall--blue",
    ".scene-wall--rose",
    ".scene-floor",
    ".wood",
    ".forge-front",
    ".wardrobe-front",
  ];
  requiredSelectors.forEach((selector) => assert.match(roomCss, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))));
});

test("Quarters keeps shared isometric structure and authored prop details", () => {
  assert.match(roomSource, /viewBox="0 0 1200 760"/);
  assert.match(roomSource, /className="forge-bricks"/);
  assert.match(roomSource, /className="plant-blooms"/);
  assert.match(roomSource, /className="wardrobe-panel"/);
});
