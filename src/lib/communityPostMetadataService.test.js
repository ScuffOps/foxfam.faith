import assert from "node:assert/strict";
import test from "node:test";
import { createCommunityPostMetadataService } from "./communityPostMetadataService.js";

const postId = "123e4567-e89b-42d3-a456-426614174000";

test("metadata adapter sends only the post ID and allowed patch without reading current post state", async () => {
  const calls = [];
  const service = createCommunityPostMetadataService({
    async rpc(name, params) {
      calls.push({ name, params });
      return { data: { id: postId }, error: null };
    },
  });

  await service.updateMetadata(postId, {
    title: "  A safer title  ",
    description: "Keep the canonical counters on the server.",
  });

  assert.deepEqual(calls, [{
    name: "update_community_post_metadata",
    params: {
      post_id: postId,
      patch: {
        title: "A safer title",
        description: "Keep the canonical counters on the server.",
      },
    },
  }]);
});

test("metadata adapter rejects server-owned and unknown patch keys before RPC", async () => {
  let calls = 0;
  const service = createCommunityPostMetadataService({
    async rpc() {
      calls += 1;
      return { data: null, error: null };
    },
  });

  await assert.rejects(
    () => service.updateMetadata(postId, { title: "No forged votes", upvotes: 999 }),
    /not editable/i,
  );
  await assert.rejects(
    () => service.updateMetadata(postId, { poll_options: [] }),
    /not editable/i,
  );
  await assert.rejects(
    () => service.updateMetadata(postId, { comment_count: 4 }),
    /not editable/i,
  );
  await assert.rejects(
    () => service.updateMetadata(postId, { edited_at: "forged" }),
    /not editable/i,
  );
  assert.equal(calls, 0);
});

test("comment-count sync sends no client count or amount", async () => {
  let call;
  const service = createCommunityPostMetadataService({
    async rpc(name, params) {
      call = { name, params };
      return { data: { id: postId, comment_count: 2 }, error: null };
    },
  });

  await service.syncCommentCount(postId);

  assert.deepEqual(call, {
    name: "sync_community_post_comment_count",
    params: { post_id: postId },
  });
});

test("metadata adapter normalizes RPC errors without transport details", async () => {
  const service = createCommunityPostMetadataService({
    async rpc() {
      return {
        data: null,
        error: {
          code: "42501",
          message: "Only staff can change post status",
          details: "raw transport detail",
        },
      };
    },
  });

  await assert.rejects(
    () => service.updateMetadata(postId, { status: "approved" }),
    (error) => {
      assert.equal(error.name, "CommunityPostMetadataError");
      assert.equal(error.code, "42501");
      assert.equal(error.message, "Only staff can change post status");
      assert.equal("details" in error, false);
      return true;
    },
  );
});
