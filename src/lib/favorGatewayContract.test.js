import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeFavorActionResult } from "./favorGatewayContract.js";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260718200316_starfishing_phase_2_progression.sql", import.meta.url),
  "utf8",
);

function getSqlFunction(functionName, nextMarker) {
  const start = migration.indexOf(`create or replace function ${functionName}`);
  const end = migration.indexOf(nextMarker, start);

  assert.ok(start >= 0, `${functionName} is missing`);
  assert.ok(end > start, `${functionName} boundary is missing`);
  return migration.slice(start, end);
}

function makeValidFavorResult() {
  return {
    replayed: false,
    favor: {
      delta: 8,
      balance: 30,
    },
    rank: {
      previous: {
        name: "Seeker",
        min: 10,
      },
      current: {
        name: "Faithful",
        min: 30,
      },
      leveled_up: true,
    },
  };
}

test("normalizes the stable Favor action result without mutating the payload", () => {
  const payload = {
    ...makeValidFavorResult(),
    ignored_server_field: "not part of the browser contract",
  };
  const original = structuredClone(payload);

  assert.deepEqual(normalizeFavorActionResult(payload), {
    replayed: false,
    favor: {
      delta: 8,
      balance: 30,
    },
    rank: {
      previous: {
        name: "Seeker",
        min: 10,
      },
      current: {
        name: "Faithful",
        min: 30,
      },
      leveledUp: true,
    },
  });
  assert.deepEqual(payload, original);
});

test("accepts signed safe deltas and the complete transport-safe balance bound", () => {
  assert.deepEqual(normalizeFavorActionResult({
    replayed: false,
    favor: {
      delta: -5,
      balance: 25,
    },
    rank: {
      previous: { name: "Faithful", min: 30 },
      current: { name: "Seeker", min: 10 },
      leveled_up: false,
    },
  }).favor, {
    delta: -5,
    balance: 25,
  });

  assert.equal(normalizeFavorActionResult({
    replayed: false,
    favor: {
      delta: 9007199254740991,
      balance: 9007199254740991,
    },
    rank: {
      previous: { name: "Forsaken", min: 0 },
      current: { name: "Forblessed", min: 300 },
      leveled_up: true,
    },
  }).favor.balance, 9007199254740991);
});

test("rejects malformed balances, replay deltas, and contradictory rank snapshots", () => {
  const validResult = makeValidFavorResult();

  assert.throws(
    () => normalizeFavorActionResult({
      ...validResult,
      favor: { delta: 8, balance: -1 },
    }),
    /Favor balance/i,
  );
  assert.throws(
    () => normalizeFavorActionResult({
      ...validResult,
      favor: { delta: 8, balance: 9007199254740992 },
    }),
    /Favor balance/i,
  );
  assert.throws(
    () => normalizeFavorActionResult({
      ...validResult,
      replayed: true,
    }),
    /replayed Favor action cannot include a delta/i,
  );
  assert.throws(
    () => normalizeFavorActionResult({
      ...validResult,
      rank: {
        ...validResult.rank,
        previous: { name: "Purified", min: 75 },
      },
    }),
    /previous Favor rank/i,
  );
  assert.throws(
    () => normalizeFavorActionResult({
      ...validResult,
      rank: {
        ...validResult.rank,
        leveled_up: false,
      },
    }),
    /rank transition/i,
  );
});

