import assert from "node:assert/strict";
import test from "node:test";

import {
  createPublicGameProgressionClient,
} from "./publicGameProgressionClient.js";

const viewerId = "123e4567-e89b-42d3-a456-426614174000";
const profileUserId = "223e4567-e89b-42d3-a456-426614174000";
const charmId = "323e4567-e89b-42d3-a456-426614174000";
const acquiredAt = "2026-07-25T12:00:00.000Z";

const validProjection = {
  profile_user_id: profileUserId,
  fishpedia: {
    discovered_count: 4,
    catalog_count: 6,
    completion_percent: 67,
    total_catches: 18,
  },
  equipped_charms: [{
    id: charmId,
    charm_key: "fishpedia-frame",
    label: "Fishpedia Frame",
    rarity: "mythic",
    slot: "profile-frame",
    star: 3,
    tier: "ascendant",
    source: { type: "achievement", key: "celestial-archivist" },
  }],
  trophies: [{
    trophy_key: "celestial-archivist",
    title: "Celestial Archivist",
    source_achievement_key: "celestial-archivist",
    acquired_at: acquiredAt,
  }],
  cosmetics: {
    profile_frame: "fishpedia-frame",
    profile_particle: null,
  },
};

function createClient(handler, user = { id: viewerId }) {
  return {
    auth: {
      async getUser() {
        return { data: { user }, error: null };
      },
    },
    rpc: handler,
  };
}

test("loads only the public projection through one target-scoped RPC", async () => {
  const calls = [];
  const client = createPublicGameProgressionClient(createClient(async (name, params) => {
    calls.push({ name, params });
    return { data: validProjection, error: null };
  }));

  const projection = await client.loadPublicGameProgression(profileUserId);

  assert.deepEqual(calls, [{
    name: "load_public_game_progression",
    params: { profile_user_id: profileUserId },
  }]);
  assert.equal(projection.profileUserId, profileUserId);
  assert.equal(projection.fishpedia.completionPercent, 67);
  assert.equal(projection.equippedCharms[0].tier, "ascendant");
  assert.equal(projection.trophies[0].title, "Celestial Archivist");
  assert.equal(projection.cosmetics.profileFrame, "fishpedia-frame");
  assert.equal("favor" in projection, false);
  assert.equal("materials" in projection, false);
  assert.equal("recentCatches" in projection, false);
});

test("rejects signed-out access and invalid target identifiers before RPC", async () => {
  let rpcCalls = 0;
  const signedOut = createPublicGameProgressionClient(createClient(async () => {
    rpcCalls += 1;
    return { data: validProjection, error: null };
  }, null));

  await assert.rejects(
    () => signedOut.loadPublicGameProgression(profileUserId),
    /Sign in to view player collections/,
  );
  await assert.rejects(
    () => signedOut.loadPublicGameProgression("not-a-user-id"),
    /Player profile could not be identified/,
  );
  assert.equal(rpcCalls, 0);
});

test("fails closed on malformed or privacy-expanding responses", async () => {
  const malformed = createPublicGameProgressionClient(createClient(async () => ({
    data: {
      ...validProjection,
      fishpedia: { ...validProjection.fishpedia, completion_percent: 150 },
      favor: { balance: 999 },
    },
    error: null,
  })));

  await assert.rejects(
    () => malformed.loadPublicGameProgression(profileUserId),
    /Player collection could not be displayed/,
  );
});

test("returns stable safe errors without leaking database details", async () => {
  const client = createPublicGameProgressionClient(createClient(async () => ({
    data: null,
    error: {
      code: "57014",
      message: "statement timeout in private.material_ledger",
      details: "sensitive database state",
    },
  })));

  await assert.rejects(
    () => client.loadPublicGameProgression(profileUserId),
    (error) => {
      assert.equal(error.message, "Player collections are resting for a moment.");
      assert.equal("details" in error, false);
      assert.doesNotMatch(error.message, /ledger|database|private/i);
      return true;
    },
  );
});
