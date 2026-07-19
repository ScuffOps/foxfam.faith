import { supabase } from "../api/communityClient.js";

const UPDATE_METADATA_RPC = "update_community_post_metadata";
const SYNC_COMMENT_COUNT_RPC = "sync_community_post_comment_count";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EDITABLE_PATCH_KEYS = new Set(["title", "description", "status", "roadmap_status"]);
const REQUIRED_TEXT_KEYS = new Set(["title", "status", "roadmap_status"]);

function requirePostId(postId) {
  const cleanedPostId = typeof postId === "string" ? postId.trim() : "";
  if (!UUID_PATTERN.test(cleanedPostId)) {
    throw new Error("Community post must be a valid UUID.");
  }
  return cleanedPostId;
}

function normalizePatch(patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new Error("Community post metadata must be an object.");
  }

  const entries = Object.entries(patch);
  if (entries.length === 0) {
    throw new Error("Community post metadata cannot be empty.");
  }

  const normalizedPatch = {};
  for (const [key, value] of entries) {
    if (!EDITABLE_PATCH_KEYS.has(key)) {
      throw new Error(`Community post field "${key}" is not editable.`);
    }
    if (typeof value !== "string") {
      throw new Error(`Community post field "${key}" must be text.`);
    }

    const normalizedValue = key === "description" ? value : value.trim();
    if (REQUIRED_TEXT_KEYS.has(key) && !normalizedValue) {
      throw new Error(`Community post field "${key}" cannot be empty.`);
    }
    normalizedPatch[key] = normalizedValue;
  }

  return normalizedPatch;
}

function normalizeMetadataError(error) {
  const normalized = new Error(
    typeof error?.message === "string" && error.message.trim()
      ? error.message
      : "Community post update could not be completed.",
  );
  normalized.name = "CommunityPostMetadataError";
  normalized.code = error?.code || "COMMUNITY_POST_METADATA_FAILED";
  return normalized;
}

function requireRpcClient(client) {
  if (!client || typeof client.rpc !== "function") {
    throw new Error("Community post metadata service is unavailable.");
  }
  return client;
}

export function createCommunityPostMetadataService(client = supabase) {
  return {
    async updateMetadata(postId, patch) {
      const { data, error } = await requireRpcClient(client).rpc(UPDATE_METADATA_RPC, {
        post_id: requirePostId(postId),
        patch: normalizePatch(patch),
      });
      if (error) throw normalizeMetadataError(error);
      return data;
    },

    async syncCommentCount(postId) {
      const { data, error } = await requireRpcClient(client).rpc(SYNC_COMMENT_COUNT_RPC, {
        post_id: requirePostId(postId),
      });
      if (error) throw normalizeMetadataError(error);
      return data;
    },
  };
}

export const communityPostMetadataService = createCommunityPostMetadataService();