test("migration defines locked private Favor primitives and a separate source identity", () => {
  assert.match(
    migration,
    /create unique index currency_ledger_one_source_identity\s+on public\.currency_ledger \(user_id, currency_key, source_type, source_id\)/,
  );
  assert.match(
    migration,
    /check \(\s*amount <> 0\s+or source_type = 'legacy_opening_balance'\s+or coalesce\(metadata ->> 'legacy_source_marker', 'false'\) = 'true'\s*\)/,
  );
  assert.match(
    migration,
    /create or replace function private\.ensure_favor_account\(\s*account_user_id uuid\s*\)\s*returns bigint/,
  );
  assert.match(
    migration,
    /create or replace function private\.post_favor_entry\(\s*entry_user_id uuid,\s*entry_amount bigint,\s*entry_source_type text,\s*entry_source_id uuid,\s*entry_idempotency_key uuid,\s*entry_metadata jsonb\s*\)\s*returns jsonb/,
  );

  const ensureFunction = getSqlFunction(
    "private.ensure_favor_account(",
    "create or replace function private.post_favor_entry(",
  );
  const syncFunction = getSqlFunction(
    "private.sync_favor_mirror(",
    "create or replace function private.ensure_favor_account(",
  );
  const postFunction = getSqlFunction(
    "private.post_favor_entry(",
    "create or replace function public.perform_portal_favor_action(",
  );

  assert.match(
    syncFunction,
    /mirror_level_data is not null[\s\S]*jsonb_typeof\(mirror_level_data\) <> 'object'/,
  );
  assert.match(syncFunction, /message = 'Favor mirror data must be an object'/);
  assert.match(
    ensureFunction,
    /from auth\.users\s+where id = account_user_id\s+for update/,
  );
  assert.match(
    ensureFunction,
    /from public\.currency_accounts as account\s+where account\.user_id = account_user_id\s+and account\.currency_key = 'favor'\s+for update/,
  );
  assert.match(
    ensureFunction,
    /where level_row\.user_id = account_user_id[\s\S]*where level_row\.data ->> 'user_key' = 'user:' \|\| account_user_id::text\s+and \(level_row\.user_id is null or level_row\.user_id = account_user_id\)/,
  );
  assert.match(
    ensureFunction,
    /'starfishing:favor:legacy-opening:' \|\| account_user_id::text/,
  );
  assert.match(
    ensureFunction,
    /Legacy Favor opening balance exceeds JavaScript safe integer range/,
  );
  assert.match(ensureFunction, /'legacy_opening_balance'/);

  assert.match(postFunction, /private\.ensure_favor_account\(entry_user_id\)/);
  assert.match(
    postFunction,
    /from public\.currency_ledger as ledger\s+where ledger\.user_id = entry_user_id\s+and ledger\.currency_key = 'favor'\s+and ledger\.source_type = entry_source_type\s+and ledger\.source_id = entry_source_id/,
  );
  assert.match(postFunction, /Favor idempotency key is already used by another source/);
  assert.match(postFunction, /next_balance_numeric < 0/);
  assert.match(postFunction, /next_balance_numeric > 9007199254740991/);
  assert.match(
    postFunction,
    /entry_amount = 0[\s\S]*coalesce\(entry_metadata ->> 'legacy_source_marker', 'false'\) <> 'true'/,
  );
  assert.match(postFunction, /insert into public\.currency_ledger/);
  assert.match(postFunction, /update public\.currency_accounts/);
  assert.match(postFunction, /private\.sync_favor_mirror\(/);
  assert.match(
    migration,
    /revoke all on function private\.ensure_favor_account\(uuid\) from public, anon, authenticated;/,
  );
  assert.match(
    migration,
    /revoke all on function private\.post_favor_entry\(uuid, bigint, text, uuid, uuid, jsonb\)\s+from public, anon, authenticated;/,
  );
  assert.doesNotMatch(migration, /grant execute on function private\./);
});

test("portal Favor RPC owns reward values and accepts no client reward fields", () => {
  assert.match(
    migration,
    /create or replace function public\.perform_portal_favor_action\(\s*action_key text,\s*source_id uuid,\s*option_key text default null\s*\)/,
  );
  assert.doesNotMatch(
    migration,
    /perform_portal_favor_action\([^)]*(amount|balance|target_user|reward|metadata)/,
  );

  const actionFunction = getSqlFunction(
    "public.perform_portal_favor_action(",
    "create or replace function public.start_starfishing_cast()",
  );

  assert.match(actionFunction, /security definer\s+set search_path = ''/);
  assert.match(actionFunction, /caller_id uuid := \(select auth\.uid\(\)\)/);
  assert.match(actionFunction, /when 'submit-post' then 5/);
  assert.match(actionFunction, /when 'post-blessing' then 8/);
  assert.match(actionFunction, /when 'blessing-comment' then 3/);
  assert.match(actionFunction, /when 'reliquary-comment' then 3/);
  assert.match(actionFunction, /when 'praise-blessing' then 1/);
  assert.match(actionFunction, /when 'praise-idea' then 1/);
  assert.match(actionFunction, /when 'vote-poll' then 2/);
  assert.match(
    actionFunction,
    /'leveled_up',\s+\(current_rank ->> 'min'\)::integer > \(previous_rank ->> 'min'\)::integer/,
  );
  assert.doesNotMatch(actionFunction, /\b(amount|balance|target_user|reward_metadata)\s*:=\s*action_/);
  assert.match(
    migration,
    /revoke execute on function public\.perform_portal_favor_action\(text, uuid, text\)\s+from public, anon;/,
  );
  assert.match(
    migration,
    /grant execute on function public\.perform_portal_favor_action\(text, uuid, text\)\s+to authenticated;/,
  );
  assert.doesNotMatch(migration, /revoke [^;]*on table public\.user_levels/);
  assert.doesNotMatch(migration, /revoke [^;]*on table public\.user_relics\b/);
});

test("historical snapshot exhaustively reserves all community posts once and is immutable", () => {
  assert.match(
    migration,
    /create table if not exists private\.favor_gateway_cutovers \(\s*cutover_key text primary key,\s*cutover_at timestamptz not null,\s*constraint favor_gateway_cutovers_singleton\s+check \(cutover_key = 'portal-actions-v1'\)\s*\)/,
  );
  assert.match(
    migration,
    /create table if not exists private\.favor_gateway_historical_sources \(\s*action_key text not null,\s*source_id uuid not null,\s*snapshotted_at timestamptz not null,\s*primary key \(action_key, source_id\),\s*constraint favor_gateway_historical_action_key\s+check \(action_key in \(\s*'submit-post',\s*'post-blessing',\s*'blessing-comment',\s*'reliquary-comment',\s*'praise-blessing',\s*'praise-idea',\s*'vote-poll'\s*\)\)\s*\)/,
  );
  assert.match(
    migration,
    /insert into private\.favor_gateway_cutovers \(cutover_key, cutover_at\)\s+values \('portal-actions-v1', snapshot_cutover_at\)\s+on conflict \(cutover_key\) do nothing\s+returning true into cutover_created;/,
  );
  assert.match(
    migration,
    /revoke all on table private\.favor_gateway_cutovers from public, anon, authenticated;/,
  );
  assert.match(
    migration,
    /revoke all on table private\.favor_gateway_historical_sources from public, anon, authenticated;/,
  );
  assert.doesNotMatch(
    migration,
    /grant [^;]+ on table private\.(?:favor_gateway_cutovers|favor_gateway_historical_sources) to (public|anon|authenticated)/,
  );

  const backfillStart = migration.indexOf("do $$\ndeclare\n  cutover_created");
  const backfillEnd = migration.indexOf(
    "create or replace function private.reject_favor_gateway_cutover_mutation()",
  );
  assert.ok(backfillStart >= 0 && backfillEnd > backfillStart);
  const backfill = migration.slice(backfillStart, backfillEnd);

  assert.match(
    backfill,
    /if coalesce\(cutover_created, false\) then\s+insert into private\.favor_gateway_historical_sources/,
  );
  assert.equal((backfill.match(/::text as action_key/g) || []).length, 7);
  assert.match(
    backfill,
    /select 'submit-post'::text as action_key, submitted_post\.id as source_id\s+from public\.community_posts as submitted_post\s+union all/,
  );
  assert.match(
    backfill,
    /select 'post-blessing'::text as action_key, posted_blessing\.id as source_id\s+from public\.blessings as posted_blessing/,
  );
  assert.match(
    backfill,
    /select 'blessing-comment'::text as action_key, blessing_comment\.id as source_id\s+from public\.blessing_comments as blessing_comment/,
  );
  assert.match(
    backfill,
    /select 'reliquary-comment'::text as action_key, reliquary_comment\.id as source_id\s+from public\.reliquary_comments as reliquary_comment/,
  );
  assert.match(
    backfill,
    /select 'praise-blessing'::text as action_key, praised_blessing\.id as source_id\s+from public\.blessings as praised_blessing/,
  );
  assert.match(
    backfill,
    /select 'praise-idea'::text as action_key, praised_post\.id as source_id\s+from public\.community_posts as praised_post\s+union all/,
  );
  assert.match(
    backfill,
    /select 'vote-poll'::text as action_key, poll_post\.id as source_id\s+from public\.community_posts as poll_post\s+\) as historical/,
  );
  assert.equal(
    (
      backfill.match(
        /select '(?:submit-post|praise-idea|vote-poll)'::text as action_key, [a-z_]+\.id as source_id\s+from public\.community_posts as [a-z_]+/g,
      ) || []
    ).length,
    3,
  );
  assert.doesNotMatch(
    backfill,
    /from public\.community_posts as [a-z_]+\s+where\b/i,
  );
  assert.match(
    backfill,
    /on conflict \(action_key, source_id\) do nothing;/,
  );
  assert.doesNotMatch(backfill, /\.created_at/);

  const snapshotTrigger = migration.indexOf(
    "create trigger favor_gateway_historical_sources_are_immutable",
  );
  assert.ok(snapshotTrigger > backfillEnd);
  assert.match(
    migration,
    /create trigger favor_gateway_historical_sources_are_immutable\s+before insert or update or delete or truncate\s+on private\.favor_gateway_historical_sources\s+for each statement\s+execute function private\.reject_favor_gateway_historical_source_mutation\(\);/,
  );
  assert.match(
    migration,
    /revoke all on function private\.reject_favor_gateway_historical_source_mutation\(\)\s+from public, anon, authenticated;/,
  );
});

