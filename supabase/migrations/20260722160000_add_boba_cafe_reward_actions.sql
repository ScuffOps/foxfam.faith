begin;

insert into public.game_reward_games (
  game_key,
  rules_version,
  enabled,
  session_ttl_seconds,
  daily_favor_cap,
  daily_claim_cap
)
values ('boba-cafe', 1, false, 1800, 90, 3)
on conflict (game_key) do update
set rules_version = excluded.rules_version,
    session_ttl_seconds = excluded.session_ttl_seconds,
    daily_favor_cap = excluded.daily_favor_cap,
    daily_claim_cap = excluded.daily_claim_cap,
    enabled = false,
    updated_at = pg_catalog.clock_timestamp();

insert into public.achievement_catalog (
  achievement_key,
  title,
  description,
  condition,
  reward,
  active
)
values
  (
    'boba-cafe-first-service',
    'First Service',
    'Complete a server-validated Boba Cafe shift.',
    '{"game_key":"boba-cafe","minimum_orders":8}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    'boba-cafe-perfect-pour',
    'Perfect Pour',
    'Serve three perfect drinks in one rewarded shift.',
    '{"game_key":"boba-cafe","minimum_perfect_orders":3}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    'boba-cafe-rush-hour-combo',
    'Rush Hour Ribbon',
    'Build a four-drink perfect combo in one rewarded shift.',
    '{"game_key":"boba-cafe","minimum_combo":4}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    'boba-cafe-spotless-shift',
    'Spotless Shift',
    'Complete all eight orders without a mistake.',
    '{"game_key":"boba-cafe","orders":8,"maximum_mistakes":0}'::jsonb,
    '{}'::jsonb,
    true
  )
on conflict (achievement_key) do update
set title = excluded.title,
    description = excluded.description,
    condition = excluded.condition,
    reward = excluded.reward,
    active = excluded.active;

create or replace function private.boba_cafe_empty_tray()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select '{"tea":null,"milk":null,"topping":null,"charm":null,"sweetness":null}'::jsonb;
$$;

create or replace function private.boba_cafe_order(
  shift_seed uuid,
  requested_order_index integer,
  order_placed_at timestamptz
)
returns jsonb
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  recipe_roll integer;
  customer_roll integer;
  patience_ms integer;
  order_key text;
  order_label text;
  customer jsonb;
  recipe jsonb;
begin
  if requested_order_index not between 0 and 7 then
    raise exception using errcode = '22023', message = 'Boba order index is out of range';
  end if;

  recipe_roll := private.game_reward_stable_roll(
    shift_seed,
    'boba:order:' || requested_order_index::text,
    6
  );
  customer_roll := private.game_reward_stable_roll(
    shift_seed,
    'boba:customer:' || requested_order_index::text,
    5
  );
  patience_ms := greatest(18000, 32000 - requested_order_index * 1200);

  case recipe_roll
    when 0 then
      order_key := 'lantern-latte';
      order_label := 'Lantern Latte';
      recipe := '{"tea":"black-tea","milk":"cream-cloud","topping":"brown-sugar-pearls","charm":"lantern-pick","sweetness":"glow"}'::jsonb;
    when 1 then
      order_key := 'shrine-matcha';
      order_label := 'Shrine Matcha';
      recipe := '{"tea":"matcha-tea","milk":"oat-milk","topping":"star-jelly","charm":"moon-straw","sweetness":"soft"}'::jsonb;
    when 2 then
      order_key := 'taro-ribbon';
      order_label := 'Taro Ribbon';
      recipe := '{"tea":"taro-tea","milk":"strawberry-milk","topping":"crystal-boba","charm":"ribbon-seal","sweetness":"festival"}'::jsonb;
    when 3 then
      order_key := 'garden-jasmine';
      order_label := 'Garden Jasmine';
      recipe := '{"tea":"jasmine-tea","milk":"oat-milk","topping":"pudding-cubes","charm":"fox-lid","sweetness":"glow"}'::jsonb;
    when 4 then
      order_key := 'cocoa-comet';
      order_label := 'Cocoa Comet';
      recipe := '{"tea":"black-tea","milk":"cocoa-milk","topping":"crystal-boba","charm":"moon-straw","sweetness":"festival"}'::jsonb;
    else
      order_key := 'soft-starlight';
      order_label := 'Soft Starlight';
      recipe := '{"tea":"jasmine-tea","milk":"cream-cloud","topping":"star-jelly","charm":"ribbon-seal","sweetness":"soft"}'::jsonb;
  end case;

  customer := case customer_roll
    when 0 then '{"key":"choir-helper","label":"Choir Helper","palette":["#f9a8d4","#7dd3fc"]}'::jsonb
    when 1 then '{"key":"library-visitor","label":"Library Visitor","palette":["#c4b5fd","#fef3c7"]}'::jsonb
    when 2 then '{"key":"courtyard-runner","label":"Courtyard Runner","palette":["#86efac","#fecaca"]}'::jsonb
    when 3 then '{"key":"relic-polisher","label":"Relic Polisher","palette":["#fde68a","#a7f3d0"]}'::jsonb
    else '{"key":"vesper-guest","label":"Vesper Guest","palette":["#93c5fd","#f0abfc"]}'::jsonb
  end;

  return pg_catalog.jsonb_build_object(
    'order_key', order_key,
    'order_label', order_label,
    'customer', customer,
    'recipe', recipe,
    'placed_at', order_placed_at,
    'deadline_at', order_placed_at + pg_catalog.make_interval(secs => patience_ms::double precision / 1000),
    'patience_ms', patience_ms
  );
