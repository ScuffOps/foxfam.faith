-- Cover game-progression foreign keys used by reward, collection, and provenance queries.
create index if not exists daily_word_puzzles_game_key_idx
  on public.daily_word_puzzles (game_key);

create index if not exists game_cast_tickets_fish_key_idx
  on public.game_cast_tickets (fish_key);

create index if not exists game_catches_fish_key_idx
  on public.game_catches (fish_key);

create index if not exists game_reward_actions_game_key_idx
  on public.game_reward_actions (game_key);

create index if not exists game_reward_actions_session_identity_idx
  on public.game_reward_actions (session_id, user_id, game_key);

create index if not exists game_reward_cap_buckets_game_key_idx
  on public.game_reward_cap_buckets (game_key);

create index if not exists game_reward_events_game_key_idx
  on public.game_reward_events (game_key);

create index if not exists game_reward_sessions_claimed_event_id_idx
  on public.game_reward_sessions (claimed_event_id);

create index if not exists game_reward_sessions_game_key_idx
  on public.game_reward_sessions (game_key);

create index if not exists game_reward_sessions_puzzle_date_game_key_idx
  on public.game_reward_sessions (puzzle_date, game_key);

create index if not exists user_achievements_achievement_key_idx
  on public.user_achievements (achievement_key);

create index if not exists user_achievements_source_catch_id_idx
  on public.user_achievements (source_catch_id);

create index if not exists user_achievements_source_reward_event_id_idx
  on public.user_achievements (source_reward_event_id);

create index if not exists user_fishpedia_fish_key_idx
  on public.user_fishpedia (fish_key);

create index if not exists user_trophies_source_achievement_key_idx
  on public.user_trophies (source_achievement_key);