test("historical snapshot blocks forged future created_at and is checked before positive Favor", () => {
  const actionFunction = getSqlFunction(
    "public.perform_portal_favor_action(",
    "create or replace function public.start_starfishing_cast()",
  );

  assert.match(
    actionFunction,
    /from private\.favor_gateway_historical_sources as historical\s+where historical\.action_key = requested_action\s+and historical\.source_id = requested_source_id/,
  );
  assert.match(
    actionFunction,
    /if source_is_historical then\s+should_award := false;\s+mark_source_without_award := true;\s+end if;/,
  );
  assert.doesNotMatch(actionFunction, /portal_row_created_at|portal_cutover_at/);
  assert.doesNotMatch(actionFunction, /favor_gateway_cutovers/);
  assert.doesNotMatch(actionFunction, /created_at/i);
  assert.match(
    actionFunction,
    /'legacy_source_marker', true,\s*'historical_source_snapshot', source_is_historical/,
  );
  assert.match(actionFunction, /should_award boolean := true/);
  assert.match(
    actionFunction,
    /if should_award then\s+action_result := private\.post_favor_entry\(\s*caller_id,\s*portal_reward,/,
  );

  const snapshotLookup = actionFunction.indexOf(
    "from private.favor_gateway_historical_sources as historical",
  );
  const positivePost = actionFunction.indexOf("if should_award then");
  assert.ok(snapshotLookup >= 0 && positivePost > snapshotLookup);
});

test("portal Favor RPC validates exact row ownership and nested comment references", () => {
  const actionFunction = getSqlFunction(
    "public.perform_portal_favor_action(",
    "create or replace function public.start_starfishing_cast()",
  );

  assert.match(
    actionFunction,
    /from public\.community_posts as post_row\s+where post_row\.id = source_id\s+for update/,
  );
  assert.match(actionFunction, /portal_row_user_id is distinct from caller_id/);
  assert.doesNotMatch(actionFunction, /portal_row_user_id <> caller_id/);
  assert.match(
    actionFunction,
    /coalesce\(portal_row_data ->> 'type', ''\)\s+not in \('idea', 'poll', 'feedback', 'update'\)/,
  );
  assert.match(
    actionFunction,
    /coalesce\(portal_row_data ->> 'type', ''\)\s+not in \('idea', 'feedback', 'update'\)/,
  );
  assert.match(actionFunction, /coalesce\(portal_row_data ->> 'type', ''\) <> 'poll'/);
  assert.match(
    actionFunction,
    /from public\.blessings as blessing_row\s+where blessing_row\.id = source_id\s+for update/,
  );
  assert.match(
    actionFunction,
    /from public\.blessing_comments as comment_row\s+where comment_row\.id = source_id\s+for update/,
  );
  assert.match(actionFunction, /portal_row_data ->> 'blessing_id'/);
  assert.match(actionFunction, /from public\.blessings as parent_blessing/);
  assert.match(
    actionFunction,
    /from public\.reliquary_comments as comment_row\s+where comment_row\.id = source_id\s+for update/,
  );
  assert.match(actionFunction, /portal_row_data ->> 'entry_id'/);
  assert.match(actionFunction, /from public\.reliquary_entries as parent_entry/);
});

test("portal Favor validation separates unsafe casts and JSON expansion guards", () => {
  const actionFunction = getSqlFunction(
    "public.perform_portal_favor_action(",
    "create or replace function public.start_starfishing_cast()",
  );

  assert.match(
    actionFunction,
    /if parent_id_text is null\s+or parent_id_text !~\* '[^']+' then\s+raise exception using errcode = '22023', message = 'Invalid blessing comment source';\s+end if;\s+if not exists \(\s+select 1\s+from public\.blessings as parent_blessing\s+where parent_blessing\.id = parent_id_text::uuid\s+\) then/,
  );
  assert.match(
    actionFunction,
    /if parent_id_text is null\s+or parent_id_text !~\* '[^']+' then\s+raise exception using errcode = '22023', message = 'Invalid reliquary comment source';\s+end if;\s+if not exists \(\s+select 1\s+from public\.reliquary_entries as parent_entry\s+where parent_entry\.id = parent_id_text::uuid\s+\) then/,
  );
  assert.match(
    actionFunction,
    /if coalesce\(pg_catalog\.jsonb_typeof\(portal_row_data -> 'upvoted_by'\), 'null'\)\s+<> 'array' then[\s\S]*?end if;\s+if exists \(\s+select 1\s+from pg_catalog\.jsonb_array_elements\(\s*portal_row_data -> 'upvoted_by'/,
  );
  assert.match(
    actionFunction,
    /if coalesce\(pg_catalog\.jsonb_typeof\(portal_row_data -> 'poll_options'\), 'null'\)\s+<> 'array' then[\s\S]*?end if;\s+if pg_catalog\.jsonb_array_length\(portal_row_data -> 'poll_options'\) = 0 then/,
  );
  assert.match(
    actionFunction,
    /if exists \(\s+select 1\s+from pg_catalog\.jsonb_array_elements\(\s*portal_row_data -> 'poll_options'\s*\) as option\(value\)\s+where pg_catalog\.jsonb_typeof\(option\.value\) <> 'object'\s+\) then[\s\S]*?end if;\s+if exists \(/,
  );
  assert.match(
    actionFunction,
    /if exists \(\s+select 1\s+from pg_catalog\.jsonb_array_elements\(\s*portal_row_data -> 'poll_options'\s*\) as option\(value\)\s+cross join lateral pg_catalog\.jsonb_array_elements\(\s*option\.value -> 'voted_by'/,
  );
  assert.doesNotMatch(
    actionFunction,
    /or pg_catalog\.jsonb_array_length\(portal_row_data -> 'poll_options'\)/,
  );
  assert.doesNotMatch(
    actionFunction,
    /or not exists \(\s+select 1\s+from public\.(?:blessings|reliquary_entries)[\s\S]*?parent_id_text::uuid/,
  );
});

test("praise and poll branches lock and mutate canonical JSON arrays inside the RPC", () => {
  const actionFunction = getSqlFunction(
    "public.perform_portal_favor_action(",
    "create or replace function public.start_starfishing_cast()",
  );

  assert.match(actionFunction, /actor_key := 'user:' \|\| caller_id::text/);
  assert.match(
    actionFunction,
    /coalesce\(pg_catalog\.jsonb_typeof\(portal_row_data -> 'upvoted_by'\), 'null'\)\s+<> 'array'/,
  );
  assert.match(
    actionFunction,
    /if exists \(\s+select 1\s+from pg_catalog\.jsonb_array_elements\(\s*portal_row_data -> 'upvoted_by'/,
  );
  assert.match(
    actionFunction,
    /update public\.blessings\s+set data = next_portal_data\s+where id = source_id/,
  );
  assert.match(
    actionFunction,
    /update public\.community_posts\s+set data = next_portal_data\s+where id = source_id/,
  );
  assert.match(
    actionFunction,
    /coalesce\(pg_catalog\.jsonb_typeof\(portal_row_data -> 'poll_options'\), 'null'\)\s+<> 'array'/,
  );
  assert.match(
    actionFunction,
    /cross join lateral pg_catalog\.jsonb_array_elements\(\s*option\.value -> 'voted_by'/,
  );
  assert.match(actionFunction, /option\.value ->> 'id' = cleaned_option_key/);
  assert.match(actionFunction, /option\.value -> 'voted_by'/);
  assert.match(
    actionFunction,
    /'\{votes\}',\s+pg_catalog\.to_jsonb\(\s*pg_catalog\.jsonb_array_length/,
  );
  assert.match(actionFunction, /mark_source_without_award := true/);
  assert.match(
    actionFunction,
    /private\.post_favor_entry\(\s*caller_id,\s*0,\s*requested_action,\s*source_id,\s*portal_idempotency_key,\s*pg_catalog\.jsonb_build_object\(\s*'legacy_source_marker', true/,
  );
});

test("Starfishing claim delegates Favor accounting without weakening its snapshot contract", () => {
  const claimFunction = getSqlFunction(
    "public.claim_starfishing_catch(",
    "revoke execute on function public.perform_portal_favor_action",
  );

  assert.match(claimFunction, /private\.ensure_favor_account\(caller_id\)/);
  assert.match(
    claimFunction,
    /private\.post_favor_entry\(\s*caller_id,\s*favor_delta,\s*'starfishing_catch',\s*claim_catch_id,\s*requested_idempotency_key/,
  );
  assert.doesNotMatch(claimFunction, /insert into public\.currency_ledger/);
  assert.doesNotMatch(claimFunction, /update public\.currency_accounts/);
  assert.match(
    claimFunction,
    /'favor', pg_catalog\.jsonb_build_object\(\s*'delta', favor_delta,\s*'balance', favor_balance\s*\)/,
  );
  assert.match(
    claimFunction,
    /from public\.game_catches as catch_row\s+where catch_row\.user_id = caller_id\s+and catch_row\.idempotency_key = requested_idempotency_key/,
  );
  assert.match(claimFunction, /pg_catalog\.jsonb_set\(\s*existing_result_snapshot,\s*'\{replayed\}'/);
});
