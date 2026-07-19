import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260718210000_add_community_post_metadata_rpcs.sql", import.meta.url),
  "utf8",
);

test("community post metadata RPC locks the row, limits fields, and owns edited_at", () => {
  assert.match(migration, /create or replace function public\.update_community_post_metadata\(\s*post_id uuid,\s*patch jsonb\s*\)/);
  assert.match(migration, /security definer\s+set search_path = ''/);
  assert.match(migration, /from public\.community_posts as post_row\s+where post_row\.id = post_id\s+for update;/);
  assert.match(migration, /jsonb_object_keys\(patch\)/);
  assert.match(migration, /'title', 'description', 'status', 'roadmap_status'/);
  assert.match(migration, /data = locked_post\.data \|\| patch \|\| jsonb_build_object\('edited_at'/);
  assert.match(migration, /revoke update on table public\.community_posts from public, anon, authenticated;/);
});

test("community post metadata authorization separates owner text edits from staff workflow edits", () => {
  assert.match(migration, /actor_role := coalesce\(private\.current_user_role\(\), 'guest'\);/);
  assert.match(migration, /coalesce\(locked_post\.user_id = caller_id, false\) or actor_role in \('admin', 'lead_mod', 'mod'\)/);
  assert.match(migration, /actor_role not in \('admin', 'lead_mod', 'mod'\)/);
  assert.match(migration, /Only owners or staff can edit post text/);
  assert.match(migration, /Only staff can change post workflow/);
});

test("comment sync safely supports existing anonymous comments while metadata stays authenticated only", () => {
  assert.match(migration, /create or replace function public\.sync_community_post_comment_count\(post_id uuid\)/);
  assert.match(migration, /from public\.community_post_comments as comment_row\s+where comment_row\.data ->> 'post_id' = post_id::text/);
  assert.match(migration, /revoke execute on function public\.update_community_post_metadata\(uuid, jsonb\)\s+from public, anon;/);
  assert.match(migration, /grant execute on function public\.update_community_post_metadata\(uuid, jsonb\)\s+to authenticated;/);
  assert.match(migration, /revoke execute on function public\.sync_community_post_comment_count\(uuid\) from public, anon;/);
  assert.match(migration, /grant execute on function public\.sync_community_post_comment_count\(uuid\) to anon, authenticated;/);
  const syncFunction = migration.slice(
    migration.indexOf("create or replace function public.sync_community_post_comment_count"),
    migration.indexOf("revoke update on table public.community_posts"),
  );
  assert.doesNotMatch(syncFunction, /Authentication required|auth\.uid/);
});
