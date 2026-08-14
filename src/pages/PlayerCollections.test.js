import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourceUrl = new URL("./PlayerCollections.jsx", import.meta.url);

test("Collections loads authoritative charms and renders the Charm Reliquary", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /loadUserRelicInventory/);
  assert.match(source, /Promise\.all\(\[loadStarfishingProgression\(\), loadUserRelicInventory\(\)\]\)/);
  assert.match(source, /const ownerId = isAuthenticated && user\?\.id \? user\.id : ""/);
  assert.match(source, /loadEpochRef/);
  assert.match(source, /activeOwnerRef\.current !== ownerId/);
  assert.match(source, /loadedOwnerId === ownerId/);
  assert.match(source, /<CharmReliquary charms=\{charms\}/);
  assert.match(source, /<AchievementChronicle achievements=\{progression\?\.achievements \|\| \[\]\}/);
  assert.match(source, /getAchievementPresentation\(achievement\)/);
  assert.match(source, /presentation\.provenanceLabel/);
  assert.match(source, /Achievement Chronicle/);
  assert.match(source, /dateTime=\{achievement\.unlockedAt\}/);
  assert.match(source, /<RelicCharmIcon charm=\{charm\}/);
  assert.match(source, /Equipped/);
  assert.match(source, /presentation\.provenance/);
  assert.match(source, /presentation\.effectLabels/);
  assert.match(source, /getTrophyPresentation/);
  assert.match(source, /<TrophyShelf trophies=\{progression\?\.trophies \|\| \[\]\}/);
  assert.match(source, /Awarded \{presentation\.acquiredLabel\}/);
  assert.match(source, /getApprovedCollectibleArtAsset\(COLLECTIBLE_ART_KINDS\.trophy, trophyKey\)/);
  assert.match(source, /data-trophy-art=\{trophyKey\}/);
});
