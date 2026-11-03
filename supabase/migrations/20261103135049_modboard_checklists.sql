create schema if not exists modboard_private;
revoke all on schema modboard_private from public, anon, authenticated;

create table modboard_private.tasks (
  id text primary key, board text not null check (board in ('crew','veri')),
  phase text not null, label text not null, detail text not null, position integer not null
);
create table modboard_private.progress (
  stream_date date not null, task_id text not null references modboard_private.tasks,
  done boolean not null, actor uuid not null, actor_label text not null,
  changed_at timestamptz not null default now(), primary key (stream_date, task_id)
);
-- Realtime only publishes invalidations. Authorized clients re-read their own snapshot.
create table public.modboard_updates (stream_date date primary key, revision bigint not null);
alter table public.modboard_updates enable row level security;
revoke all on public.modboard_updates from public, anon, authenticated;
grant select on public.modboard_updates to authenticated;
create function modboard_private.staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','lead_mod','mod'))
$$;
revoke all on function modboard_private.staff() from public, anon;
grant execute on function modboard_private.staff() to authenticated;
create policy staff_read_modboard_updates on public.modboard_updates for select to authenticated using ((select modboard_private.staff()));
alter publication supabase_realtime add table public.modboard_updates;

create table modboard_private.board_owner (singleton boolean primary key check (singleton), user_id uuid not null unique);
-- Provision the single owner and private task catalog out of band.
create function modboard_private.is_veri() returns boolean language sql stable set search_path = '' as $$
  select exists(select 1 from modboard_private.board_owner where user_id=auth.uid())
$$;

create function public.modboard_snapshot(stream_day date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not modboard_private.staff() then raise insufficient_privilege using message='Staff access required'; end if;
  if stream_day is null or not isfinite(stream_day) then raise invalid_parameter_value using message='Choose a stream date'; end if;
  return (with tasks as (
    select t.*, coalesce(p.done,false) as done, p.actor_label, p.changed_at
    from modboard_private.tasks t left join modboard_private.progress p on p.task_id=t.id and p.stream_date=stream_day
  ) select jsonb_build_object(
    'tasks', (select jsonb_agg(to_jsonb(t) order by position) from tasks t where board='crew' or modboard_private.is_veri()),
    'reflection', (select jsonb_build_object('complete',count(*) filter(where done),'total',count(*),
        'nextPhase',(array_agg(phase order by position) filter(where not done))[1]) from tasks where board='veri')
  ));
end $$;
create function public.modboard_set_task(stream_day date, item text, checked boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare display_label text;
begin
  if not modboard_private.staff() then raise insufficient_privilege using message='Staff access required'; end if;
  if stream_day is null or not isfinite(stream_day) or checked is null then raise invalid_parameter_value using message='Invalid checklist change'; end if;
  if not exists(select 1 from modboard_private.tasks where id=item and (board='crew' or modboard_private.is_veri())) then
    raise insufficient_privilege using message='Task unavailable';
  end if;
  select coalesce(nullif(btrim(display_name),''),'Staff') into display_label from public.profiles where id=auth.uid();
  insert into modboard_private.progress as p(stream_date,task_id,done,actor,actor_label)
  values(stream_day,item,checked,auth.uid(),display_label)
  on conflict(stream_date,task_id) do update set done=excluded.done,actor=excluded.actor,actor_label=excluded.actor_label,changed_at=now()
  where p.done is distinct from excluded.done;
  if found then
    insert into public.modboard_updates as u values(stream_day,1)
    on conflict(stream_date) do update set revision=u.revision+1;
  end if;
end $$;
revoke all on function public.modboard_snapshot(date), public.modboard_set_task(date,text,boolean) from public, anon;
grant execute on function public.modboard_snapshot(date), public.modboard_set_task(date,text,boolean) to authenticated;

insert into modboard_private.tasks values
('mod-goals','crew','Overlays','Reset sub and bit goals','Reset tonight’s sub and bit counters, then check their targets and the follower goal in the overlay.',0),
('mod-ticker','crew','Overlays','Update / Check News Ticker','Remove expired copy and confirm tonight’s approved news is displaying.',1),
('mod-category','crew','Pre-stream','Ensure Category / Game Is Set','Verify the Twitch category matches what Veri is actually doing.',2),
('mod-copy','crew','Pre-stream','Generate Titles / Go-Lives','Prepare options in TitleScuff and Launch Lab; get approval before posting.',3),
('mod-boop','crew','Live','Boop Veri (when asked)','Only when Veri asks: test MIU → VTS connectivity and confirm the model reacts.',4),
('mod-title','crew','Pre-stream','Check the stream title','Compare the live Twitch title with tonight’s approved title and update it if needed.',5),
('mod-shake','crew','Live','Make sure Veri shakes','Test the shake redeem with Veri and confirm the model moves on stream.',6),
('mod-collab','crew','Pre-stream','Check !collab','Check tonight’s lineup. Update the command and test its reply if the collaborators changed.',7),
('mod-promos','crew','Pre-stream','Confirm tonight’s promotions','Check which promos are scheduled before running them: !bts, !foxfam, !emotefix, !merch, or another approved command.',8),
('mod-medcheck','crew','Live','Med Checks','Use the agreed private check-in. This checkbox records the check only, not medication details or a confirmed dose.',9);
