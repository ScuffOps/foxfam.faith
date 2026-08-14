import assert from "node:assert/strict";
import test from "node:test";
import {
  STARFISHING_ART_ASSETS,
  STARFISHING_ART_ANCHORS,
  STARFISHING_ART_LAYERS,
  STARFISHING_ART_PLANE,
  STARFISHING_ART_SAFE_ZONES,
} from "./starfishingArtPlane.js";

test("Starfishing uses the approved 3:2 registration plane", () => {
  assert.deepEqual(STARFISHING_ART_PLANE, { width: 960, height: 640, aspect: "3:2" });
  assert.equal(STARFISHING_ART_PLANE.width / STARFISHING_ART_PLANE.height, 3 / 2);
});

test("Starfishing art layers preserve deterministic occlusion order", () => {
  assert.deepEqual(STARFISHING_ART_LAYERS, {
    environment: 0,
    underwater: 10,
    familiar: 20,
    fisher: 30,
    foreground: 40,
    rig: 50,
    reveal: 60,
  });
});

test("Starfishing registers separate environment and transparent foreground assets", () => {
  assert.deepEqual(STARFISHING_ART_ASSETS.environment, {
    slotId: "starfishing.pond",
    textureKey: "starfishing-environment",
    sceneLayer: "environment",
    requiresTransparency: false,
  });
  assert.deepEqual(STARFISHING_ART_ASSETS.foreground, {
    slotId: "starfishing.pond-foreground",
    textureKey: "starfishing-foreground",
    sceneLayer: "foreground",
    requiresTransparency: true,
  });
});

test("runtime anchors remain normalized and inside their authored safe zones", () => {
  for (const point of Object.values(STARFISHING_ART_ANCHORS)) {
    assert.ok(point.x >= 0 && point.x <= 1);
    assert.ok(point.y >= 0 && point.y <= 1);
  }

  assertPointInside(STARFISHING_ART_ANCHORS.familiar, STARFISHING_ART_SAFE_ZONES.familiar);
  assertPointInside(STARFISHING_ART_ANCHORS.bobber, STARFISHING_ART_SAFE_ZONES.activeWater);
  assertPointInside(STARFISHING_ART_ANCHORS.catchShadow, STARFISHING_ART_SAFE_ZONES.activeWater);
  assertPointInside(STARFISHING_ART_ANCHORS.catch, STARFISHING_ART_SAFE_ZONES.activeWater);
});

function assertPointInside(point, zone) {
  assert.ok(point.x >= zone.left && point.x <= zone.right);
  assert.ok(point.y >= zone.top && point.y <= zone.bottom);
}