end;
$$;

create or replace function private.boba_cafe_initial_state(
  shift_seed uuid,
  shift_started_at timestamptz
)
returns jsonb
language sql
immutable
strict
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'phase', 'serving',
    'order_index', 0,
    'active_order', private.boba_cafe_order(shift_seed, 0, shift_started_at),
    'tray', private.boba_cafe_empty_tray(),
    'score', 0,
    'served_count', 0,
    'perfect_count', 0,
    'combo', 0,
    'best_combo', 0,
    'mistakes', 0,
    'last_result', null,
    'action_index', 0,
    'completed_at', null
  );
$$;

create or replace function private.start_boba_cafe_reward_session(
  caller_id uuid,
  game_config public.game_reward_games,
  session_started_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.game_reward_sessions%rowtype;
  session_seed uuid := gen_random_uuid();
  initial_state jsonb;
begin
  select session.*
  into session_row
  from public.game_reward_sessions as session
  where session.user_id = caller_id
    and session.game_key = game_config.game_key
    and session.rules_version = game_config.rules_version
    and session.claimed_event_id is null
    and session.expires_at > session_started_at
  order by session.started_at desc
  limit 1
  for update;

  if session_row.id is not null then
    return pg_catalog.jsonb_build_object(
      'session_id', session_row.id,
      'game_key', session_row.game_key,
      'rules_version', session_row.rules_version,
      'seed', session_row.seed,
      'context', session_row.canonical_context,
      'started_at', session_row.started_at,
      'expires_at', session_row.expires_at
    );
  end if;

  initial_state := private.boba_cafe_initial_state(session_seed, session_started_at);

  insert into public.game_reward_sessions (
    user_id,
    game_key,
    rules_version,
    seed,
    puzzle_date,
    canonical_context,
    started_at,
    expires_at
  )
  values (
    caller_id,
    game_config.game_key,
    game_config.rules_version,
    session_seed,
    null,
    initial_state,
    session_started_at,
    session_started_at + pg_catalog.make_interval(secs => game_config.session_ttl_seconds)
  )
  returning * into session_row;

  return pg_catalog.jsonb_build_object(
    'session_id', session_row.id,
    'game_key', session_row.game_key,
    'rules_version', session_row.rules_version,
    'seed', session_row.seed,
    'context', initial_state,
    'started_at', session_row.started_at,
    'expires_at', session_row.expires_at
  );
end;
$$;

do $$
begin
  if pg_catalog.to_regprocedure('private.progress_match_merge_reward_session_internal(uuid,uuid,jsonb)') is null then
    alter function public.progress_game_reward_session(uuid, uuid, jsonb)
      rename to progress_match_merge_reward_session_internal;
    alter function public.progress_match_merge_reward_session_internal(uuid, uuid, jsonb)
      set schema private;
  end if;
end;
$$;

revoke all on function private.progress_match_merge_reward_session_internal(uuid, uuid, jsonb)
from public, anon, authenticated;

create or replace function private.progress_boba_cafe_reward_session(
  caller_id uuid,
  progress_session_id uuid,
  progress_idempotency_key uuid,
  progress_action jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_action public.game_reward_actions%rowtype;
  reward_session public.game_reward_sessions%rowtype;
  game_config public.game_reward_games%rowtype;
  action_created_at timestamptz := pg_catalog.clock_timestamp();
  action_key_count integer;
  action_index integer;
  action_op text;
  station_key text;
  choice_key text;
  phase_key text;
  order_index integer;
  served_count integer;
  perfect_count integer;
  combo_count integer;
  best_combo integer;
  mistake_count integer;
  score_total integer;
  score_delta integer := 0;
  patience_ms integer;
  patience_percent integer;
  patience_bonus integer;
  match_count integer;
  next_combo integer;
  elapsed_ms numeric;
  active_order jsonb;
  tray jsonb;
  recipe jsonb;
  matches jsonb;
  misses jsonb;
  result_message text;
  next_context jsonb;
  result_snapshot jsonb;
begin
  select action.*
  into existing_action
  from public.game_reward_actions as action
  where action.user_id = caller_id
    and action.idempotency_key = progress_idempotency_key;

  if existing_action.id is not null then
    if existing_action.session_id <> progress_session_id
      or existing_action.action <> progress_action then
      raise exception using errcode = '23505', message = 'Action idempotency key is already used';
    end if;
    return pg_catalog.jsonb_set(existing_action.result_snapshot, '{replayed}', 'true'::jsonb, true);
  end if;

  select session.*
  into reward_session
  from public.game_reward_sessions as session
  where session.id = progress_session_id
    and session.user_id = caller_id
  for update;

  if reward_session.id is null then
    raise exception using errcode = '42501', message = 'Reward session not found for this user';
  end if;
  if reward_session.claimed_event_id is not null then
    raise exception using errcode = '55000', message = 'Reward session has already been claimed';
  end if;
  if reward_session.expires_at <= action_created_at then
    raise exception using errcode = '55000', message = 'Reward session has expired';
  end if;

  select game.*
  into game_config
  from public.game_reward_games as game
  where game.game_key = reward_session.game_key
    and game.rules_version = reward_session.rules_version;

  if game_config.game_key is null or not game_config.enabled then
    raise exception using errcode = '55000', message = 'Game rewards are disabled';
  end if;
  if reward_session.game_key <> 'boba-cafe' then
    raise exception using errcode = '55000', message = 'Boba Cafe action used with another game';
  end if;

  action_index := coalesce((reward_session.canonical_context ->> 'action_index')::integer, 0) + 1;
  if action_index > 96 then
    raise exception using errcode = '54000', message = 'Boba Cafe action limit reached';
  end if;

  select pg_catalog.count(*)::integer
  into action_key_count
  from pg_catalog.jsonb_object_keys(progress_action);

  action_op := progress_action ->> 'op';
  phase_key := reward_session.canonical_context ->> 'phase';
  order_index := (reward_session.canonical_context ->> 'order_index')::integer;
  served_count := (reward_session.canonical_context ->> 'served_count')::integer;
  perfect_count := (reward_session.canonical_context ->> 'perfect_count')::integer;
  combo_count := (reward_session.canonical_context ->> 'combo')::integer;
  best_combo := (reward_session.canonical_context ->> 'best_combo')::integer;
  mistake_count := (reward_session.canonical_context ->> 'mistakes')::integer;
  score_total := (reward_session.canonical_context ->> 'score')::integer;
  active_order := reward_session.canonical_context -> 'active_order';
  tray := reward_session.canonical_context -> 'tray';
  next_context := reward_session.canonical_context;

  if action_op = 'select' then
    if action_key_count <> 3
      or pg_catalog.jsonb_typeof(progress_action -> 'station') <> 'string'
      or pg_catalog.jsonb_typeof(progress_action -> 'choice') <> 'string' then
      raise exception using errcode = '22023', message = 'Boba select accepts op, station, and choice only';
    end if;
    if phase_key <> 'serving' then
      raise exception using errcode = '55000', message = 'Boba ingredients can only be selected while serving';
    end if;
    if action_created_at >= (active_order ->> 'deadline_at')::timestamptz then
      raise exception using errcode = '55000', message = 'Order expired; settle it before continuing';
    end if;

    station_key := progress_action ->> 'station';
    choice_key := progress_action ->> 'choice';
    if not (
      (station_key = 'tea' and choice_key in ('jasmine-tea', 'black-tea', 'taro-tea', 'matcha-tea'))
      or (station_key = 'milk' and choice_key in ('oat-milk', 'cream-cloud', 'strawberry-milk', 'cocoa-milk'))
      or (station_key = 'topping' and choice_key in ('brown-sugar-pearls', 'star-jelly', 'pudding-cubes', 'crystal-boba'))
      or (station_key = 'charm' and choice_key in ('fox-lid', 'moon-straw', 'ribbon-seal', 'lantern-pick'))
      or (station_key = 'sweetness' and choice_key in ('soft', 'glow', 'festival'))
    ) then
      raise exception using errcode = '22023', message = 'Boba station choice is not allowed';
    end if;

    tray := pg_catalog.jsonb_set(tray, array[station_key], pg_catalog.to_jsonb(choice_key), true);
    next_context := pg_catalog.jsonb_set(next_context, '{tray}', tray, true);

  elsif action_op = 'clear' then
    if action_key_count <> 1 then
      raise exception using errcode = '22023', message = 'Boba clear accepts op only';
    end if;
    if phase_key <> 'serving' then
      raise exception using errcode = '55000', message = 'The tray can only be cleared while serving';
    end if;
    if action_created_at >= (active_order ->> 'deadline_at')::timestamptz then
      raise exception using errcode = '55000', message = 'Order expired; settle it before continuing';
    end if;
    next_context := pg_catalog.jsonb_set(next_context, '{tray}', private.boba_cafe_empty_tray(), true);

  elsif action_op in ('serve', 'settle') then
    if action_key_count <> 1 then
      raise exception using errcode = '22023', message = 'Boba serve and settle accept op only';
    end if;
    if phase_key <> 'serving' or pg_catalog.jsonb_typeof(active_order) <> 'object' then
      raise exception using errcode = '55000', message = 'No Boba order is ready to settle';
    end if;

    if action_op = 'settle' then
      if action_created_at < (active_order ->> 'deadline_at')::timestamptz then
        raise exception using errcode = '55000', message = 'Only expired Boba orders can be settled';
      end if;
      match_count := 0;
      matches := '[]'::jsonb;
      misses := '["tea","milk","topping","charm","sweetness"]'::jsonb;
      patience_percent := 0;
      result_message := 'The cup got too quiet on the counter.';
    else
      if action_created_at >= (active_order ->> 'deadline_at')::timestamptz then
        raise exception using errcode = '55000', message = 'Order expired; settle it before continuing';
      end if;
      if pg_catalog.jsonb_typeof(tray) <> 'object'
        or pg_catalog.jsonb_typeof(tray -> 'tea') <> 'string'
        or pg_catalog.jsonb_typeof(tray -> 'milk') <> 'string'
        or pg_catalog.jsonb_typeof(tray -> 'topping') <> 'string'
        or pg_catalog.jsonb_typeof(tray -> 'charm') <> 'string'
        or pg_catalog.jsonb_typeof(tray -> 'sweetness') <> 'string' then
        raise exception using errcode = '55000', message = 'Complete every Boba station before serving';
      end if;

      recipe := active_order -> 'recipe';
      select
        pg_catalog.count(*) filter (where tray ->> field.key = recipe ->> field.key)::integer,
        coalesce(
          pg_catalog.jsonb_agg(field.key order by field.ordinal)
            filter (where tray ->> field.key = recipe ->> field.key),
          '[]'::jsonb
        ),
        coalesce(
          pg_catalog.jsonb_agg(field.key order by field.ordinal)
            filter (where tray ->> field.key <> recipe ->> field.key),
          '[]'::jsonb
        )
      into match_count, matches, misses
      from (values
        ('tea', 1),
        ('milk', 2),
        ('topping', 3),
        ('charm', 4),
        ('sweetness', 5)
      ) as field(key, ordinal);

      patience_ms := (active_order ->> 'patience_ms')::integer;
      elapsed_ms := greatest(
        0,
        extract(epoch from (action_created_at - (active_order ->> 'placed_at')::timestamptz)) * 1000
      );
      patience_percent := greatest(
        0,
        pg_catalog.round(100 - (elapsed_ms / patience_ms::numeric) * 100)::integer
      );
      patience_bonus := pg_catalog.round(
        120 * greatest(0.35::numeric, patience_percent::numeric / 100)
      )::integer;
      score_delta := match_count * 80 + patience_bonus + case when match_count = 5 then 90 else 0 end;
      result_message := case
        when match_count = 5 then 'Perfect pour. The whole cafe noticed.'
        when match_count >= 3 then 'Close enough to keep the line smiling.'
        else 'A brave little remix, but not the ticket.'
      end;
    end if;

    next_combo := case when action_op = 'serve' and match_count = 5 then combo_count + 1 else 0 end;
    score_total := score_total + score_delta;
    served_count := served_count + 1;
    perfect_count := perfect_count + case when action_op = 'serve' and match_count = 5 then 1 else 0 end;
    best_combo := greatest(best_combo, next_combo);
    mistake_count := mistake_count + case when action_op = 'serve' and match_count = 5 then 0 else 1 end;

    next_context := pg_catalog.jsonb_set(next_context, '{phase}', '"result"'::jsonb, true);
    next_context := pg_catalog.jsonb_set(next_context, '{score}', pg_catalog.to_jsonb(score_total), true);
    next_context := pg_catalog.jsonb_set(next_context, '{served_count}', pg_catalog.to_jsonb(served_count), true);
    next_context := pg_catalog.jsonb_set(next_context, '{perfect_count}', pg_catalog.to_jsonb(perfect_count), true);
    next_context := pg_catalog.jsonb_set(next_context, '{combo}', pg_catalog.to_jsonb(next_combo), true);
    next_context := pg_catalog.jsonb_set(next_context, '{best_combo}', pg_catalog.to_jsonb(best_combo), true);
    next_context := pg_catalog.jsonb_set(next_context, '{mistakes}', pg_catalog.to_jsonb(mistake_count), true);
    next_context := pg_catalog.jsonb_set(
      next_context,
      '{last_result}',
      pg_catalog.jsonb_build_object(
        'score', score_delta,
        'matches', matches,
        'misses', misses,
        'perfect', action_op = 'serve' and match_count = 5,
        'timed_out', action_op = 'settle',
        'patience_percent', patience_percent,
        'message', result_message
      ),
      true
    );

  elsif action_op = 'next' then
    if action_key_count <> 1 then
      raise exception using errcode = '22023', message = 'Boba next accepts op only';
    end if;
    if phase_key <> 'result' then
      raise exception using errcode = '55000', message = 'Finish the current Boba order before advancing';
    end if;
    if served_count <> order_index + 1 or served_count not between 1 and 8 then
      raise exception using errcode = '55000', message = 'Canonical Boba order progress is invalid';
    end if;

    if served_count = 8 then
      next_context := pg_catalog.jsonb_set(next_context, '{phase}', '"shiftComplete"'::jsonb, true);
      next_context := pg_catalog.jsonb_set(next_context, '{order_index}', '8'::jsonb, true);
      next_context := pg_catalog.jsonb_set(next_context, '{active_order}', 'null'::jsonb, true);
      next_context := pg_catalog.jsonb_set(next_context, '{tray}', private.boba_cafe_empty_tray(), true);
      next_context := pg_catalog.jsonb_set(next_context, '{completed_at}', pg_catalog.to_jsonb(action_created_at), true);
    else
      order_index := order_index + 1;
      next_context := pg_catalog.jsonb_set(next_context, '{phase}', '"serving"'::jsonb, true);
      next_context := pg_catalog.jsonb_set(next_context, '{order_index}', pg_catalog.to_jsonb(order_index), true);
      next_context := pg_catalog.jsonb_set(
        next_context,
        '{active_order}',
        private.boba_cafe_order(reward_session.seed, order_index, action_created_at),
        true
      );
      next_context := pg_catalog.jsonb_set(next_context, '{tray}', private.boba_cafe_empty_tray(), true);
      next_context := pg_catalog.jsonb_set(next_context, '{last_result}', 'null'::jsonb, true);
    end if;

  else
    raise exception using errcode = '22023', message = 'Unsupported Boba Cafe action';
  end if;

  next_context := pg_catalog.jsonb_set(
    next_context,
    '{action_index}',
    pg_catalog.to_jsonb(action_index),
    true
  );

  update public.game_reward_sessions
  set canonical_context = next_context
  where id = reward_session.id;

  result_snapshot := pg_catalog.jsonb_build_object(
    'session_id', reward_session.id,
    'game_key', reward_session.game_key,
    'action_index', action_index,
    'state', next_context,
    'replayed', false
  );

  insert into public.game_reward_actions (
    session_id,
    user_id,
    game_key,
    action_index,
    idempotency_key,
    action,
    result_snapshot,
    created_at
  )
  values (
    reward_session.id,
    caller_id,
    reward_session.game_key,
    action_index,
    progress_idempotency_key,
    progress_action,
    result_snapshot,
    action_created_at
  );

  return result_snapshot;
end;
$$;

create or replace function private.claim_boba_cafe_reward(
  caller_id uuid,
  claim_session_id uuid,
  claim_idempotency_key uuid,
  claim_evidence jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_event public.game_reward_events%rowtype;
  claim_session public.game_reward_sessions%rowtype;
  game_config public.game_reward_games%rowtype;
  claim_created_at timestamptz := pg_catalog.clock_timestamp();
  reward_event_id uuid := gen_random_uuid();
  score_total integer;
  served_count integer;
  perfect_count integer;
  best_combo integer;
  mistake_count integer;
  requested_favor integer;
  favor_awarded integer;
  favor_balance bigint;
  cap_earned integer;
  cap_remaining integer;
  favor_result jsonb;
  material_results jsonb := '[]'::jsonb;
  material_result jsonb;
  achievement_results jsonb := '[]'::jsonb;
  claim_result_snapshot jsonb;
begin
  if claim_evidence <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'Boba Cafe claims accept no client-authored result fields';
  end if;

  select event.*
  into existing_event
  from public.game_reward_events as event
  where event.user_id = caller_id
    and event.idempotency_key = claim_idempotency_key;

  if existing_event.id is not null then
    if existing_event.session_id <> claim_session_id
      or existing_event.evidence_hash <> pg_catalog.md5(claim_evidence::text) then
      raise exception using errcode = '23505', message = 'Reward idempotency key is already used';
    end if;
    return pg_catalog.jsonb_set(existing_event.result_snapshot, '{replayed}', 'true'::jsonb, true);
  end if;

  select session.*
  into claim_session
  from public.game_reward_sessions as session
  where session.id = claim_session_id
    and session.user_id = caller_id
  for update;

  if claim_session.id is null then
    raise exception using errcode = '42501', message = 'Reward session not found for this user';
  end if;
  if claim_session.claimed_event_id is not null then
    raise exception using errcode = '55000', message = 'Reward session has already been claimed';
  end if;
  if claim_session.expires_at <= claim_created_at then
    raise exception using errcode = '55000', message = 'Reward session has expired';
  end if;

  select game.*
  into game_config
  from public.game_reward_games as game
  where game.game_key = claim_session.game_key
    and game.rules_version = claim_session.rules_version;

  if game_config.game_key is null or not game_config.enabled then
    raise exception using errcode = '55000', message = 'Game rewards are disabled';
  end if;

  score_total := (claim_session.canonical_context ->> 'score')::integer;
  served_count := (claim_session.canonical_context ->> 'served_count')::integer;
  perfect_count := (claim_session.canonical_context ->> 'perfect_count')::integer;
  best_combo := (claim_session.canonical_context ->> 'best_combo')::integer;
  mistake_count := (claim_session.canonical_context ->> 'mistakes')::integer;

  if claim_session.canonical_context ->> 'phase' <> 'shiftComplete'
    or (claim_session.canonical_context ->> 'order_index')::integer <> 8
    or served_count <> 8
    or claim_session.canonical_context ->> 'completed_at' is null then
    raise exception using errcode = '55000', message = 'Complete all eight Boba Cafe orders before claiming';
  end if;

  requested_favor := greatest(1, score_total / 140);

  insert into public.game_reward_cap_buckets (user_id, game_key, bucket_date, favor_earned, updated_at)
  values (caller_id, claim_session.game_key, (claim_created_at at time zone 'UTC')::date, 0, claim_created_at)
  on conflict (user_id, game_key, bucket_date) do nothing;

  select bucket.favor_earned
  into cap_earned
  from public.game_reward_cap_buckets as bucket
  where bucket.user_id = caller_id
    and bucket.game_key = claim_session.game_key
    and bucket.bucket_date = (claim_created_at at time zone 'UTC')::date
  for update;

  favor_awarded := least(
    requested_favor,
    greatest(0, game_config.daily_favor_cap - cap_earned)
  );
  cap_remaining := greatest(0, game_config.daily_favor_cap - cap_earned - favor_awarded);

  if favor_awarded > 0 then
    favor_result := private.post_favor_entry(
      caller_id,
      favor_awarded,
      'game_reward',
      reward_event_id,
      private.game_reward_scoped_uuid(claim_idempotency_key, 'favor'),
      pg_catalog.jsonb_build_object(
        'game_key', claim_session.game_key,
        'session_id', claim_session.id,
        'rules_version', claim_session.rules_version
      )
    );
    favor_balance := (favor_result -> 'favor' ->> 'balance')::bigint;

    update public.game_reward_cap_buckets
    set favor_earned = favor_earned + favor_awarded,
        updated_at = claim_created_at
    where user_id = caller_id
      and game_key = claim_session.game_key
      and bucket_date = (claim_created_at at time zone 'UTC')::date;
  else
    favor_balance := private.ensure_favor_account(caller_id);
  end if;

  material_result := private.post_game_reward_material(
    caller_id,
    'sugar-pearls',
    least(64, greatest(1, score_total / 80)),
    reward_event_id,
    private.game_reward_scoped_uuid(claim_idempotency_key, 'material:sugar-pearls'),
    pg_catalog.jsonb_build_object('game_key', claim_session.game_key, 'session_id', claim_session.id)
  );
  material_results := material_results || pg_catalog.jsonb_build_array(material_result - 'replayed');

  if perfect_count >= 3 then
    material_result := private.post_game_reward_material(
      caller_id,
      'cream-cloud',
      least(2, perfect_count / 3),
      reward_event_id,
      private.game_reward_scoped_uuid(claim_idempotency_key, 'material:cream-cloud'),
      pg_catalog.jsonb_build_object('game_key', claim_session.game_key, 'session_id', claim_session.id)
    );
    material_results := material_results || pg_catalog.jsonb_build_array(material_result - 'replayed');
  end if;

  with inserted_achievements as (
    insert into public.user_achievements (
      user_id,
      achievement_key,
      source_reward_event_id,
      unlocked_at
    )
    select caller_id, achievement.achievement_key, reward_event_id, claim_created_at
    from public.achievement_catalog as achievement
    where achievement.active
      and (
        achievement.achievement_key = 'boba-cafe-first-service'
        or (achievement.achievement_key = 'boba-cafe-perfect-pour' and perfect_count >= 3)
        or (achievement.achievement_key = 'boba-cafe-rush-hour-combo' and best_combo >= 4)
        or (
          achievement.achievement_key = 'boba-cafe-spotless-shift'
          and served_count = 8
          and mistake_count = 0
        )
      )
    on conflict (user_id, achievement_key) do nothing
    returning achievement_key
  )
  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object('key', catalog.achievement_key, 'title', catalog.title)
      order by catalog.achievement_key
    ),
    '[]'::jsonb
  )
  into achievement_results
  from inserted_achievements as inserted
  join public.achievement_catalog as catalog
    on catalog.achievement_key = inserted.achievement_key;

  claim_result_snapshot := pg_catalog.jsonb_build_object(
    'reward_event_id', reward_event_id,
    'session_id', claim_session.id,
    'game_key', claim_session.game_key,
    'score', score_total,
    'favor', pg_catalog.jsonb_build_object(
      'delta', favor_awarded,
      'balance', favor_balance,
      'cap_remaining', cap_remaining
    ),
    'materials', material_results,
    'achievements', achievement_results,
    'replayed', false
  );

  insert into public.game_reward_events (
    id,
    session_id,
    user_id,
    game_key,
    rules_version,
    idempotency_key,
    evidence_hash,
    score,
    favor_awarded,
    result_snapshot,
    created_at
  )
  values (
    reward_event_id,
    claim_session.id,
    caller_id,
    claim_session.game_key,
    claim_session.rules_version,
    claim_idempotency_key,
    pg_catalog.md5(claim_evidence::text),
    score_total,
    favor_awarded,
    claim_result_snapshot,
    claim_created_at
  );

  update public.game_reward_sessions
  set claimed_event_id = reward_event_id
  where id = claim_session.id;

  return claim_result_snapshot;
end;
$$;

create or replace function public.start_game_reward_session(
  requested_game_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  game_config public.game_reward_games%rowtype;
  session_started_at timestamptz := pg_catalog.clock_timestamp();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if requested_game_key is null or requested_game_key !~ '^[a-z0-9-]+$' then
    raise exception using errcode = '22023', message = 'Invalid game key';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text || ':game-start:' || requested_game_key, 0)
  );

  if requested_game_key = 'word-garden' then
    return private.start_word_garden_reward_session_internal(requested_game_key);
  end if;

  select game.*
  into game_config
  from public.game_reward_games as game
  where game.game_key = requested_game_key;

  if game_config.game_key is null or not game_config.enabled then
    raise exception using errcode = '55000', message = 'Game rewards are not enabled for this game';
  end if;

  if requested_game_key = 'match-merge' then
    return private.start_match_merge_reward_session(caller_id, game_config, session_started_at);
  end if;
  if requested_game_key = 'boba-cafe' then
    return private.start_boba_cafe_reward_session(caller_id, game_config, session_started_at);
  end if;

  raise exception using errcode = '55000', message = 'No reward session is enabled for this game';
