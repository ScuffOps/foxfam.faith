create table if not exists public.birthday_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  created_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists birthday_messages_data_gin on public.birthday_messages using gin (data);
create index if not exists birthday_messages_user_id_idx on public.birthday_messages (user_id);
create index if not exists birthday_messages_recipient_idx on public.birthday_messages ((data ->> 'recipient_user_id'));

alter table public.birthday_messages enable row level security;
alter table public.birthday_messages force row level security;

revoke all on public.birthday_messages from anon, authenticated;
grant select, insert on public.birthday_messages to anon, authenticated;
grant delete on public.birthday_messages to authenticated;

drop trigger if exists birthday_messages_touch_updated_at on public.birthday_messages;
create trigger birthday_messages_touch_updated_at
before update on public.birthday_messages
for each row execute function private.touch_updated_at();

drop policy if exists "Birthday wishes are readable" on public.birthday_messages;
create policy "Birthday wishes are readable"
on public.birthday_messages for select
to anon, authenticated
using (
  coalesce((data ->> 'is_visible')::boolean, true)
  or data ->> 'recipient_user_id' = (select auth.uid())::text
  or private.is_staff()
);

drop policy if exists "Anyone can leave a birthday wish" on public.birthday_messages;
create policy "Anyone can leave a birthday wish"
on public.birthday_messages for insert
to anon, authenticated
with check (
  jsonb_typeof(data) = 'object'
  and length(btrim(coalesce(data ->> 'message', ''))) between 1 and 355
  and length(btrim(coalesce(data ->> 'birthday_id', ''))) > 0
);

drop policy if exists "Authors recipients or staff delete birthday wishes" on public.birthday_messages;
create policy "Authors recipients or staff delete birthday wishes"
on public.birthday_messages for delete
to authenticated
using (
  user_id = (select auth.uid())
  or data ->> 'recipient_user_id' = (select auth.uid())::text
  or private.is_staff()
);

create or replace function public.set_birthday_message_visibility(
  target_message_id uuid,
  visible boolean
)
returns public.birthday_messages
language plpgsql
security definer
set search_path = public, private
as $$
declare
  target public.birthday_messages;
begin
  select * into target from public.birthday_messages where id = target_message_id;
  if target.id is null then
    raise exception 'Birthday message not found';
  end if;
  if target.data ->> 'recipient_user_id' is distinct from (select auth.uid())::text and not private.is_staff() then
    raise exception 'Only the recipient or staff can change birthday wish visibility';
  end if;

  update public.birthday_messages
  set data = jsonb_set(data, '{is_visible}', to_jsonb(visible), true)
  where id = target_message_id
  returning * into target;
  return target;
end;
$$;

revoke all on function public.set_birthday_message_visibility(uuid, boolean) from public;
revoke execute on function public.set_birthday_message_visibility(uuid, boolean) from anon;
grant execute on function public.set_birthday_message_visibility(uuid, boolean) to authenticated;
