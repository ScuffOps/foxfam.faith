export const STARFISHING_ART_PLANE = Object.freeze({
  width: 960,
  height: 640,
  aspect: "3:2",
});

export const STARFISHING_ART_ASSETS = Object.freeze({
  environment: Object.freeze({
    slotId: "starfishing.pond",
    textureKey: "starfishing-environment",
    sceneLayer: "environment",
    requiresTransparency: false,
  }),
  foreground: Object.freeze({
    slotId: "starfishing.pond-foreground",
    textureKey: "starfishing-foreground",
    sceneLayer: "foreground",
    requiresTransparency: true,
  }),
  rig: Object.freeze({
    slotId: "starfishing.rig",
    textureKey: "starfishing-rig",
    sceneLayer: "rig",
    requiresTransparency: true,
  }),
  fisher: Object.freeze({
    slotId: "starfishing.fisher",
    textureKey: "starfishing-fisher-atlas",
    sceneLayer: "fisher",
    requiresTransparency: true,
  }),
  fishFamily: Object.freeze({
    slotId: "starfishing.fish-family",
    textureKey: "starfishing-fish-atlas",
    sceneLayer: "reveal",
    requiresTransparency: true,
  }),
  qte: Object.freeze({
    slotId: "starfishing.qte",
    textureKey: "starfishing-qte-atlas",
    sceneLayer: "interaction",
    requiresTransparency: true,
  }),
});

export const STARFISHING_ART_LAYERS = Object.freeze({
  environment: 0,
  underwater: 10,
  familiar: 20,
  fisher: 30,
  foreground: 40,
  rig: 50,
  reveal: 60,
});

export const STARFISHING_ART_ANCHORS = Object.freeze({
  familiar: Object.freeze({ x: 0.24, y: 0.8 }),
  rodStart: Object.freeze({ x: 0.29, y: 0.7 }),
  rodEnd: Object.freeze({ x: 0.43, y: 0.52 }),
  bobber: Object.freeze({ x: 0.62, y: 0.58 }),
  catchShadow: Object.freeze({ x: 0.68, y: 0.66 }),
  catch: Object.freeze({ x: 0.68, y: 0.62 }),
  qte: Object.freeze({ x: 0.84, y: 0.27 }),
});

export const STARFISHING_ART_SAFE_ZONES = Object.freeze({
  familiar: Object.freeze({ left: 0.14, right: 0.34, top: 0.57, bottom: 0.84 }),
  activeWater: Object.freeze({ left: 0.5, right: 0.78, top: 0.45, bottom: 0.74 }),
  sceneLabel: Object.freeze({ left: 0.01, right: 0.25, top: 0.01, bottom: 0.11 }),
});
