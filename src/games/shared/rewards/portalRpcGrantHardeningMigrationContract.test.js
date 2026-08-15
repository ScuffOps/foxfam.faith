import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20260814220000_harden_inherited_portal_rpc_grants.sql",
    import.meta.url,
  ),
  "utf8",
);

const AUTHENTICATED_ONLY_RPC_SIGNATURES = [
  "public.mark_user_notifications_read(uuid[])",
  "public.set_profile_display_name(uuid, text)",
  "public.set_profile_role(uuid, text)",
];

test("forward migration removes inherited anonymous RPC grants", () => {
  for (const signature of AUTHENTICATED_ONLY_RPC_SIGNATURES) {
    const escapedSignature = signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    assert.match(
      migration,
      new RegExp(`revoke all on function ${escapedSignature}\\s+from public, anon, authenticated`, "i"),
    );
    assert.match(
      migration,
      new RegExp(`grant execute on function ${escapedSignature}\\s+to authenticated`, "i"),
    );
  }
});

test("hardening does not revoke intentionally public community interactions", () => {
  assert.doesNotMatch(migration, /sync_community_post_comment_count/i);
  assert.doesNotMatch(migration, /toggle_community_comment_upvote/i);
  assert.match(migration, /has_function_privilege\('anon'/i);
  assert.match(migration, /has_function_privilege\('authenticated'/i);
});
