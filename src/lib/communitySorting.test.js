import assert from "node:assert/strict";
import test from "node:test";
import { getCommunityEngagement, getPollVoteTotal, sortCommunityPosts } from "./communitySorting.js";

test("poll engagement uses poll option votes instead of post upvotes", () => {
  const poll = {
    type: "poll",
    upvotes: 1,
    poll_options: [{ votes: 3 }, { votes: 7 }],
  };

  assert.equal(getPollVoteTotal(poll), 10);
  assert.equal(getCommunityEngagement(poll), 10);
});

test("top sorting orders polls by poll votes and keeps newest as tie breaker", () => {
  const sorted = sortCommunityPosts([
    { id: "older-poll", type: "poll", created_date: "2026-06-19T00:00:00.000Z", poll_options: [{ votes: 4 }] },
    { id: "idea", type: "idea", created_date: "2026-06-20T00:00:00.000Z", upvotes: 8 },
    { id: "newer-poll", type: "poll", created_date: "2026-06-21T00:00:00.000Z", poll_options: [{ votes: 4 }] },
  ], "top").map((post) => post.id);

  assert.deepEqual(sorted, ["idea", "newer-poll", "older-poll"]);
});

test("new sorting uses created date for every post type", () => {
  const sorted = sortCommunityPosts([
    { id: "old-popular", type: "poll", created_date: "2026-06-19T00:00:00.000Z", poll_options: [{ votes: 99 }] },
    { id: "new-quiet", type: "poll", created_date: "2026-06-21T00:00:00.000Z", poll_options: [{ votes: 1 }] },
  ], "new").map((post) => post.id);

  assert.deepEqual(sorted, ["new-quiet", "old-popular"]);
});
