import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function handlerSource(source, handlerName, nextHandlerName) {
  const start = source.indexOf(`const ${handlerName} = async`);
  const end = nextHandlerName
    ? source.indexOf(`const ${nextHandlerName} = async`, start)
    : source.length;

  assert.ok(start >= 0, `${handlerName} is missing`);
  assert.ok(end > start, `${handlerName} boundary is missing`);
  return source.slice(start, end);
}

const postForm = readSource("../components/community/PostForm.jsx");
const ideaCard = readSource("../components/community/IdeaCard.jsx");
const pollCard = readSource("../components/community/PollCard.jsx");
const blessingCard = readSource("../components/blessings/BlessingCard.jsx");
const blessingForm = readSource("../components/blessings/BlessingForm.jsx");
const reliquaryCard = readSource("../components/reliquary/ReliquaryEntryCard.jsx");
const usePoints = readSource("../hooks/usePoints.js");
const boop = readSource("../components/dashboard/BoopTheFox.jsx");

test("social creators award from the authoritative created row or comment ID", () => {
  assert.match(postForm, /const createdPost = await communityClient\.entities\.CommunityPost\.create\(data\);/);
  assert.match(postForm, /awardPoints\(currentUser, "submit-post", createdPost\.id\)/);
  assert.match(blessingForm, /const createdBlessing = await communityClient\.entities\.Blessing\.create\(/);
  assert.match(blessingForm, /awardPoints\(user, "post-blessing", createdBlessing\.id\)/);
  assert.match(blessingCard, /const createdComment = await communityClient\.entities\.BlessingComment\.create\(/);
  assert.match(blessingCard, /awardPoints\(user, "blessing-comment", createdComment\.id\)/);
  assert.match(reliquaryCard, /const createdComment = await communityClient\.entities\.ReliquaryComment\.create\(/);
  assert.match(reliquaryCard, /awardPoints\(user, "reliquary-comment", createdComment\.id\)/);
});

test("praise and poll handlers delegate canonical writes and Favor to the server gateway", () => {
  const ideaPraise = handlerSource(ideaCard, "handleUpvote", "handleApprove");
  const pollVote = handlerSource(pollCard, "handleVote", "handleApprove");
  const blessingPraise = handlerSource(blessingCard, "handlePraise", "loadComments");

  assert.match(ideaPraise, /awardPoints\(user, "praise-idea", post\.id\)/);
  assert.doesNotMatch(ideaPraise, /CommunityPost\.update/);
  assert.match(pollVote, /awardPoints\(user, "vote-poll", post\.id, optionId\)/);
  assert.doesNotMatch(pollVote, /CommunityPost\.update/);
  assert.match(blessingPraise, /awardPoints\(user, "praise-blessing", blessing\.id\)/);
  assert.doesNotMatch(blessingPraise, /Blessing\.update/);
});

test("Favor writes have no arbitrary client amount path and boops do not claim Favor", () => {
  assert.doesNotMatch(usePoints, /awardPointAmount/);
  assert.match(usePoints, /favorService\.performAction\(actionKey, sourceId, optionKey\)/);
  assert.doesNotMatch(boop, /awardPointAmount|\+\$\{reward\.points\} Favor|communityClient\.auth\.me/);
});
