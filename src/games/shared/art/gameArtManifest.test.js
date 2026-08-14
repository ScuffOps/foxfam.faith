import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { GAME_WORLD_ORDER } from "../../../lib/gameHubCatalog.js";
import {
  GAME_ART_APPROVAL,
  GAME_ART_CLASSES,
  GAME_ART_CONTRACT_ID,
  GAME_ART_PERSPECTIVES,
  GAME_ART_SLOTS,
  getApprovedGameArtFamily,
  getApprovedGameArtAsset,
  getGameArtSlots,
} from "./gameArtManifest.js";

test("every staged world has an environment and interaction-ready art family", () => {
  for (const world of GAME_WORLD_ORDER) {
    const slots = getGameArtSlots(world.key);
    assert.ok(slots.length >= 3, `${world.key} needs at least three production art slots`);
    assert.ok(slots.some((slot) => slot.assetClass === GAME_ART_CLASSES.environment), `${world.key} needs an environment slot`);
    assert.ok(slots.some((slot) => [GAME_ART_CLASSES.interaction, GAME_ART_CLASSES.prop, GAME_ART_CLASSES.sprite].includes(slot.assetClass)), `${world.key} needs interactive art`);
  }
});

test("art slots use unique ids and approved export vocabulary", () => {
  assert.equal(new Set(GAME_ART_SLOTS.map((slot) => slot.id)).size, GAME_ART_SLOTS.length);
  const classes = new Set(Object.values(GAME_ART_CLASSES));
  const perspectives = new Set(Object.values(GAME_ART_PERSPECTIVES));
  const approvals = new Set(Object.values(GAME_ART_APPROVAL));

  for (const slot of GAME_ART_SLOTS) {
    assert.ok(classes.has(slot.assetClass));
    assert.ok(perspectives.has(slot.perspective));
    assert.ok(approvals.has(slot.approval));
    assert.equal(slot.artContract, GAME_ART_CONTRACT_ID);
    assert.match(slot.aspect, /^\d+:\d+$/);
    assert.ok(slot.brief.length >= 24);
  }
});

test("atlas slots describe whole deployable file dimensions rather than one cell", () => {
  const expectedAtlasAspects = {
    "starfishing.fisher": "9:8",
    "starfishing.fish-family": "3:2",
    "starfishing.qte": "1:1",
    "match-merge.offerings": "3:2",
    "boba-cafe.customers": "9:8",
    "boba-cafe.ingredients": "5:4",
    "boba-cafe.drink-states": "5:1",
    "find-vezmir.clues": "1:1",
    "find-vezmir.depth": "1:1",
    "time-runner.runner": "4:1",
    "time-runner.shards": "1:1",
    "time-runner.actions": "1:1",
    "word-garden.bloom-family": "4:1",
  };

  for (const [id, aspect] of Object.entries(expectedAtlasAspects)) {
    assert.equal(GAME_ART_SLOTS.find((slot) => slot.id === id)?.aspect, aspect, id);
  }
});