end;
$$;

create or replace function public.progress_game_reward_session(
  progress_session_id uuid,
  progress_idempotency_key uuid,
  progress_action jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  session_game_key text;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if progress_session_id is null
    or progress_idempotency_key is null
    or progress_action is null
    or pg_catalog.jsonb_typeof(progress_action) <> 'object' then
    raise exception using errcode = '22023', message = 'Invalid game reward action';
  end if;

  select session.game_key
  into session_game_key
  from public.game_reward_sessions as session
  where session.id = progress_session_id
    and session.user_id = caller_id;

  if session_game_key is null then
    raise exception using errcode = '42501', message = 'Reward session not found for this user';
  end if;

  if session_game_key = 'match-merge' then
    return private.progress_match_merge_reward_session_internal(
      progress_session_id,
      progress_idempotency_key,
      progress_action
    );
  end if;
  if session_game_key = 'boba-cafe' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(caller_id::text || ':game-action:' || progress_idempotency_key::text, 0)
    );
    return private.progress_boba_cafe_reward_session(
      caller_id,
      progress_session_id,
      progress_idempotency_key,
      progress_action
    );
  end if;

  raise exception using errcode = '55000', message = 'No action validator is enabled for this game';
end;
$$;

create or replace function public.claim_game_reward(
  claim_session_id uuid,
  claim_idempotency_key uuid,
  claim_evidence jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  existing_event public.game_reward_events%rowtype;
  game_config public.game_reward_games%rowtype;
  session_game_key text;
  claim_created_at timestamptz;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if claim_session_id is null
    or claim_idempotency_key is null
    or claim_evidence is null
    or pg_catalog.jsonb_typeof(claim_evidence) <> 'object' then
    raise exception using errcode = '22023', message = 'Invalid game reward claim';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text || ':game-claim:' || claim_idempotency_key::text, 0)
  );

  select event.*
  into existing_event
  from public.game_reward_events as event
  where event.user_id = caller_id
    and event.idempotency_key = claim_idempotency_key;

  if existing_event.id is not null then
    if existing_event.session_id <> claim_session_id
      or existing_event.evidence_hash <> pg_catalog.md5(claim_evidence::text) then
      raise exception using errcode = '23505', message = 'Reward idempotency key is already used';
    end if;
    return pg_catalog.jsonb_set(existing_event.result_snapshot, '{replayed}', 'true'::jsonb, true);
  end if;

  select game.*
  into game_config
  from public.game_reward_sessions as session
  join public.game_reward_games as game
    on game.game_key = session.game_key
   and game.rules_version = session.rules_version
  where session.id = claim_session_id
    and session.user_id = caller_id;

  session_game_key := game_config.game_key;
  if session_game_key is null then
    raise exception using errcode = '42501', message = 'Reward session not found for this user';
  end if;
  if not game_config.enabled then
    raise exception using errcode = '55000', message = 'Game rewards are disabled';
  end if;

  claim_created_at := pg_catalog.clock_timestamp();
  perform private.reserve_game_reward_claim(caller_id, game_config, claim_created_at);

  if session_game_key = 'word-garden' then
    return private.claim_word_garden_reward_internal(
      claim_session_id,
      claim_idempotency_key,
      claim_evidence
    );
  end if;
  if session_game_key = 'match-merge' then
    return private.claim_match_merge_reward(
      caller_id,
      claim_session_id,
      claim_idempotency_key,
      claim_evidence
    );
  end if;
  if session_game_key = 'boba-cafe' then
    return private.claim_boba_cafe_reward(
      caller_id,
      claim_session_id,
      claim_idempotency_key,
      claim_evidence
    );
  end if;

  raise exception using errcode = '55000', message = 'No reward validator is enabled for this game';
end;
$$;

revoke all on function private.boba_cafe_empty_tray() from public, anon, authenticated;
revoke all on function private.boba_cafe_order(uuid, integer, timestamptz) from public, anon, authenticated;
revoke all on function private.boba_cafe_initial_state(uuid, timestamptz) from public, anon, authenticated;
revoke all on function private.start_boba_cafe_reward_session(uuid, public.game_reward_games, timestamptz) from public, anon, authenticated;
revoke all on function private.progress_boba_cafe_reward_session(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.claim_boba_cafe_reward(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.start_game_reward_session(text) from public, anon, authenticated;
revoke all on function public.progress_game_reward_session(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.claim_game_reward(uuid, uuid, jsonb) from public, anon, authenticated;

commit;