test("only checkpointed art carries complete approval provenance", () => {
  for (const slot of GAME_ART_SLOTS) {
    if (slot.approval === GAME_ART_APPROVAL.approved) {
      assert.match(slot.assetPath || "", /^\/assets\/game-hub\//);
      assert.ok(slot.approvedBy);
      assert.ok(slot.approvedAt);
    } else {
      assert.equal(slot.assetPath, null);
      assert.equal(slot.approvedBy, null);
      assert.equal(slot.approvedAt, null);
    }
  }
});

test("art cannot resolve without explicit Foxfam render approval provenance", () => {
  const source = readFileSync(new URL("./gameArtManifest.js", import.meta.url), "utf8");

  assert.match(source, /slot\.artContract === GAME_ART_CONTRACT_ID/);
  assert.match(source, /slot\.approvedBy/);
  assert.match(source, /slot\.approvedAt/);
});

test("approved art paths resolve only through the approval boundary", () => {
  assert.equal(getApprovedGameArtAsset("quarters.room"), "/assets/game-hub/quarters/quarters-room.png");
  assert.equal(getApprovedGameArtAsset("quarters.room-fixtures"), "/assets/game-hub/quarters/quarters-fixtures.svg");
  assert.equal(getApprovedGameArtAsset("quarters.room-foreground"), "/assets/game-hub/quarters/quarters-foreground.svg");
  assert.equal(getApprovedGameArtAsset("quarters.courtyard"), "/assets/game-hub/courtyard/priory-courtyard.png");
  assert.equal(getApprovedGameArtAsset("starfishing.pond"), "/assets/game-hub/starfishing/constellation-pond.png");
  assert.equal(getApprovedGameArtAsset("starfishing.pond-foreground"), null);
  assert.equal(getApprovedGameArtAsset("starfishing.rig"), null);
  assert.equal(getApprovedGameArtAsset("missing.slot"), null);
  assert.equal(getApprovedGameArtAsset("boba-cafe.room-bg"), "/assets/game-hub/boba-cafe/moonbrew-room-bg.svg");
  assert.equal(getApprovedGameArtAsset("boba-cafe.workstations"), "/assets/game-hub/boba-cafe/moonbrew-workstations.svg");
  assert.equal(getApprovedGameArtAsset("boba-cafe.counter-fg"), "/assets/game-hub/boba-cafe/moonbrew-counter-fg.svg");
  assert.equal(getApprovedGameArtAsset("match-merge.reliquary"), "/assets/game-hub/match-merge/reliquary-room.png");
  assert.equal(getApprovedGameArtAsset("time-runner.clocktower"), "/assets/game-hub/time-runner/clocktower-route.png");
  assert.equal(getApprovedGameArtAsset("word-garden.conservatory"), "/assets/game-hub/word-garden/conservatory.png");
  assert.equal(getApprovedGameArtAsset("find-vezmir.cloister-background"), null);
  assert.equal(getApprovedGameArtAsset("find-vezmir.cloister-room"), null);
  assert.equal(getApprovedGameArtAsset("find-vezmir.cloister-foreground"), null);
});

test("approved art families resolve atomically or remain on their coherent fallback", () => {
  assert.deepEqual(getApprovedGameArtFamily([
    "boba-cafe.room-bg",
    "boba-cafe.workstations",
    "boba-cafe.counter-fg",
  ]), {
    "boba-cafe.room-bg": "/assets/game-hub/boba-cafe/moonbrew-room-bg.svg",
    "boba-cafe.workstations": "/assets/game-hub/boba-cafe/moonbrew-workstations.svg",
    "boba-cafe.counter-fg": "/assets/game-hub/boba-cafe/moonbrew-counter-fg.svg",
  });
  assert.equal(getApprovedGameArtFamily([
    "starfishing.rig",
    "starfishing.fisher",
    "starfishing.fish-family",
    "starfishing.qte",
  ]), null);
  assert.equal(getApprovedGameArtFamily([]), null);
});

test("rejected environment exports cannot resolve as approved art", () => {
  for (const id of [
    "find-vezmir.cloister-background",
    "find-vezmir.cloister-room",
    "find-vezmir.cloister-foreground",
  ]) {
    assert.equal(getApprovedGameArtAsset(id), null);
  }
});

test("game scenes cannot bypass the approval manifest with direct environment paths", () => {
  const scenePaths = [
    "../../../components/quarters/IsometricRoom.jsx",
    "../../../components/quarters/PrioryCourtyard.jsx",
    "../../findVezmir/ui/CloisterDiorama.jsx",
    "../../starfishing/phaser/StarfishingScene.js",
    "../../matchMerge/ui/MatchMergeBoard.jsx",
    "../../bobaCafe/ui/BobaCounter.jsx",
    "../../timeRunner/phaser/TimeRunnerScene.js",
    "../../../pages/WordGarden.jsx",
  ];
  const sourcesByPath = new Map(scenePaths.map((path) => [
    path,
    readFileSync(new URL(path, import.meta.url), "utf8"),
  ]));
  const sceneSources = [...sourcesByPath.values()].join("\n");

  assert.doesNotMatch(sceneSources, /["']\/assets\/game-hub\//);
  for (const slotId of [
    "quarters.room",
    "quarters.room-fixtures",
    "quarters.room-foreground",
    "quarters.courtyard",
    "find-vezmir.cloister-background",
    "find-vezmir.cloister-room",
    "find-vezmir.cloister-foreground",
    "match-merge.reliquary",
    "time-runner.clocktower",
    "word-garden.conservatory",
  ]) {
    assert.match(sceneSources, new RegExp(`getApprovedGameArtAsset\\(\\"${slotId.replace(".", "\\.")}\\"\\)`));
  }

  const bobaSource = sourcesByPath.get("../../bobaCafe/ui/BobaCounter.jsx");
  assert.match(bobaSource, /getApprovedGameArtFamily/);
  for (const slotId of [
    "boba-cafe.room-bg",
    "boba-cafe.workstations",
    "boba-cafe.counter-fg",
  ]) {
    assert.match(bobaSource, new RegExp(`\\"${slotId.replace(".", "\\.")}\\"`));
  }

  const starfishingSource = sourcesByPath.get("../../starfishing/phaser/StarfishingScene.js");
  const starfishingRegistration = readFileSync(
    new URL("../../starfishing/phaser/starfishingArtPlane.js", import.meta.url),
    "utf8",
  );
  assert.match(starfishingSource, /getApprovedGameArtAsset/);
  assert.match(starfishingSource, /STARFISHING_ART_ASSETS\.environment\.slotId/);
  assert.match(starfishingSource, /STARFISHING_ART_ASSETS\.foreground\.slotId/);
  assert.match(starfishingRegistration, /slotId: "starfishing\.pond"/);
  assert.match(starfishingRegistration, /slotId: "starfishing\.pond-foreground"/);
});
